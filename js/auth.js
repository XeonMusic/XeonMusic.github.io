/**
 * XeonMusic — AuthManager (class AuthManager)
 * Mengelola sesi user, login, register, logout via localStorage
 * Developer: AlfandoXeon
 */
class AuthManager {
  constructor(api) {
    this.api         = api;
    this._storageKey = 'xeon_session_v1';
    this._listeners  = [];
  }

  // ══════════════════════════════════════════
  //  SESSION MANAGEMENT
  // ══════════════════════════════════════════

  /** Ambil sesi yang tersimpan dari localStorage */
  getSession() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /** Simpan sesi ke localStorage dan notifikasi listener */
  setSession(user, token) {
    const session = {
      user,
      token,
      loginAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(session));
    } catch (e) {
      console.warn('[AuthManager] Failed to save session:', e);
    }
    this._notify(session);
  }

  /** Hapus sesi dan notifikasi listener */
  clearSession() {
    localStorage.removeItem(this._storageKey);
    this._notify(null);
  }

  /** Cek apakah user sedang login */
  isLoggedIn() {
    return !!this.getSession();
  }

  /** Dapatkan objek user saat ini */
  getUser() {
    return this.getSession()?.user ?? null;
  }

  /** Dapatkan token autentikasi */
  getToken() {
    return this.getSession()?.token ?? null;
  }

  // ══════════════════════════════════════════
  //  AUTH ACTIONS
  // ══════════════════════════════════════════

  /**
   * Login dengan email + password
   * @returns {{ success: boolean, user?: Object, message?: string }}
   */
  async login(email, password) {
    try {
      const res = await this.api.login(email, password);
      if (res.success) {
        this.setSession(res.user, res.token);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Email atau password salah.' };
    } catch (e) {
      console.error('[AuthManager.login]', e);
      return { success: false, message: 'Koneksi gagal. Periksa internet kamu.' };
    }
  }

  /**
   * Registrasi user baru
   * @returns {{ success: boolean, user?: Object, message?: string }}
   */
  async register(username, email, password) {
    if (!username || !email || !password) {
      return { success: false, message: 'Semua field wajib diisi.' };
    }
    try {
      const res = await this.api.register(username, email, password);
      if (res.success) {
        this.setSession(res.user, res.token);
        return { success: true, user: res.user };
      }
      return { success: false, message: res.message || 'Registrasi gagal. Coba lagi.' };
    } catch (e) {
      console.error('[AuthManager.register]', e);
      return { success: false, message: 'Koneksi gagal. Periksa internet kamu.' };
    }
  }

  /** Logout: hapus sesi dan tampilkan toast */
  logout() {
    this.clearSession();
    Utils.showToast('Berhasil keluar 👋', 'info');
  }

  // ══════════════════════════════════════════
  //  LISTENER / OBSERVER PATTERN
  // ══════════════════════════════════════════

  /**
   * Daftarkan callback yang dipanggil saat sesi berubah
   * @param {Function} fn - dipanggil dengan (session | null)
   */
  onChange(fn) {
    this._listeners.push(fn);
  }

  _notify(session) {
    this._listeners.forEach(fn => {
      try { fn(session); } catch (e) { console.warn('[AuthManager] listener error:', e); }
    });
  }
}
