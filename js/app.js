/**
 * XeonMusic — App (class App)
 * Entry point, router, auth modal, comment modal, player controls
 * Developer: AlfandoXeon
 *
 * ⚠️  SETUP REQUIRED:
 *     Ganti GAS_URL di bawah ini dengan URL Google Apps Script
 *     setelah deploy backend (Fase 3).
 */

// ════════════════════════════════════════════
//  CONFIGURATION
// ════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzM92w47bfgaJNUnYec7nKeXnrIxCvIK2UlV2HPS0HoJZrWRx3MKemPe4nSdtGuObCb/exec'

// ════════════════════════════════════════════
//  MAIN APP CLASS
// ════════════════════════════════════════════
class App {
  constructor() {
    // Core services
    this.api = new XeonAPI(GAS_URL);
    this.auth = new AuthManager(this.api);
    this.player = new MusicPlayer(this.api, this.auth);

    // Page factory map
    this.pages = {
      landing: () => new LandingPage(this),
      library: () => new LibraryPage(this),
      upload: () => new UploadPage(this),
      profile: () => new ProfilePage(this),
    };

    this.currentPage = null;
    this._commentSong = null;
  }

  // ══════════════════════════════════════════
  //  INITIALIZATION
  // ══════════════════════════════════════════

  init() {
    this._setupNavbar();
    this._setupAuthModal();
    this._setupCommentModal();
    this._setupPlayerControls();
    this.player.bindProgressBar();

    // Listen for auth state changes → update navbar
    this.auth.onChange((session) => this._onAuthChange(session));

    // Initial render based on URL hash
    this._handleRoute();
    window.addEventListener('hashchange', () => this._handleRoute());

    // Global search bar in navbar
    document.getElementById('search-input')?.addEventListener(
      'input',
      Utils.debounce((e) => {
        const q = e.target.value.trim();
        if (q.length > 1) this.navigate('library', { filter: q });
      }, 380)
    );

    console.log('[XeonMusic] App initialized ✅');
  }

  // ══════════════════════════════════════════
  //  ROUTING (Hash-based SPA)
  // ══════════════════════════════════════════

  _handleRoute() {
    const raw = window.location.hash.replace('#/', '') || 'home';
    const page = raw.split('?')[0];
    this.navigate(page === 'home' ? 'landing' : page, {}, false);
  }

