/**
 * XeonMusic — UploadPage (class UploadPage)
 * Upload lagu + thumbnail ke Google Drive via GAS
 * Developer: AlfandoXeon
 */
class UploadPage {
  constructor(app) {
    this.app = app;
    this.api = app.api;
    this.auth = app.auth;
    this.coverFile = null;
    this.audioFile = null;
  }

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  render(container) {
    // Guard: must be logged in
    if (!this.auth.isLoggedIn()) {
      container.innerHTML = `
        <div class="empty-state page-enter">
          <div class="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div class="empty-state-title">Login Diperlukan</div>
          <p class="empty-state-desc">Kamu harus login untuk mengupload musik ke XeonMusic.</p>
          <button class="btn btn--primary mt-md" id="upload-login-btn">Login Sekarang</button>
        </div>
      `;
      container.querySelector('#upload-login-btn')?.addEventListener('click', () => this.app.showAuth('login'));
      return;
    }

    container.innerHTML = `
      <div class="upload-wrapper page-enter">

        <div class="upload-header">
          <h1 class="h2">Upload Musik</h1>
          <p class="text-muted" style="margin-top:6px;font-size:0.9rem">
            Bagikan musikmu ke dunia. Format audio: MP3, WAV · Cover: JPG, PNG, WEBP
          </p>
        </div>

        <form id="upload-form" class="upload-form" novalidate>

          <!-- Cover + Fields grid -->
          <div class="upload-form-grid">

            <!-- Thumbnail -->
            <div>
              <label class="form-label" style="margin-bottom:8px;display:block">Thumbnail</label>
              <div class="cover-preview-wrap" id="cover-preview-wrap" title="Klik untuk pilih gambar cover">
                <input type="file" id="cover-input" accept="image/jpeg,image/png,image/webp" aria-label="Pilih thumbnail">
                <img class="cover-preview-img" id="cover-preview-img" alt="Preview thumbnail">
                <div class="cover-preview-placeholder" id="cover-placeholder">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                  <span>Pilih Cover</span>
                  <small style="opacity:0.6;margin-top:2px">JPG, PNG, WEBP</small>
                </div>
              </div>
            </div>

            <!-- Form fields -->
            <div class="upload-form-fields">
              <div class="form-group">
                <label class="form-label" for="upload-title">Judul Lagu *</label>
                <input type="text" id="upload-title" class="form-input" placeholder="Nama lagu..." required autocomplete="off">
              </div>
              <div class="form-group">
                <label class="form-label" for="upload-artist">Artis *</label>
                <input type="text" id="upload-artist" class="form-input" placeholder="Nama artis atau band..." required autocomplete="off">
              </div>
              <div class="form-group">
                <label class="form-label" for="upload-album">Album</label>
                <input type="text" id="upload-album" class="form-input" placeholder="Nama album (opsional)" autocomplete="off">
              </div>
              <div class="form-group">
                <label class="form-label" for="upload-genre">Genre</label>
                <select id="upload-genre" class="form-input">
                  <option value="">Pilih genre...</option>
                  <option value="Pop">Pop</option>
                  <option value="Rock">Rock</option>
                  <option value="Hip-Hop">Hip-Hop</option>
                  <option value="R&B">R&amp;B</option>
                  <option value="Jazz">Jazz</option>
                  <option value="Electronic">Electronic</option>
                  <option value="Classical">Classical</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Audio file drop zone -->
          <div class="form-group">
            <label class="form-label">File Audio *</label>
            <div class="file-drop-zone" id="audio-drop-zone">
              <input type="file" id="audio-input" accept="audio/mpeg,audio/wav,audio/*" aria-label="Pilih file audio">
              <div class="file-drop-icon">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">
                  <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
              <div class="file-drop-text" id="audio-drop-text">
                <strong>Klik atau drag & drop</strong> file audio<br>
                <small>MP3, WAV — Maks. 50MB</small>
              </div>
            </div>
          </div>

          <!-- Upload progress (hidden initially) -->
          <div class="upload-progress hidden" id="upload-progress" aria-live="polite">
            <div class="upload-progress-bar">
              <div class="upload-progress-fill" id="upload-progress-fill"></div>
            </div>
            <div class="upload-progress-text" id="upload-progress-text">Mempersiapkan upload...</div>
          </div>

          <!-- Error message -->
          <div id="upload-error" class="form-error hidden" role="alert"></div>

          <!-- Submit -->
          <div style="display:flex;gap:var(--sp-md);align-items:center;flex-wrap:wrap">
            <button type="submit" id="upload-submit" class="btn btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span class="btn-text">Upload Musik</span>
              <div class="btn-spinner hidden"></div>
            </button>
            <button type="button" id="upload-reset" class="btn btn--ghost btn--sm">Reset Form</button>
          </div>

        </form>
      </div>
    `;

    this._bindEvents(container);
  }

  // ══════════════════════════════════════════
  //  EVENT BINDING
  // ══════════════════════════════════════════

