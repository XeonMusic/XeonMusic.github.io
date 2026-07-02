/**
 * XeonMusic — ProfilePage (class ProfilePage)
 * Profil user — info, statistik, upload saya, lagu disukai
 * Developer: AlfandoXeon
 */
class ProfilePage {
  constructor(app) {
    this.app    = app;
    this.api    = app.api;
    this.auth   = app.auth;
    this.player = app.player;

    this._uploadedSongs = [];
    this._likedSongs    = [];
    this.activeTab      = 'uploads';
  }

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  async render(container) {
    if (!this.auth.isLoggedIn()) {
      container.innerHTML = `
        <div class="empty-state page-enter">
          <div class="empty-state-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div class="empty-state-title">Belum Login</div>
          <p class="empty-state-desc">Login untuk melihat profil dan aktivitas kamu.</p>
          <button class="btn btn--primary mt-md" id="profile-login-btn">Login Sekarang</button>
        </div>
      `;
      container.querySelector('#profile-login-btn')?.addEventListener('click', () => this.app.showAuth('login'));
      return;
    }

    const user = this.auth.getUser();

    container.innerHTML = `
      <div class="page-enter">

        <!-- ── Profile Header ── -->
        <div class="profile-header">
          <img class="profile-avatar"
               src="${user.avatar_drive_id ? Utils.getCoverUrl(user.avatar_drive_id, 200) : 'assets/default-cover.png'}"
               alt="Avatar ${Utils.sanitize(user.username)}"
               onerror="this.src='assets/default-cover.png'">

          <div class="profile-info">
            <div class="profile-username">${Utils.sanitize(user.username)}</div>
            <span class="profile-role">${Utils.sanitize(user.role || 'User')}</span>
            <div class="profile-stats">
              <div class="profile-stat">
                <span class="profile-stat-value" id="stat-uploads">—</span>
                <span class="profile-stat-label">Upload</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat-value" id="stat-likes">—</span>
                <span class="profile-stat-label">Disukai</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat-value" id="stat-plays">—</span>
                <span class="profile-stat-label">Total Plays</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Tabs ── -->
        <div class="page-tabs" role="tablist">
          <button class="page-tab active" data-tab="uploads" role="tab" aria-selected="true" id="tab-uploads">
            Upload Saya
          </button>
          <button class="page-tab" data-tab="likes" role="tab" aria-selected="false" id="tab-likes">
            ❤️ Disukai
          </button>
        </div>

        <!-- ── Tab Content ── -->
        <div id="profile-tab-content">
          <div class="cards-grid card-stagger" id="profile-songs-grid">
            ${this._skeletons(4)}
          </div>
        </div>

      </div>
    `;

    this._bindTabEvents(container);
    await this._loadProfile(user);
  }

  // ══════════════════════════════════════════
  //  DATA LOADING
  // ══════════════════════════════════════════