  /**
   * Navigate to a page
   * @param {string} pageName
   * @param {Object} opts  - optional options passed to page.render()
   * @param {boolean} pushHash - whether to update the URL hash
   */
  navigate(pageName, opts = {}, pushHash = true) {
    const content = document.getElementById('main-content');
    if (!content) return;

    // Validate page name
    if (!this.pages[pageName]) {
      console.warn('[App] Unknown page:', pageName);
      pageName = 'landing';
    }

    // Update URL hash
    if (pushHash) {
      const hashName = pageName === 'landing' ? 'home' : pageName;
      const newHash = `#/${hashName}`;
      if (window.location.hash !== newHash) {
        window.history.pushState(null, '', newHash);
      }
    }

    // Update active nav buttons
    document.querySelectorAll('.nav-btn, .dropdown-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-page="${pageName}"]`).forEach(b => b.classList.add('active'));

    // Close any open dropdown
    document.getElementById('user-dropdown')?.classList.add('hidden');

    // Render page
    const PageClass = this.pages[pageName];
    const page = PageClass();
    this.currentPage = page;

    content.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = 'fade-in';
    content.appendChild(wrapper);

    try {
      const result = page.render(wrapper, opts);
      if (result instanceof Promise) {
        result.catch(e => console.error('[App] Page render error:', e));
      }
    } catch (e) {
      console.error('[App] Sync render error:', e);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ══════════════════════════════════════════
  //  AUTH MODAL
  // ══════════════════════════════════════════

  showAuth(tab = 'login') {
    const modal = document.getElementById('auth-modal');
    const loginWrap = document.getElementById('login-form-wrap');
    const registerWrap = document.getElementById('register-form-wrap');
    if (!modal) return;

    loginWrap?.classList.toggle('hidden', tab !== 'login');
    registerWrap?.classList.toggle('hidden', tab !== 'register');
    modal.classList.remove('hidden');

    // Focus first visible input after animation
    setTimeout(() => {
      modal.querySelector('input:not([type="hidden"])')?.focus();
    }, 120);
  }

  _hideAuth() {
    document.getElementById('auth-modal')?.classList.add('hidden');
  }

  _setupAuthModal() {
    const modal = document.getElementById('auth-modal');

    // Close button & backdrop click
    document.getElementById('auth-modal-close')?.addEventListener('click', () => this._hideAuth());
    modal?.addEventListener('click', (e) => { if (e.target === modal) this._hideAuth(); });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this._hideAuth();
        document.getElementById('comment-modal')?.classList.add('hidden');
      }
    });

    // Switch between login / register
    document.getElementById('switch-to-register')?.addEventListener('click', () => this.showAuth('register'));
    document.getElementById('switch-to-login')?.addEventListener('click', () => this.showAuth('login'));
    document.getElementById('continue-as-guest')?.addEventListener('click', () => {
      this._hideAuth();
      this.navigate('library');
    });

    // ── Login form ──
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email')?.value.trim();
      const password = document.getElementById('login-password')?.value;
      const errEl = document.getElementById('login-error');
      const btn = document.getElementById('login-submit');
      const text = btn?.querySelector('.btn-text');
      const spinner = btn?.querySelector('.btn-spinner');

      if (!email || !password) { errEl.textContent = 'Email dan password wajib diisi.'; errEl.classList.remove('hidden'); return; }

      if (btn) btn.disabled = true;
      text?.classList.add('hidden');
      spinner?.classList.remove('hidden');
      errEl?.classList.add('hidden');

      const res = await this.auth.login(email, password);

      if (btn) btn.disabled = false;
      text?.classList.remove('hidden');
      spinner?.classList.add('hidden');

      if (res.success) {
        this._hideAuth();
        Utils.showToast(`👋 Selamat datang, ${res.user.username}!`, 'success');
        this.navigate('landing');
      } else {
        if (errEl) { errEl.textContent = res.message; errEl.classList.remove('hidden'); }
      }
    });

    // ── Register form ──
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username')?.value.trim();
      const email = document.getElementById('reg-email')?.value.trim();
      const password = document.getElementById('reg-password')?.value;
      const errEl = document.getElementById('register-error');
      const btn = document.getElementById('register-submit');
      const text = btn?.querySelector('.btn-text');
      const spinner = btn?.querySelector('.btn-spinner');

      if (!username || !email || !password) {
        if (errEl) { errEl.textContent = 'Semua field wajib diisi.'; errEl.classList.remove('hidden'); }
        return;
      }

      if (btn) btn.disabled = true;
      text?.classList.add('hidden');
      spinner?.classList.remove('hidden');
      errEl?.classList.add('hidden');

      const res = await this.auth.register(username, email, password);

      if (btn) btn.disabled = false;
      text?.classList.remove('hidden');
      spinner?.classList.add('hidden');

      if (res.success) {
        this._hideAuth();
        Utils.showToast(`🎉 Akun berhasil dibuat! Selamat datang, ${res.user.username}!`, 'success');
        this.navigate('landing');
      } else {
        if (errEl) { errEl.textContent = res.message; errEl.classList.remove('hidden'); }
      }
    });
  }

  // ══════════════════════════════════════════
  //  COMMENT MODAL
  // ══════════════════════════════════════════

  async openComments(song) {
    this._commentSong = song;
    const modal = document.getElementById('comment-modal');
    if (!modal) return;

    // Song info header
    const infoEl = document.getElementById('comment-song-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <img class="comment-song-cover"
             src="${Utils.getCoverUrl(song.cover_drive_id)}"
             alt="${Utils.sanitize(song.title)}"
             onerror="this.src='assets/default-cover.png'">
        <div>
          <div class="comment-song-title">${Utils.sanitize(song.title)}</div>
          <div class="comment-song-artist">${Utils.sanitize(song.artist)}</div>
        </div>
      `;
    }

    // Show or hide comment form
    const commentForm = document.getElementById('comment-form');
    const loginPrompt = document.getElementById('comment-login-prompt');
    const commentInput = document.getElementById('comment-input');
    if (this.auth.isLoggedIn()) {
      commentForm?.classList.remove('hidden');
      loginPrompt?.classList.add('hidden');
      if (commentInput) commentInput.value = '';
    } else {
      commentForm?.classList.add('hidden');
      loginPrompt?.classList.remove('hidden');
    }

    modal.classList.remove('hidden');
    await this._loadComments(song.id);
  }

  async _loadComments(songId) {
    const list = document.getElementById('comment-list');
    if (!list) return;
    list.innerHTML = `<div class="comment-empty">⏳ Memuat komentar...</div>`;

    try {
      const res = await this.api.getComments(songId);
      const comments = res.data || [];

      if (!comments.length) {
        list.innerHTML = `<div class="comment-empty">Belum ada komentar. Jadilah yang pertama! 💬</div>`;
        return;
      }

      list.innerHTML = comments.map(c => `
        <div class="comment-item">
          <div class="comment-avatar" aria-hidden="true">${Utils.getInitials(c.username)}</div>
          <div class="comment-body">
            <div class="comment-username">${Utils.sanitize(c.username)}</div>
            <div class="comment-text">${Utils.sanitize(c.content)}</div>
            <div class="comment-time">${Utils.formatDate(c.created_at)}</div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      list.innerHTML = `<div class="comment-empty">Gagal memuat komentar.</div>`;
    }
  }

  _setupCommentModal() {
    const modal = document.getElementById('comment-modal');
    document.getElementById('comment-modal-close')?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    // Comment login redirect
    document.getElementById('comment-login-btn')?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      this.showAuth('login');
    });

    // Comment submit
    document.getElementById('comment-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!this._commentSong) return;
      const input = document.getElementById('comment-input');
      const content = input?.value.trim();
      if (!content) return;

      const user = this.auth.getUser();
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      try {
        const res = await this.api.addComment(
          this._commentSong.id, user.id, content, this.auth.getToken()
        );
        if (res.success) {
          if (input) input.value = '';
          Utils.showToast('💬 Komentar terkirim!', 'success');
          await this._loadComments(this._commentSong.id);
        } else {
          Utils.showToast(res.message || 'Gagal kirim komentar', 'error');
        }
      } catch {
        Utils.showToast('Gagal kirim komentar. Periksa koneksi.', 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  // ══════════════════════════════════════════
  //  NAVBAR
  // ══════════════════════════════════════════

  _setupNavbar() {
    // Brand → home
    document.getElementById('nav-home-logo')?.addEventListener('click', () => this.navigate('landing'));
    document.getElementById('nav-home-logo')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') this.navigate('landing');
    });

    // All [data-page] buttons
    document.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.page));
    });

    // Avatar dropdown toggle
    const dropdown = document.getElementById('user-dropdown');
    document.getElementById('user-avatar')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.toggle('hidden');
    });
    document.addEventListener('click', () => dropdown?.classList.add('hidden'));

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      this.auth.logout();
      dropdown?.classList.add('hidden');
      this.navigate('landing');
    });

    // Login / Register buttons in navbar
    document.getElementById('auth-login-btn')?.addEventListener('click', () => this.showAuth('login'));
    document.getElementById('auth-register-btn')?.addEventListener('click', () => this.showAuth('register'));

    // Apply current auth state to navbar
    this._onAuthChange(this.auth.getSession());
  }

  _onAuthChange(session) {
    const user = session?.user;
    const loginBtn = document.getElementById('auth-login-btn');
    const registerBtn = document.getElementById('auth-register-btn');
    const avatarWrap = document.getElementById('user-avatar-wrap');
    const uploadBtn = document.getElementById('nav-upload-btn');
    const avatar = document.getElementById('user-avatar');
    const usernameEl = document.getElementById('dropdown-username');

    if (user) {
      loginBtn?.classList.add('hidden');
      registerBtn?.classList.add('hidden');
      avatarWrap?.classList.remove('hidden');
      uploadBtn?.classList.remove('nav-btn--hidden');

      if (avatar) {
        avatar.src = user.avatar_drive_id ? Utils.getCoverUrl(user.avatar_drive_id, 100) : 'assets/default-cover.png';
        avatar.onerror = () => { avatar.src = 'assets/default-cover.png'; };
      }
      if (usernameEl) usernameEl.textContent = user.username;
    } else {
      loginBtn?.classList.remove('hidden');
      registerBtn?.classList.remove('hidden');
      avatarWrap?.classList.add('hidden');
      uploadBtn?.classList.add('nav-btn--hidden');
    }
  }

  // ══════════════════════════════════════════
  //  PLAYER CONTROLS
  // ══════════════════════════════════════════

  _setupPlayerControls() {
    document.getElementById('player-play')?.addEventListener('click', () => this.player.togglePlay());
    document.getElementById('player-next')?.addEventListener('click', () => this.player.next());
    document.getElementById('player-prev')?.addEventListener('click', () => this.player.prev());
    document.getElementById('player-shuffle')?.addEventListener('click', () => this.player.toggleShuffle());
    document.getElementById('player-loop')?.addEventListener('click', () => this.player.toggleLoop());

    document.getElementById('volume-slider')?.addEventListener('input', (e) => {
      this.player.setVolume(Number(e.target.value));
    });

    // Like from player bar
    document.getElementById('player-like-btn')?.addEventListener('click', async () => {
      if (!this.auth.isLoggedIn()) { this.showAuth('login'); return; }
      const song = this.player.currentSong();
      if (!song) return;
      const btn = document.getElementById('player-like-btn');
      const user = this.auth.getUser();
      btn.classList.add('liked-anim');
      btn.addEventListener('animationend', () => btn.classList.remove('liked-anim'), { once: true });
      try {
        const res = await this.api.likeSong(song.id, user.id, this.auth.getToken());
        btn.classList.toggle('liked', !!res.liked);
        Utils.showToast(res.liked ? '❤️ Disukai!' : 'Dihapus dari favorit', 'success');
      } catch {
        Utils.showToast('Gagal. Coba lagi.', 'error');
      }
    });
  }
}

// ════════════════════════════════════════════
//  BOOTSTRAP
// ════════════════════════════════════════════
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
