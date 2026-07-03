/**
 * XeonMusic — ProfilePage (class ProfilePage)
 * Profil user — edit profil, banner, bio, follow, delete song, notifikasi
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
    this._followers     = [];
    this._following     = [];
    this.activeTab      = 'uploads';

    // Profile data loaded from server (may differ from current user for other-user profiles)
    this._profileUser   = null;
    this._targetUserId  = null;
  }

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  async render(container, opts = {}) {
    this._targetUserId = opts.userId || (this.auth.isLoggedIn() ? this.auth.getUser().id : null);

    if (!this._targetUserId) {
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

    const currentUser = this.auth.getUser();
    const isOwnProfile = currentUser && currentUser.id === this._targetUserId;

    container.innerHTML = `
      <div class="page-enter profile-page">

        <!-- ── Profile Banner ── -->
        <div class="profile-banner-wrap" id="profile-banner-wrap">
          <img id="profile-banner" class="profile-banner-img" alt="Banner profil" style="display:none"
               onerror="this.style.display='none'">
          <div class="profile-banner-gradient"></div>
        </div>

        <!-- ── Profile Header ── -->
        <div class="profile-header-v2">
          <div class="profile-avatar-wrap">
            <img class="profile-avatar"
                 id="profile-avatar-img"
                 src="assets/default-cover.png"
                 alt="Avatar"
                 onerror="this.src='assets/default-cover.png'">
          </div>

          <div class="profile-info-v2">
            <div class="profile-username-row">
              <div class="profile-username" id="profile-username">—</div>
              ${isOwnProfile ? `
                <button class="btn btn--outline btn--sm" id="edit-profile-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit Profil
                </button>
              ` : `
                <button class="btn btn--sm follow-btn" id="follow-btn" data-state="loading" disabled>
                  <span class="btn-text">...</span>
                </button>
              `}
            </div>
            <div class="profile-role-badge" id="profile-role">—</div>
            <div class="profile-bio" id="profile-bio"></div>

            <div class="profile-stats">
              <div class="profile-stat">
                <span class="profile-stat-value" id="stat-uploads">—</span>
                <span class="profile-stat-label">Upload</span>
              </div>
              <div class="profile-stat">
                <span class="profile-stat-value" id="stat-likes">—</span>
                <span class="profile-stat-label">Disukai</span>
              </div>
              <div class="profile-stat clickable" id="stat-followers-wrap">
                <span class="profile-stat-value" id="stat-followers">—</span>
                <span class="profile-stat-label">Followers</span>
              </div>
              <div class="profile-stat clickable" id="stat-following-wrap">
                <span class="profile-stat-value" id="stat-following">—</span>
                <span class="profile-stat-label">Following</span>
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
            🎵 Upload
          </button>
          <button class="page-tab" data-tab="likes" role="tab" aria-selected="false" id="tab-likes">
            ❤️ Disukai
          </button>
          <button class="page-tab" data-tab="followers" role="tab" aria-selected="false" id="tab-followers">
            👥 Followers
          </button>
          <button class="page-tab" data-tab="following" role="tab" aria-selected="false" id="tab-following">
            ➕ Following
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
    if (isOwnProfile) {
      this._bindEditProfileBtn();
    }

    await this._loadProfile();
  }

  // ══════════════════════════════════════════
  //  DATA LOADING
  // ══════════════════════════════════════════

  async _loadProfile() {
    try {
      const currentUser = this.auth.getUser();
      const viewerId    = currentUser?.id || null;
      const res         = await this.api.getUserProfile(this._targetUserId, viewerId);
      const data        = res.data || {};

      this._profileUser   = data.user || {};
      this._uploadedSongs = data.uploads || [];
      this._likedSongs    = data.likes   || [];

      // Follows
      const followRes      = await this.api.getFollows(this._targetUserId);
      this._followers      = followRes.data?.followers  || [];
      this._following      = followRes.data?.following  || [];

      // Update header UI
      const nameEl  = document.getElementById('profile-username');
      const roleEl  = document.getElementById('profile-role');
      const bioEl   = document.getElementById('profile-bio');
      const avatImg = document.getElementById('profile-avatar-img');

      if (nameEl)  nameEl.textContent  = this._profileUser.username || '—';
      if (roleEl)  roleEl.textContent  = this._profileUser.role     || 'User';
      if (bioEl)   bioEl.textContent   = this._profileUser.bio      || '';

      // Avatar
      if (avatImg) {
        avatImg.src = this._profileUser.avatar_drive_id
          ? Utils.getCoverUrl(this._profileUser.avatar_drive_id, 200)
          : 'assets/default-cover.png';
      }

      // Banner
      if (this._profileUser.banner_drive_id) {
        const banner = document.getElementById('profile-banner');
        if (banner) {
          banner.src = Utils.getCoverUrl(this._profileUser.banner_drive_id, 1200);
          banner.style.display = 'block';
        }
      }

      // Stats
      const totalPlays = this._uploadedSongs.reduce((sum, s) => sum + Number(s.play_count || 0), 0);
      this._setText('stat-uploads',   Utils.formatCount(this._uploadedSongs.length));
      this._setText('stat-likes',     Utils.formatCount(this._likedSongs.length));
      this._setText('stat-followers', Utils.formatCount(this._followers.length));
      this._setText('stat-following', Utils.formatCount(this._following.length));
      this._setText('stat-plays',     Utils.formatCount(totalPlays));

      // Follow button state (for other-user profiles)
      const currentId    = currentUser?.id;
      const isOwnProfile = currentId && currentId === this._targetUserId;

      if (!isOwnProfile && currentId) {
        this._updateFollowBtn(data.viewerIsFollowing, data.isFriend);
        const btn = document.getElementById('follow-btn');
        btn?.addEventListener('click', () => this._handleFollow());
      }

      // Stat click → show followers/following tab
      document.getElementById('stat-followers-wrap')?.addEventListener('click', () => {
        this._switchTab('followers');
      });
      document.getElementById('stat-following-wrap')?.addEventListener('click', () => {
        this._switchTab('following');
      });

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

  _setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ══════════════════════════════════════════
  //  FOLLOW
  // ══════════════════════════════════════════

  _updateFollowBtn(isFollowing, isFriend) {
    const btn = document.getElementById('follow-btn');
    if (!btn) return;
    btn.disabled = false;

    if (isFriend) {
      btn.className  = 'btn btn--sm follow-btn follow-btn--friend';
      btn.dataset.state = 'friend';
      btn.querySelector('.btn-text').textContent = '💚 Teman';
    } else if (isFollowing) {
      btn.className  = 'btn btn--sm follow-btn follow-btn--following';
      btn.dataset.state = 'following';
      btn.querySelector('.btn-text').textContent = '✓ Mengikuti';
    } else {
      btn.className  = 'btn btn--sm follow-btn follow-btn--follow btn--primary';
      btn.dataset.state = 'follow';
      btn.querySelector('.btn-text').textContent = '+ Ikuti';
    }
  }

  async _handleFollow() {
    if (!this.auth.isLoggedIn()) { this.app.showAuth('login'); return; }
    const btn = document.getElementById('follow-btn');
    if (!btn) return;

    const user = this.auth.getUser();
    btn.disabled = true;
    const textEl = btn.querySelector('.btn-text');
    const prev   = textEl?.textContent;
    if (textEl) textEl.textContent = '...';

    try {
      const res = await this.api.followUser(this._targetUserId, user.id, this.auth.getToken());
      if (res.success) {
        this._updateFollowBtn(res.following, res.isFriend);
        // Update follower count
        const delta  = res.following ? 1 : -1;
        const curVal = parseInt(document.getElementById('stat-followers')?.textContent) || 0;
        this._setText('stat-followers', Utils.formatCount(curVal + delta));
        Utils.showToast(res.following ? '✅ Berhasil mengikuti!' : 'Tidak lagi mengikuti', 'success');
      } else {
        Utils.showToast(res.message || 'Gagal follow', 'error');
        if (textEl) textEl.textContent = prev;
        btn.disabled = false;
      }
    } catch {
      Utils.showToast('Gagal. Periksa koneksi.', 'error');
      if (textEl) textEl.textContent = prev;
      btn.disabled = false;
    }
  }

  // ══════════════════════════════════════════
  //  TAB RENDERING
  // ══════════════════════════════════════════

  _switchTab(tab) {
    document.querySelectorAll('.page-tab').forEach(t => {
      const active = t.dataset.tab === tab;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });
    this._renderTab(tab);
  }

  _renderTab(tab) {
    this.activeTab = tab;
    const grid = document.getElementById('profile-songs-grid');
    if (!grid) return;

    if (tab === 'followers' || tab === 'following') {
      this._renderUserList(grid, tab === 'followers' ? this._followers : this._following);
      return;
    }

    const songs       = tab === 'uploads' ? this._uploadedSongs : this._likedSongs;
    const currentUser = this.auth.getUser();
    const isOwn       = currentUser && currentUser.id === this._targetUserId;

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
            ? `<button class="btn btn--primary mt-md" id="go-upload-btn">Upload Musik</button>`
            : `<button class="btn btn--outline mt-md" id="go-browse-btn">Jelajahi Musik</button>`
          }
        </div>
      `;
      document.getElementById('go-upload-btn')?.addEventListener('click', () => this.app.navigate('upload'));
      document.getElementById('go-browse-btn')?.addEventListener('click', () => this.app.navigate('library'));
      return;
    }

    grid.innerHTML = songs.map(s => this._songCardHTML(s, tab, isOwn)).join('');
    grid.className = 'cards-grid card-stagger';

    grid.querySelectorAll('.song-card').forEach((card, i) => {
      card.querySelector('.song-card__cover-wrap')?.addEventListener('click', () => {
        grid.querySelectorAll('.song-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.player.play(songs[i], songs);
      });

      // Delete button (only for own uploads)
      card.querySelector('.song-delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._confirmDeleteSong(songs[i], card);
      });
    });
  }

  _renderUserList(grid, users) {
    grid.className = 'user-list';

    if (!users?.length) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-state-title">Belum ada pengguna</div>
        </div>
      `;
      return;
    }

    grid.innerHTML = users.map(u => `
      <div class="user-list-item">
        <img class="user-list-avatar"
             src="${u.avatar_drive_id ? Utils.getCoverUrl(u.avatar_drive_id, 80) : 'assets/default-cover.png'}"
             alt="${Utils.sanitize(u.username)}"
             onerror="this.src='assets/default-cover.png'">
        <div class="user-list-info">
          <div class="user-list-name">${Utils.sanitize(u.username)}</div>
        </div>
      </div>
    `).join('');
  }

  // ══════════════════════════════════════════
  //  SONG CARD
  // ══════════════════════════════════════════

  _songCardHTML(song, tab, isOwn) {
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
          ${(tab === 'uploads' && isOwn) ? `
            <button class="song-delete-btn" title="Hapus lagu" aria-label="Hapus lagu">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ══════════════════════════════════════════
  //  DELETE SONG
  // ══════════════════════════════════════════

  _confirmDeleteSong(song, card) {
    // Simple confirm dialog
    const confirmed = confirm(`Hapus lagu "${song.title}"?\n\nTindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;
    this._deleteSong(song, card);
  }

  async _deleteSong(song, card) {
    const user = this.auth.getUser();
    if (!user) return;

    card.style.opacity = '0.5';
    card.style.pointerEvents = 'none';

    try {
      const res = await this.api.deleteSong(song.id, user.id, this.auth.getToken());
      if (res.success) {
        // Remove from local array
        this._uploadedSongs = this._uploadedSongs.filter(s => s.id !== song.id);
        // Animate out
        card.style.transition = 'all 0.3s ease';
        card.style.transform  = 'scale(0.8)';
        card.style.opacity    = '0';
        setTimeout(() => {
          card.remove();
          // Update stats
          this._setText('stat-uploads', Utils.formatCount(this._uploadedSongs.length));
        }, 300);
        Utils.showToast('🗑️ Lagu berhasil dihapus!', 'success');
      } else {
        Utils.showToast(res.message || 'Gagal menghapus lagu.', 'error');
        card.style.opacity = '1';
        card.style.pointerEvents = '';
      }
    } catch {
      Utils.showToast('Gagal menghapus. Periksa koneksi.', 'error');
      card.style.opacity = '1';
      card.style.pointerEvents = '';
    }
  }

  // ══════════════════════════════════════════
  //  EDIT PROFILE
  // ══════════════════════════════════════════

  _bindEditProfileBtn() {
    document.getElementById('edit-profile-btn')?.addEventListener('click', () => {
      // Use the shared instance that owns the modal event listeners
      const sharedPage = this.app._sharedProfilePage;
      if (sharedPage) {
        sharedPage._profileUser = this._profileUser;
        sharedPage._openEditModal();
      } else {
        this._openEditModal();
      }
    });
  }

  _setupEditModalEvents() {
    // Avatar file input change
    const avatarInput = document.getElementById('edit-avatar-input');
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        this._newAvatarFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.getElementById('edit-avatar-img');
          if (img) img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    // Banner file input change
    const bannerInput = document.getElementById('edit-banner-input');
    if (bannerInput) {
      bannerInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        this._newBannerFile = file;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.getElementById('edit-banner-img');
          const ph  = document.getElementById('edit-banner-placeholder');
          if (img) { img.src = ev.target.result; img.style.display = 'block'; }
          if (ph)  ph.style.display = 'none';
        };
        reader.readAsDataURL(file);
      });
    }

    // Avatar wrap click → trigger input (stop propagation to avoid double trigger)
    document.getElementById('edit-avatar-wrap')?.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('edit-avatar-input')?.click();
      }
    });

    // Banner wrap click → trigger input
    document.getElementById('edit-banner-wrap')?.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT') {
        e.preventDefault();
        document.getElementById('edit-banner-input')?.click();
      }
    });

    // Bio char count
    document.getElementById('edit-bio')?.addEventListener('input', () => this._updateBioCount());

    // Save button
    document.getElementById('edit-profile-save')?.addEventListener('click', () => this._saveProfile());
    document.getElementById('edit-profile-cancel')?.addEventListener('click', () => this._closeEditModal());
    document.getElementById('edit-profile-close')?.addEventListener('click',  () => this._closeEditModal());
    document.getElementById('edit-profile-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('edit-profile-modal')) this._closeEditModal();
    });
  }

  _openEditModal() {
    const user = this.auth.getUser();
    if (!user) return;

    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    // Prefill fields
    const usernameEl = document.getElementById('edit-username');
    const bioEl      = document.getElementById('edit-bio');
    const avatarEl   = document.getElementById('edit-avatar-img');
    const bannerEl   = document.getElementById('edit-banner-img');
    const bannerPh   = document.getElementById('edit-banner-placeholder');

    if (usernameEl) usernameEl.value = user.username || '';
    if (bioEl)      bioEl.value      = this._profileUser?.bio || '';
    this._updateBioCount();

    if (avatarEl) {
      avatarEl.src = user.avatar_drive_id
        ? Utils.getCoverUrl(user.avatar_drive_id, 200)
        : 'assets/default-cover.png';
    }

    // Reset banner display
    if (bannerEl) {
      if (this._profileUser?.banner_drive_id) {
        bannerEl.src           = Utils.getCoverUrl(this._profileUser.banner_drive_id, 800);
        bannerEl.style.display = 'block';
        if (bannerPh) bannerPh.style.display = 'none';
      } else {
        bannerEl.style.display = 'none';
        if (bannerPh) bannerPh.style.display = 'flex';
      }
    }

    // Reset file refs & input values so user can re-pick same file
    this._newAvatarFile = null;
    this._newBannerFile = null;
    const avatarInput = document.getElementById('edit-avatar-input');
    const bannerInput = document.getElementById('edit-banner-input');
    if (avatarInput) avatarInput.value = '';
    if (bannerInput) bannerInput.value = '';

    // Reset error
    const errEl = document.getElementById('edit-profile-error');
    errEl?.classList.add('hidden');

    modal.classList.remove('hidden');
  }

  _updateBioCount() {
    const bioEl    = document.getElementById('edit-bio');
    const countEl  = document.getElementById('bio-char-count');
    if (bioEl && countEl) countEl.textContent = `${bioEl.value.length} / 200`;
  }

  _closeEditModal() {
    document.getElementById('edit-profile-modal')?.classList.add('hidden');
  }

  async _saveProfile() {
    const usernameEl = document.getElementById('edit-username');
    const bioEl      = document.getElementById('edit-bio');
    const errEl      = document.getElementById('edit-profile-error');
    const btn        = document.getElementById('edit-profile-save');
    const text       = btn?.querySelector('.btn-text');
    const spinner    = btn?.querySelector('.btn-spinner');

    const username = usernameEl?.value.trim();
    const bio      = bioEl?.value.trim();
    const user     = this.auth.getUser();

    if (!username) {
      if (errEl) { errEl.textContent = 'Username tidak boleh kosong.'; errEl.classList.remove('hidden'); }
      return;
    }

    if (btn) btn.disabled = true;
    text?.classList.add('hidden');
    spinner?.classList.remove('hidden');
    errEl?.classList.add('hidden');

    try {
      let avatarBase64 = null, avatarMime = null;
      let bannerBase64 = null, bannerMime = null;

      if (this._newAvatarFile) {
        avatarBase64 = await Utils.fileToBase64(this._newAvatarFile);
        avatarMime   = this._newAvatarFile.type;
      }
      if (this._newBannerFile) {
        bannerBase64 = await Utils.fileToBase64(this._newBannerFile);
        bannerMime   = this._newBannerFile.type;
      }

      const res = await this.api.updateProfile({
        userId: user.id,
        token:  this.auth.getToken(),
        username,
        bio,
        avatarBase64,
        avatarMime,
        bannerBase64,
        bannerMime,
      });

      if (res.success) {
        // Update local auth session
        const updated = res.user;
        this.auth._session.user = {
          ...this.auth._session.user,
          username:        updated.username,
          bio:             updated.bio,
          avatar_drive_id: updated.avatar_drive_id,
          banner_drive_id: updated.banner_drive_id,
        };
        this.auth._save();
        this.auth._notify(this.auth._session);

        Utils.showToast('✅ Profil berhasil diperbarui!', 'success');
        this._closeEditModal();

        // Refresh profile display
        this._profileUser = { ...this._profileUser, ...updated };
        document.getElementById('profile-username').textContent = updated.username || '';
        document.getElementById('profile-bio').textContent      = updated.bio      || '';

        // Update avatar in header
        const avatImg = document.getElementById('profile-avatar-img');
        if (avatImg && updated.avatar_drive_id) {
          avatImg.src = Utils.getCoverUrl(updated.avatar_drive_id, 200);
        }
        // Update banner
        if (updated.banner_drive_id) {
          const banner = document.getElementById('profile-banner');
          if (banner) { banner.src = Utils.getCoverUrl(updated.banner_drive_id, 1200); banner.style.display = 'block'; }
        }
      } else {
        if (errEl) { errEl.textContent = res.message; errEl.classList.remove('hidden'); }
      }
    } catch (e) {
      if (errEl) { errEl.textContent = 'Gagal menyimpan profil. Coba lagi.'; errEl.classList.remove('hidden'); }
    } finally {
      if (btn) btn.disabled = false;
      text?.classList.remove('hidden');
      spinner?.classList.add('hidden');
    }
  }

  // ══════════════════════════════════════════
  //  TAB EVENT BINDING
  // ══════════════════════════════════════════

  _bindTabEvents(container) {
    container.querySelectorAll('.page-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._switchTab(tab.dataset.tab);
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
