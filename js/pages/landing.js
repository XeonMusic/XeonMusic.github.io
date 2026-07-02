/**
 * XeonMusic — LandingPage (class LandingPage)
 * Halaman utama: Hero, Top Songs, Top Artists, New Releases
 * Developer: AlfandoXeon
 */
class LandingPage {
  constructor(app) {
    this.app = app;
    this.api = app.api;
    this.player = app.player;
    this.auth = app.auth;
  }

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  async render(container) {
    const isLoggedIn = this.auth.isLoggedIn();
    const user = this.auth.getUser();

    container.innerHTML = `
      <div class="page-enter">

        <!-- ── HERO ── -->
        <div class="hero">
          <div class="hero-bg-glow"></div>
          <div class="hero-bg-glow-2"></div>
          <div class="hero-content">
            <div class="hero-tag">
              <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
              Stream Sekarang
            </div>
            <h1 class="hero-title">
              Musik Tanpa Batas,<br><span>Dimana Saja</span>
            </h1>
            <p class="hero-desc">
              Dengarkan lagu pilihan, upload karyamu sendiri, dan bagikan musik ke dunia. Platform streaming gratis dari AlfandoXeon.
            </p>
            <div class="hero-actions">
              ${isLoggedIn
        ? `<button class="btn btn--primary btn--lg" id="hero-browse-btn">
                     <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                     Jelajahi Musik
                   </button>`
        : `<button class="btn btn--primary btn--lg" id="hero-register-btn">Mulai Gratis</button>
                   <button class="btn btn--outline" id="hero-guest-btn">Dengarkan Sekarang</button>`
      }
            </div>
          </div>
          <div class="hero-visual" aria-hidden="true">
            ${Array(8).fill(0).map(() => `<span class="hero-bar"></span>`).join('')}
          </div>
        </div>

        <!-- ── TRENDING ── -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title"> Trending Sekarang</h2>
            <button class="section-link" id="see-all-trending">Lihat Semua →</button>
          </div>
          <div class="cards-grid card-stagger" id="top-songs-grid">
            ${this._skeletonCards(6)}
          </div>
        </section>

        <!-- ── TOP ARTISTS ── -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Artis Teratas</h2>
          </div>
          <div class="cards-row" id="top-artists-row">
            ${this._skeletonArtists(6)}
          </div>
        </section>

        <!-- ── NEW RELEASES ── -->
        <section class="section">
          <div class="section-header">
            <h2 class="section-title">Rilis Terbaru</h2>
            <button class="section-link" id="see-all-new">Lihat Semua →</button>
          </div>
          <div class="cards-row" id="new-releases-row">
            ${this._skeletonRows(5)}
          </div>
        </section>

      </div>
    `;

    this._bindHeroEvents(container);
    await this._loadAllData();
  }

  // ══════════════════════════════════════════
  //  DATA LOADING
  // ══════════════════════════════════════════

  async _loadAllData() {
    const userId = this.auth.getUser()?.id || null;

    try {
      const [topRes, newRes] = await Promise.all([
        this.api.getTopSongs(8, userId),
        this.api.getNewReleases(8, userId),
      ]);

      const topSongs = topRes.data || [];
      const newSongs = newRes.data || [];

      this._renderTopSongs(topSongs);
      this._renderTopArtists(topSongs);
      this._renderNewReleases(newSongs);
    } catch (e) {
      console.error('[LandingPage] Load error:', e);
      Utils.showToast('Gagal memuat data. Periksa koneksi internet.', 'error');
      document.getElementById('top-songs-grid')?.remove();
    }
  }

  // ══════════════════════════════════════════
  //  RENDER SECTIONS
  // ══════════════════════════════════════════

  _renderTopSongs(songs) {
    const grid = document.getElementById('top-songs-grid');
    if (!grid) return;

    if (!songs.length) {
      grid.innerHTML = this._emptyState('Belum ada lagu trending');
      return;
    }

    grid.innerHTML = songs.map(s => this._songCardHTML(s)).join('');
    this._bindSongCards(grid, songs);
  }

  _renderTopArtists(songs) {
    const row = document.getElementById('top-artists-row');
    if (!row) return;

    // Group songs by artist
    const artistMap = {};
    songs.forEach(s => {
      if (!s.artist) return;
      if (!artistMap[s.artist]) {
        artistMap[s.artist] = { name: s.artist, count: 0, coverId: s.cover_drive_id };
      }
      artistMap[s.artist].count++;
    });

    const artists = Object.values(artistMap).slice(0, 8);

    if (!artists.length) {
      row.innerHTML = `<p class="text-muted">Belum ada artis</p>`;
      return;
    }

    row.innerHTML = artists.map(a => `
      <div class="artist-card" data-artist="${Utils.sanitize(a.name)}">
        <img class="artist-avatar" src="${Utils.getCoverUrl(a.coverId, 200)}"
             alt="${Utils.sanitize(a.name)}"
             onerror="this.src='assets/default-cover.png'">
        <div class="artist-name">${Utils.sanitize(a.name)}</div>
        <div class="artist-count">${a.count} lagu</div>
      </div>
    `).join('');

    row.querySelectorAll('.artist-card').forEach(card => {
      card.addEventListener('click', () => {
        this.app.navigate('library', { filter: card.dataset.artist });
      });
    });
  }

