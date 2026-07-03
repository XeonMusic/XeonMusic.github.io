/**
 * XeonMusic — MusicPlayer (class MusicPlayer)
 * Kontrol audio: play, pause, queue, seek, volume, shuffle, loop
 * + Full-Screen Player (Spotify-like)
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

    // Fullscreen state
    this._fsOpen = false;

    // Event listeners map
    this._listeners = {};

    this._bindAudioEvents();
    this._setInitialVolume(0.8);
    this._bindFullscreenEvents();
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
    const slider   = document.getElementById('volume-slider');
    const fsSlider = document.getElementById('fs-volume-slider');
    if (slider)   slider.value   = vol * 100;
    if (fsSlider) fsSlider.value = vol * 100;
  }

  // ══════════════════════════════════════════
  //  PLAYBACK CONTROLS
  // ══════════════════════════════════════════

  setQueue(songs, startIndex = 0) {
    this.queue        = [...songs];
    this.currentIndex = Math.max(0, Math.min(startIndex, songs.length - 1));
    this._playCurrent();
  }

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

  next() {
    if (this.queue.length === 0) return;
    if (this.shuffle) {
      let idx, attempts = 0;
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

  prev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }
    if (this.queue.length === 0) return;
    this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
    this._playCurrent();
  }

  seek(pct) {
    if (this.audio.duration && isFinite(this.audio.duration)) {
      this.audio.currentTime = Utils.clamp(pct, 0, 1) * this.audio.duration;
    }
  }

  setVolume(vol) {
    this.audio.volume = Utils.clamp(vol / 100, 0, 1);
    // Sync fs slider
    const fsSlider = document.getElementById('fs-volume-slider');
    if (fsSlider) fsSlider.value = vol;
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    document.getElementById('player-shuffle')?.classList.toggle('active', this.shuffle);
    document.getElementById('fs-shuffle')?.classList.toggle('active', this.shuffle);
    Utils.showToast(this.shuffle ? '🔀 Shuffle aktif' : 'Shuffle nonaktif', 'info', 1800);
  }

  toggleLoop() {
    this.loop       = !this.loop;
    this.audio.loop = this.loop;
    document.getElementById('player-loop')?.classList.toggle('active', this.loop);
    document.getElementById('fs-loop')?.classList.toggle('active', this.loop);
    Utils.showToast(this.loop ? '🔁 Loop aktif' : 'Loop nonaktif', 'info', 1800);
  }

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

    // Update fullscreen if open
    if (this._fsOpen) {
      this._updateFsTrackUI(song);
      this._updateFsQueue();
    }

    this.api.incrementPlay(song.id).catch(() => {});
  }

  // ══════════════════════════════════════════
  //  UI UPDATES — PLAYER BAR
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
    // Player bar
    const playIcon  = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const bar       = document.getElementById('player-bar');

    playIcon?.classList.toggle('hidden', this.isPlaying);
    pauseIcon?.classList.toggle('hidden', !this.isPlaying);
    bar?.classList.toggle('playing', this.isPlaying);

    // Fullscreen
    const fsPlayIcon  = document.getElementById('fs-play-icon');
    const fsPauseIcon = document.getElementById('fs-pause-icon');
    fsPlayIcon?.classList.toggle('hidden', this.isPlaying);
    fsPauseIcon?.classList.toggle('hidden', !this.isPlaying);

    // Visualizer animation
    const vis    = document.querySelector('.visualizer');
    const fsVis  = document.getElementById('fs-visualizer');
    const active = this.isPlaying;
    vis?.classList.toggle('playing',    active);
    fsVis?.classList.toggle('playing',  active);

    this._emit('playStateChange', this.isPlaying);
  }

  _showPlayerBar() {
    document.getElementById('player-bar')?.classList.remove('hidden');
  }

  _onTimeUpdate() {
    const cur = this.audio.currentTime;
    const dur = this.audio.duration || 0;
    const pct = dur ? (cur / dur) * 100 : 0;

    // Player bar
    const fill  = document.getElementById('player-progress-fill');
    const thumb = document.getElementById('player-progress-thumb');
    const curEl = document.getElementById('player-current-time');
    const bar   = document.getElementById('player-progress-bar');

    if (fill)  fill.style.width  = `${pct}%`;
    if (thumb) thumb.style.left  = `calc(${pct}% - 6px)`;
    if (curEl) curEl.textContent = Utils.formatDuration(cur);
    if (bar)   bar.setAttribute('aria-valuenow', Math.round(pct));

    // Fullscreen
    const fsFill  = document.getElementById('fs-progress-fill');
    const fsThumb = document.getElementById('fs-progress-thumb');
    const fsCurEl = document.getElementById('fs-current-time');
    const fsBar   = document.getElementById('fs-progress-bar');

    if (fsFill)  fsFill.style.width  = `${pct}%`;
    if (fsThumb) fsThumb.style.left  = `calc(${pct}% - 8px)`;
    if (fsCurEl) fsCurEl.textContent = Utils.formatDuration(cur);
    if (fsBar)   fsBar.setAttribute('aria-valuenow', Math.round(pct));
  }

  _onMetaLoaded() {
    const dur = this.audio.duration;
    document.getElementById('player-duration').textContent = Utils.formatDuration(dur);
    document.getElementById('fs-duration').textContent     = Utils.formatDuration(dur);
  }

  _onEnded() {
    if (this.loop) return;
    this._emit('songEnded', this.currentSong());
    this.next();
  }

  _onError(e) {
    console.error('[Player] Audio error:', e);
    Utils.showToast('Gagal memuat audio. Coba lagi.', 'error');
    this._emit('error', e);
  }

  // ══════════════════════════════════════════
  //  FULLSCREEN PLAYER
  // ══════════════════════════════════════════

  openFullscreen() {
    const fs = document.getElementById('fullscreen-player');
    if (!fs) return;

    this._fsOpen = true;
    fs.classList.remove('hidden');
    requestAnimationFrame(() => fs.classList.add('fs-visible'));

    const song = this.currentSong();
    if (song) {
      this._updateFsTrackUI(song);
      this._updateFsQueue();
    }

    // Sync play state
    this._updatePlayUI();

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  closeFullscreen() {
    const fs = document.getElementById('fullscreen-player');
    if (!fs) return;

    this._fsOpen = false;
    fs.classList.remove('fs-visible');
    setTimeout(() => fs.classList.add('hidden'), 350);
    document.body.style.overflow = '';
  }

  _updateFsTrackUI(song) {
    const cover  = document.getElementById('fs-cover');
    const title  = document.getElementById('fs-title');
    const artist = document.getElementById('fs-artist');
    const album  = document.getElementById('fs-album');
    const bg     = document.getElementById('fs-bg');

    const coverUrl = Utils.getCoverUrl(song.cover_drive_id, 600);
    if (cover)  {
      cover.src     = coverUrl;
      cover.onerror = () => { cover.src = 'assets/default-cover.png'; };
    }
    if (bg) {
      bg.style.backgroundImage = `url(${coverUrl})`;
    }
    if (title)  title.textContent  = song.title  || 'Unknown';
    if (artist) artist.textContent = song.artist || 'Unknown';
    if (album)  album.textContent  = song.album  || '';
  }

  _updateFsQueue() {
    const list = document.getElementById('fs-queue-list');
    if (!list || !this.queue.length) return;

    list.innerHTML = this.queue.slice(0, 8).map((s, i) => `
      <div class="fs-queue-item ${i === this.currentIndex ? 'fs-queue-item--active' : ''}" data-idx="${i}">
        <img class="fs-queue-cover" src="${Utils.getCoverUrl(s.cover_drive_id, 60)}" 
             alt="${Utils.sanitize(s.title)}" onerror="this.src='assets/default-cover.png'">
        <div class="fs-queue-info">
          <div class="fs-queue-title">${Utils.sanitize(s.title)}</div>
          <div class="fs-queue-artist">${Utils.sanitize(s.artist)}</div>
        </div>
        ${i === this.currentIndex ? '<div class="fs-queue-playing-dot"></div>' : ''}
      </div>
    `).join('');

    list.querySelectorAll('.fs-queue-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx);
        this.currentIndex = idx;
        this._playCurrent();
      });
    });
  }

  _bindFullscreenEvents() {
    // Open fullscreen on cover click
    document.addEventListener('click', (e) => {
      if (e.target.closest('#player-cover-wrap-btn') || e.target.closest('#player-expand-btn')) {
        if (this.currentSong()) this.openFullscreen();
      }
    });

    // Close button
    document.addEventListener('click', (e) => {
      if (e.target.closest('#fs-close-btn')) this.closeFullscreen();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this._fsOpen) this.closeFullscreen();
    });

    // FS controls
    document.addEventListener('click', (e) => {
      if (e.target.closest('#fs-play'))    this.togglePlay();
      if (e.target.closest('#fs-prev'))    this.prev();
      if (e.target.closest('#fs-next'))    this.next();
      if (e.target.closest('#fs-shuffle')) this.toggleShuffle();
      if (e.target.closest('#fs-loop'))    this.toggleLoop();
    });

    // FS volume
    document.addEventListener('input', (e) => {
      if (e.target.id === 'fs-volume-slider') {
        this.setVolume(Number(e.target.value));
        const barSlider = document.getElementById('volume-slider');
        if (barSlider) barSlider.value = e.target.value;
      }
    });

    // FS progress bar
    this._bindFsProgressBar();
  }

  _bindFsProgressBar() {
    const getBar = () => document.getElementById('fs-progress-bar');
    let isDragging = false;

    const getPct = (e) => {
      const bar  = getBar();
      if (!bar) return 0;
      const rect = bar.getBoundingClientRect();
      const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return Utils.clamp(x / rect.width, 0, 1);
    };

    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('#fs-progress-bar')) {
        isDragging = true;
        this.seek(getPct(e));
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) this.seek(getPct(e));
    });

    document.addEventListener('mouseup', () => { isDragging = false; });

    document.addEventListener('touchstart', (e) => {
      if (e.target.closest('#fs-progress-bar')) this.seek(getPct(e));
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (e.target.closest('#fs-progress-bar')) this.seek(getPct(e));
    }, { passive: true });
  }

  // ══════════════════════════════════════════
  //  PROGRESS BAR (Player Bar)
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
