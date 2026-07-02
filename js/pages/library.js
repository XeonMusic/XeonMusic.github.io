/**
 * XeonMusic — LibraryPage (class LibraryPage)
 * Browse semua lagu, real-time search, filter by genre
 * Developer: AlfandoXeon
 */
class LibraryPage {
  constructor(app) {
    this.app    = app;
    this.api    = app.api;
    this.player = app.player;
    this.auth   = app.auth;

    this.allSongs      = [];
    this.filteredSongs = [];
    this.activeGenre   = 'all';
    this.searchQuery   = '';

    this.genres = ['all', 'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Jazz', 'Electronic', 'Classical', 'Lainnya'];
  }

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  async render(container, opts = {}) {
    container.innerHTML = `
      <div class="page-enter">
        <div class="section-header" style="margin-bottom:var(--sp-md)">
          <h1 class="h2">🎵 Jelajahi Musik</h1>
          <span class="text-muted text-sm" id="song-count"></span>
        </div>

        <!-- Search bar -->
        <div class="search-wrapper" style="max-width:100%;margin-bottom:var(--sp-lg)">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input type="text" id="library-search" class="search-input"
                 style="border-radius:var(--radius-md)"
                 placeholder="Cari judul, artis, album..."
                 autocomplete="off"
                 aria-label="Cari lagu">
        </div>

        <!-- Genre filter chips -->
        <div class="filter-bar" id="genre-filter" role="group" aria-label="Filter genre">
          ${this.genres.map(g => `
            <button class="filter-chip ${g === 'all' ? 'active' : ''}" data-genre="${g}">
              ${g === 'all' ? 'Semua' : Utils.sanitize(g)}
            </button>
          `).join('')}
        </div>

        <!-- Songs grid -->
        <div class="cards-grid card-stagger" id="library-songs-grid">
          ${this._skeletons(8)}
        </div>
      </div>
    `;

    this._bindEvents(container);
    await this._loadSongs();

    // Apply opts filter (e.g. from artist card click)
    if (opts.filter) {
      const searchEl = document.getElementById('library-search');
      if (searchEl) searchEl.value = opts.filter;
      this.searchQuery = opts.filter;
      this._filterAndRender();
    }
  }

  // ══════════════════════════════════════════
  //  DATA LOADING
  // ══════════════════════════════════════════

  async _loadSongs() {
    try {
      const userId = this.auth.getUser()?.id || null;
      const res = await this.api.getSongs(100, 0, userId);
      this.allSongs      = res.data || [];
      this.filteredSongs = [...this.allSongs];
      this._renderSongs(this.filteredSongs);
    } catch (e) {
      console.error('[LibraryPage] Load error:', e);
      const grid = document.getElementById('library-songs-grid');
      if (grid) grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-title">Gagal memuat lagu</div>
          <p class="empty-state-desc">Periksa koneksi internet kamu.</p>
        </div>
      `;
    }
  }

  // ══════════════════════════════════════════
  //  FILTER & SEARCH
  // ══════════════════════════════════════════

  _filterAndRender() {
    let songs = [...this.allSongs];

    // Genre filter
    if (this.activeGenre !== 'all') {
      songs = songs.filter(s =>
        s.genre?.toLowerCase() === this.activeGenre.toLowerCase()
      );
    }

    // Text search
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      songs = songs.filter(s =>
        s.title?.toLowerCase().includes(q)  ||
        s.artist?.toLowerCase().includes(q) ||
        s.album?.toLowerCase().includes(q)
      );
    }

    this.filteredSongs = songs;
    this._renderSongs(songs);
  }

  // ══════════════════════════════════════════
  //  RENDER SONGS GRID
  // ══════════════════════════════════════════

  _renderSongs(songs) {
    const grid = document.getElementById('library-songs-grid');
    if (!grid) return;

    // Update count
    const countEl = document.getElementById('song-count');
    if (countEl) countEl.textContent = `${songs.length} lagu`;

    if (!songs.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-icon">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <div class="empty-state-title">Tidak ada lagu ditemukan</div>
          <p class="empty-state-desc">Coba ubah kata kunci atau filter genre.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = songs.map(s => this._songCardHTML(s)).join('');
    grid.className = 'cards-grid card-stagger';

    // Bind events on cards
    grid.querySelectorAll('.song-card').forEach((card, i) => {
      card.querySelector('.song-card__cover-wrap')?.addEventListener('click', () => {
        grid.querySelectorAll('.song-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.player.play(songs[i], songs);
      });
    });

    this._bindLikeBtns(grid, songs);
    this._bindCommentBtns(grid, songs);
    this._bindDownloadBtns(grid, songs);
  }

  _songCardHTML(song) {
    const isLiked = !!song._isLiked;
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
          <button class="song-card__action-btn like-btn ${isLiked ? 'liked' : ''}" data-id="${song.id}" title="Like">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            ${Utils.formatCount(song.like_count || 0)}
          </button>
          <button class="song-card__action-btn comment-btn" data-id="${song.id}" title="Komentar">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            ${song.comment_count || 0}
          </button>
          <button class="song-card__action-btn download-btn" data-id="${song.id}" title="Download">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════════════
  //  INTERACTION BUTTON BINDING
  // ══════════════════════════════════════════

  _bindLikeBtns(container, songs) {
    container.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!this.auth.isLoggedIn()) {
          this.app.showAuth('login');
          Utils.showToast('Login dulu untuk memberi like 💡', 'info');
          return;
        }
        const songId = btn.dataset.id;
        const user   = this.auth.getUser();
        btn.classList.add('liked-anim');
        btn.addEventListener('animationend', () => btn.classList.remove('liked-anim'), { once: true });
        try {
          const res     = await this.api.likeSong(songId, user.id, this.auth.getToken());
          const isLiked = !!res.liked;
          btn.classList.toggle('liked', isLiked);
          const svg = btn.querySelector('svg');
          if (svg) svg.setAttribute('fill', isLiked ? 'currentColor' : 'none');
          Utils.showToast(isLiked ? '❤️ Ditambahkan ke favorit' : 'Dihapus dari favorit', 'success');
        } catch {
          Utils.showToast('Gagal. Coba lagi.', 'error');
        }
      });
    });
  }

  _bindCommentBtns(container, songs) {
    container.querySelectorAll('.comment-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const song = songs.find(s => s.id === btn.dataset.id);
        if (song) this.app.openComments(song);
      });
    });
  }

  _bindDownloadBtns(container, songs) {
    container.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!this.auth.isLoggedIn()) {
          this.app.showAuth('login');
          Utils.showToast('Login dulu untuk download 💡', 'info');
          return;
        }
        const song = songs.find(s => s.id === btn.dataset.id);
        if (!song) return;
        const user = this.auth.getUser();
        await this.api.downloadSong(song.id, user.id, this.auth.getToken()).catch(() => {});
        window.open(Utils.getAudioUrl(song.audio_drive_id), '_blank');
        Utils.showToast('⬇️ Download dimulai!', 'success');
      });
    });
  }

  // ══════════════════════════════════════════
  //  EVENT BINDING
  // ══════════════════════════════════════════

  _bindEvents(container) {
    // Real-time search
    document.getElementById('library-search')?.addEventListener(
      'input',
      Utils.debounce((e) => {
        this.searchQuery = e.target.value;
        this._filterAndRender();
      }, 280)
    );

    // Genre filter chips
    document.getElementById('genre-filter')?.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#genre-filter .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeGenre = chip.dataset.genre;
        this._filterAndRender();
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
