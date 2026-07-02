/**
 * XeonMusic — MusicPlayer (class MusicPlayer)
 * Kontrol audio: play, pause, queue, seek, volume, shuffle, loop
 * Developer: AlfandoXeon
 */
class MusicPlayer {
  constructor(api, auth) {
    this.api   = api;
    this.auth  = auth;

    // Core audio
    this.audio = new Audio();
    this.audio.preload = 'metadata';

    // Queue state
    this.queue        = [];
    this.currentIndex = -1;
    this.isPlaying    = false;
    this.shuffle      = false;
    this.loop         = false;

    // Event listeners map
    this._listeners = {};

    this._bindAudioEvents();
    this._setInitialVolume(0.8);
  }

  // ══════════════════════════════════════════
  //  AUDIO EVENT BINDING
  // ══════════════════════════════════════════

  _bindAudioEvents() {
    this.audio.addEventListener('timeupdate',     () => this._onTimeUpdate());
    this.audio.addEventListener('ended',          () => this._onEnded());
    this.audio.addEventListener('loadedmetadata', () => this._onMetaLoaded());
    this.audio.addEventListener('error',          (e) => this._onError(e));
    this.audio.addEventListener('waiting',        () => this._emit('loading', true));
    this.audio.addEventListener('canplay',        () => this._emit('loading', false));
    this.audio.addEventListener('play',  () => { this.isPlaying = true;  this._updatePlayUI(); });
    this.audio.addEventListener('pause', () => { this.isPlaying = false; this._updatePlayUI(); });
  }

  _setInitialVolume(vol) {
    this.audio.volume = vol;
    const slider = document.getElementById('volume-slider');
    if (slider) slider.value = vol * 100;
  }

  // ══════════════════════════════════════════
  //  PLAYBACK CONTROLS
  // ══════════════════════════════════════════

  /**
   * Atur queue lagu dan mulai dari index tertentu
   * @param {Array} songs - Array of song objects
   * @param {number} startIndex - Index lagu pertama
   */
  setQueue(songs, startIndex = 0) {
    this.queue        = [...songs];
    this.currentIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
    this._playCurrent();
  }

  /**
   * Putar satu lagu (opsional: ganti seluruh queue)
   * @param {Object} song
   * @param {Array|null} queue - Jika diisi, ganti queue dan cari posisi song
   */
  play(song, queue = null) {
    if (queue && queue.length > 0) {
      const idx = queue.findIndex(s => s.id === song.id);
      this.setQueue(queue, idx >= 0 ? idx : 0);
    } else {
      this.queue        = [song];
      this.currentIndex = 0;
      this._playCurrent();
    }
  }

  pause()  { this.audio.pause(); }
  resume() { this.audio.play().catch(e => console.warn('[Player] resume:', e)); }

  togglePlay() {
    if (!this.currentSong()) return;
    this.isPlaying ? this.pause() : this.resume();
  }

  /** Lagu selanjutnya (dengan shuffle support) */
  next() {
    if (this.queue.length === 0) return;

    if (this.shuffle) {
      let idx;
      let attempts = 0;
      do {
        idx = Math.floor(Math.random() * this.queue.length);
        attempts++;
      } while (idx === this.currentIndex && this.queue.length > 1 && attempts < 10);
      this.currentIndex = idx;
    } else {
      this.currentIndex = (this.currentIndex + 1) % this.queue.length;
    }

    this._playCurrent();
  }

  /** Lagu sebelumnya — jika > 3 detik, restart; jika tidak, benar-benar mundur */
  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    if (this.queue.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
    this._playCurrent();
  }

  /**
   * Seek ke posisi tertentu berdasarkan persentase (0–1)
   * @param {number} pct - 0.0 to 1.0
   */
  seek(pct) {
    if (this.audio.duration && isFinite(this.audio.duration)) {
      this.audio.currentTime = Utils.clamp(pct, 0, 1) * this.audio.duration;
    }
  }

  /**
   * Atur volume (0–100)
   * @param {number} vol
   */
  setVolume(vol) {
    this.audio.volume = Utils.clamp(vol / 100, 0, 1);
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    document.getElementById('player-shuffle')?.classList.toggle('active', this.shuffle);
    Utils.showToast(this.shuffle ? '🔀 Shuffle aktif' : 'Shuffle nonaktif', 'info', 1800);
  }

  toggleLoop() {
    this.loop          = !this.loop;
    this.audio.loop    = this.loop;
    document.getElementById('player-loop')?.classList.toggle('active', this.loop);
    Utils.showToast(this.loop ? '🔁 Loop aktif' : 'Loop nonaktif', 'info', 1800);
  }