  _bindEvents(container) {
    // Cover image preview
    document.getElementById('cover-input')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      this.coverFile = file;
      const img = document.getElementById('cover-preview-img');
      const ph = document.getElementById('cover-placeholder');
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (img) { img.src = ev.target.result; img.style.display = 'block'; }
        if (ph) ph.style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    // Audio file selection
    const audioInput = document.getElementById('audio-input');
    const audioDropEl = document.getElementById('audio-drop-zone');
    const audioText = document.getElementById('audio-drop-text');

    const setAudioFile = (file) => {
      if (!file || !file.type.startsWith('audio/')) {
        Utils.showToast('File harus berformat audio (MP3, WAV)', 'error');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        Utils.showToast('Ukuran file maks. 50MB', 'error');
        return;
      }
      this.audioFile = file;
      if (audioText) {
        audioText.innerHTML = `
          <strong>${Utils.sanitize(file.name)}</strong><br>
          <small>${(file.size / 1024 / 1024).toFixed(2)} MB · ${file.type}</small>
        `;
      }
      audioDropEl?.classList.add('dragover');
    };

    audioInput?.addEventListener('change', (e) => setAudioFile(e.target.files?.[0]));

    // Drag & Drop
    if (audioDropEl) {
      audioDropEl.addEventListener('dragover', (e) => { e.preventDefault(); audioDropEl.classList.add('dragover'); });
      audioDropEl.addEventListener('dragleave', () => { if (!this.audioFile) audioDropEl.classList.remove('dragover'); });
      audioDropEl.addEventListener('drop', (e) => {
        e.preventDefault();
        setAudioFile(e.dataTransfer.files?.[0]);
      });
    }

    // Form submit
    document.getElementById('upload-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleSubmit();
    });

    // Reset form
    document.getElementById('upload-reset')?.addEventListener('click', () => {
      this.coverFile = null;
      this.audioFile = null;
      document.getElementById('upload-form')?.reset();
      const img = document.getElementById('cover-preview-img');
      const ph = document.getElementById('cover-placeholder');
      if (img) { img.src = ''; img.style.display = 'none'; }
      if (ph) ph.style.display = 'flex';
      audioDropEl?.classList.remove('dragover');
      if (audioText) audioText.innerHTML = `<strong>Klik atau drag & drop</strong> file audio<br><small>MP3, WAV — Maks. 50MB</small>`;
      document.getElementById('upload-error')?.classList.add('hidden');
      document.getElementById('upload-progress')?.classList.add('hidden');
    });
  }

  // ══════════════════════════════════════════
  //  FORM SUBMIT
  // ══════════════════════════════════════════

  async _handleSubmit() {
    const title = document.getElementById('upload-title')?.value.trim();
    const artist = document.getElementById('upload-artist')?.value.trim();
    const album = document.getElementById('upload-album')?.value.trim();
    const genre = document.getElementById('upload-genre')?.value;

    // Validation
    if (!title) return this._showError('Judul lagu wajib diisi.');
    if (!artist) return this._showError('Nama artis wajib diisi.');
    if (!this.audioFile) return this._showError('Pilih file audio terlebih dahulu.');

    this._clearError();
    this._setLoading(true);

    try {
      this._setProgress(10, 'Memproses file audio...');
      const audioBase64 = await Utils.fileToBase64(this.audioFile);

      let coverBase64 = null, coverMime = null, coverName = null;
      if (this.coverFile) {
        this._setProgress(30, 'Memproses thumbnail...');
        coverBase64 = await Utils.fileToBase64(this.coverFile);
        coverMime = this.coverFile.type;
        coverName = this.coverFile.name;
      }

      this._setProgress(55, 'Memulai upload');

      // Simulasi progress karena Google Apps Script CORS tidak mendukung XMLHttpRequest upload progress
      let simPercent = 55;
      const simInterval = setInterval(() => {
        if (simPercent < 95) {
          simPercent += Math.floor(Math.random() * 5) + 1;
          if (simPercent > 95) simPercent = 95;
          this._setProgress(simPercent, `Mengupload... ${simPercent}%`);
        }
      }, 500);

      const user = this.auth.getUser();
      const res = await this.api.uploadSong({
        title, artist, album, genre,
        userId: user.id,
        token: this.auth.getToken(),
        audioBase64,
        audioMime: this.audioFile.type,
        audioName: this.audioFile.name,
        coverBase64,
        coverMime,
        coverName,
      });

      clearInterval(simInterval);

      if (res.success) {
        this._setProgress(100, '✅ Upload berhasil!');
        setTimeout(() => {
          Utils.showToast('🎵 Musik berhasil diupload!', 'success', 4000);
          this.app.navigate('library');
        }, 900);
      } else {
        throw new Error(res.message || 'Upload gagal di server.');
      }
    } catch (e) {
      console.error('[UploadPage] Error:', e);
      this._showError(e.message || 'Upload gagal. Periksa koneksi dan coba lagi.');
      this._setLoading(false);
      document.getElementById('upload-progress')?.classList.add('hidden');
    }
  }

  // ══════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════

  _setLoading(loading) {
    const btn = document.getElementById('upload-submit');
    const text = btn?.querySelector('.btn-text');
    const spinner = btn?.querySelector('.btn-spinner');
    if (!btn) return;
    btn.disabled = loading;
    text?.classList.toggle('hidden', loading);
    spinner?.classList.toggle('hidden', !loading);
    if (loading) document.getElementById('upload-progress')?.classList.remove('hidden');
  }

  _setProgress(pct, text) {
    const fill = document.getElementById('upload-progress-fill');
    const label = document.getElementById('upload-progress-text');
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = text;
  }

  _showError(msg) {
    const el = document.getElementById('upload-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    this._setLoading(false);
  }

  _clearError() {
    const el = document.getElementById('upload-error');
    el?.classList.add('hidden');
  }
}