  async _loadProfile(user) {
    try {
      const res  = await this.api.getUserProfile(user.id);
      const data = res.data || {};

      this._uploadedSongs = data.uploads || [];
      this._likedSongs    = data.likes   || [];

      // Stat: total plays from uploaded songs
      const totalPlays = this._uploadedSongs.reduce(
        (sum, s) => sum + Number(s.play_count || 0), 0
      );

      const statUploads = document.getElementById('stat-uploads');
      const statLikes   = document.getElementById('stat-likes');
      const statPlays   = document.getElementById('stat-plays');

      if (statUploads) statUploads.textContent = Utils.formatCount(this._uploadedSongs.length);
      if (statLikes)   statLikes.textContent   = Utils.formatCount(this._likedSongs.length);
      if (statPlays)   statPlays.textContent   = Utils.formatCount(totalPlays);

      this._renderTab('uploads');
    } catch (e) {
      console.error('[ProfilePage] Load error:', e);
      Utils.showToast('Gagal memuat profil.', 'error');

      const grid = document.getElementById('profile-songs-grid');
      if (grid) grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-title">Gagal memuat data</div>
        </div>
      `;
    }
  }

  // ══════════════════════════════════════════
  //  TAB RENDERING
  // ══════════════════════════════════════════

  _renderTab(tab) {
    this.activeTab = tab;
    const songs = tab === 'uploads' ? this._uploadedSongs : this._likedSongs;
    const grid  = document.getElementById('profile-songs-grid');
    if (!grid) return;

    if (!songs?.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              ${tab === 'uploads'
                ? `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>`
                : `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`
              }
            </svg>
          </div>
          <div class="empty-state-title">
            ${tab === 'uploads' ? 'Belum ada upload' : 'Belum ada lagu disukai'}
          </div>
          <p class="empty-state-desc">
            ${tab === 'uploads' ? 'Mulai bagikan musik pertamamu!' : 'Eksplor lagu dan klik ❤️'}
          </p>
          ${tab === 'uploads'
            ? `<button class="btn btn--primary mt-md" id="go-upload-btn">
                 Upload Musik
               </button>`
            : `<button class="btn btn--outline mt-md" id="go-browse-btn">
                 Jelajahi Musik
               </button>`
          }
        </div>
      `;
      document.getElementById('go-upload-btn')?.addEventListener('click', () => this.app.navigate('upload'));
      document.getElementById('go-browse-btn')?.addEventListener('click', () => this.app.navigate('library'));
      return;
    }

    grid.innerHTML = songs.map(s => this._songCardHTML(s, tab)).join('');
    grid.className = 'cards-grid card-stagger';

    grid.querySelectorAll('.song-card').forEach((card, i) => {
      card.querySelector('.song-card__cover-wrap')?.addEventListener('click', () => {
        grid.querySelectorAll('.song-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.player.play(songs[i], songs);
      });
    });
  }

  _songCardHTML(song, tab) {
    return `
      <div class="song-card" data-id="${song.id}">
        <div class="song-card__cover-wrap">
          <img class="song-card__cover"
               src="${Utils.getCoverUrl(song.cover_drive_id)}"
               alt="${Utils.sanitize(song.title)}"
               loading="lazy"
               onerror="this.src='assets/default-cover.png'">
          <div class="song-card__play-overlay" aria-hidden="true">
            <div class="song-card__play-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            </div>
          </div>
          ${song.genre ? `<span class="genre-badge">${Utils.sanitize(song.genre)}</span>` : ''}
        </div>
        <div class="song-card__info">
          <div class="song-card__title" title="${Utils.sanitize(song.title)}">${Utils.sanitize(song.title)}</div>
          <div class="song-card__artist">${Utils.sanitize(song.artist)}</div>
        </div>
        <div class="song-card__actions">
          <span class="song-card__action-btn" style="cursor:default;pointer-events:none" title="Plays">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            ${Utils.formatCount(song.play_count || 0)}
          </span>
          <span class="song-card__action-btn" style="cursor:default;pointer-events:none" title="Likes">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${Utils.formatCount(song.like_count || 0)}
          </span>
          ${tab === 'uploads' ? `
            <span class="song-card__action-btn text-muted" style="cursor:default;pointer-events:none;font-size:0.7rem">
              ${Utils.formatDate(song.uploaded_at)}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════════════
  //  EVENT BINDING
  // ══════════════════════════════════════════

  _bindTabEvents(container) {
    container.querySelectorAll('.page-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        container.querySelectorAll('.page-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        this._renderTab(tab.dataset.tab);
      });
    });
  }

  // ══════════════════════════════════════════
  //  SKELETON
  // ══════════════════════════════════════════

  _skeletons(n) {
    return Array.from({ length: n }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-cover"></div>
        <div class="skeleton-info">
          <div class="skeleton skeleton-line skeleton-line--medium"></div>
          <div class="skeleton skeleton-line skeleton-line--short"></div>
        </div>
      </div>
    `).join('');
  }
}