  /** Kembalikan objek song yang sedang diputar */
  currentSong() {
    return this.queue[this.currentIndex] ?? null;
  }

  // ══════════════════════════════════════════
  //  INTERNAL PLAYBACK
  // ══════════════════════════════════════════

  _playCurrent() {
    const song = this.currentSong();
    if (!song) return;

    const audioUrl = Utils.getAudioUrl(song.audio_drive_id);
    this.audio.src = audioUrl;
    this.audio.load();
    this.audio.play().catch(e => console.warn('[Player] play error:', e));

    this._updateTrackUI(song);
    this._showPlayerBar();
    this._emit('songChange', song);

    // Increment play count (fire and forget)
    this.api.incrementPlay(song.id).catch(() => {});
  }

  // ══════════════════════════════════════════
  //  UI UPDATES
  // ══════════════════════════════════════════

  _updateTrackUI(song) {
    const els = {
      title:  document.getElementById('player-title'),
      artist: document.getElementById('player-artist'),
      cover:  document.getElementById('player-cover'),
    };

    if (els.title)  els.title.textContent  = song.title  || 'Unknown';
    if (els.artist) els.artist.textContent = song.artist || 'Unknown';
    if (els.cover)  {
      els.cover.src = Utils.getCoverUrl(song.cover_drive_id, 200);
      els.cover.onerror = () => { els.cover.src = 'assets/default-cover.png'; };
    }

    document.title = `${song.title} — XeonMusic`;
  }

  _updatePlayUI() {
    const playIcon  = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const bar       = document.getElementById('player-bar');

    playIcon?.classList.toggle('hidden', this.isPlaying);
    pauseIcon?.classList.toggle('hidden', !this.isPlaying);
    bar?.classList.toggle('playing', this.isPlaying);

    this._emit('playStateChange', this.isPlaying);
  }

  _showPlayerBar() {
    const bar = document.getElementById('player-bar');
    bar?.classList.remove('hidden');
  }

  _onTimeUpdate() {
    const cur = this.audio.currentTime;
    const dur = this.audio.duration || 0;
    const pct = dur ? (cur / dur) * 100 : 0;

    const fill  = document.getElementById('player-progress-fill');
    const thumb = document.getElementById('player-progress-thumb');
    const curEl = document.getElementById('player-current-time');
    const bar   = document.getElementById('player-progress-bar');

    if (fill)  fill.style.width  = `${pct}%`;
    if (thumb) thumb.style.left  = `calc(${pct}% - 6px)`;
    if (curEl) curEl.textContent = Utils.formatDuration(cur);
    if (bar)   bar.setAttribute('aria-valuenow', Math.round(pct));
  }

  _onMetaLoaded() {
    const durEl = document.getElementById('player-duration');
    if (durEl) durEl.textContent = Utils.formatDuration(this.audio.duration);
  }

  _onEnded() {
    if (this.loop) return; // audio.loop handles repeat
    this._emit('songEnded', this.currentSong());
    this.next();
  }

  _onError(e) {
    console.error('[Player] Audio error:', e);
    Utils.showToast('Gagal memuat audio. Coba lagi.', 'error');
    this._emit('error', e);
  }

  // ══════════════════════════════════════════
  //  PROGRESS BAR DRAG INTERACTION
  // ══════════════════════════════════════════

  bindProgressBar() {
    const bar = document.getElementById('player-progress-bar');
    if (!bar) return;

    let isDragging = false;

    const getPct = (e) => {
      const rect = bar.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return Utils.clamp(x / rect.width, 0, 1);
    };

    bar.addEventListener('mousedown', (e) => {
      isDragging = true;
      this.seek(getPct(e));
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) this.seek(getPct(e));
    });

    document.addEventListener('mouseup', () => { isDragging = false; });

    bar.addEventListener('touchstart', (e) => this.seek(getPct(e)), { passive: true });
    bar.addEventListener('touchmove',  (e) => this.seek(getPct(e)), { passive: true });
  }

  // ══════════════════════════════════════════
  //  SIMPLE EVENT EMITTER
  // ══════════════════════════════════════════

  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  }

  off(event, fn) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(f => f !== fn);
  }

  _emit(event, data) {
    (this._listeners[event] || []).forEach(fn => {
      try { fn(data); } catch (e) { console.warn('[Player] listener error:', e); }
    });
  }
}