  _renderNewReleases(songs) {
    const row = document.getElementById('new-releases-row');
    if (!row) return;

    if (!songs.length) {
      row.innerHTML = `<p class="text-muted">Belum ada rilis baru</p>`;
      return;
    }

    row.innerHTML = songs.map((s, i) => `
      <div class="song-row" data-index="${i}" style="min-width:300px;flex-shrink:0">
        <img class="song-row__cover"
             src="${Utils.getCoverUrl(s.cover_drive_id)}"
             alt="${Utils.sanitize(s.title)}"
             onerror="this.src='assets/default-cover.png'">
        <div class="song-row__info">
          <div class="song-row__title">${Utils.sanitize(s.title)}</div>
          <div class="song-row__meta">${Utils.sanitize(s.artist)} · ${Utils.formatDuration(Number(s.duration))}</div>
        </div>
        <div class="song-row__actions">
          <button class="icon-btn like-btn ${s._isLiked ? 'liked' : ''}" data-id="${s.id}" title="Like">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${s._isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    row.querySelectorAll('.song-row').forEach((el, i) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.like-btn')) return;
        this.player.play(songs[i], songs);
      });
    });

    this._bindLikeBtns(row, songs);
  }

  // ══════════════════════════════════════════
  //  SONG CARD HTML
  // ══════════════════════════════════════════

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
          <span class="song-card__action-btn" style="cursor:default;pointer-events:none">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            ${Utils.formatCount(song.play_count || 0)}
          </span>
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════════════
  //  EVENT BINDING
  // ══════════════════════════════════════════

  _bindSongCards(container, songs) {
    container.querySelectorAll('.song-card').forEach((card, i) => {
      card.querySelector('.song-card__cover-wrap')?.addEventListener('click', () => {
        this.player.play(songs[i], songs);
        container.querySelectorAll('.song-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
    this._bindLikeBtns(container, songs);
    this._bindCommentBtns(container, songs);
  }

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
        const user = this.auth.getUser();
        btn.classList.add('liked-anim');
        btn.addEventListener('animationend', () => btn.classList.remove('liked-anim'), { once: true });
        try {
          const res = await this.api.likeSong(songId, user.id, this.auth.getToken());
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

  _bindHeroEvents(container) {
    container.querySelector('#hero-register-btn')?.addEventListener('click', () => this.app.showAuth('register'));
    container.querySelector('#hero-guest-btn')?.addEventListener('click', () => this.app.navigate('library'));
    container.querySelector('#hero-browse-btn')?.addEventListener('click', () => this.app.navigate('library'));
    container.querySelector('#see-all-trending')?.addEventListener('click', () => this.app.navigate('library'));
    container.querySelector('#see-all-new')?.addEventListener('click', () => this.app.navigate('library'));
  }

  // ══════════════════════════════════════════
  //  SKELETON & EMPTY STATE HELPERS
  // ══════════════════════════════════════════

  _skeletonCards(n) {
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

  _skeletonArtists(n) {
    return Array.from({ length: n }, () => `
      <div class="artist-card" style="pointer-events:none">
        <div class="skeleton" style="width:82px;height:82px;border-radius:50%"></div>
        <div class="skeleton skeleton-line" style="width:70px;height:11px"></div>
        <div class="skeleton skeleton-line skeleton-line--short" style="height:9px"></div>
      </div>
    `).join('');
  }

  _skeletonRows(n) {
    return Array.from({ length: n }, () => `
      <div class="song-row" style="min-width:300px;flex-shrink:0;pointer-events:none">
        <div class="skeleton" style="width:50px;height:50px;border-radius:8px"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:7px">
          <div class="skeleton skeleton-line skeleton-line--medium"></div>
          <div class="skeleton skeleton-line skeleton-line--short"></div>
        </div>
      </div>
    `).join('');
  }

  _emptyState(msg) {
    return `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
          </svg>
        </div>
        <div class="empty-state-title">${Utils.sanitize(msg)}</div>
        <p class="empty-state-desc">Belum ada konten untuk ditampilkan.</p>
      </div>
    `;
  }
}
