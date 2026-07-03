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
    this._session    = this.getSession(); // cached session reference
  }

  // ══════════════════════════════════════════
  //  SESSION MANAGEMENT
  // ══════════════════════════════════════════

  /** Ambil sesi yang tersimpan dari localStorage */
  getSession() {
    try {
      const raw = localStorage.getItem(this._storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed) this._session = parsed;
      return parsed;
    } catch {
      return null;
    }
  }

  /** Simpan sesi ke localStorage dan notifikasi listener */
  setSession(user, token) {
    this._session = {
      user,
      token,
      loginAt: new Date().toISOString(),
    };
    this._save();
    this._notify(this._session);
  }

  /** Simpan _session saat ini ke localStorage (untuk update parsial) */
  _save() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this._session));
    } catch (e) {
      console.warn('[AuthManager] Failed to save session:', e);
    }
  }

  /** Hapus sesi dan notifikasi listener */
  clearSession() {
    this._session = null;
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

  logout() {
    this.clearSession();
    Utils.showToast('Berhasil keluar 👋', 'info');
  }

  // ══════════════════════════════════════════
  //  LISTENER / OBSERVER PATTERN
  // ══════════════════════════════════════════

  onChange(fn) {
    this._listeners.push(fn);
  }

  _notify(session) {
    this._listeners.forEach(fn => {
      try { fn(session); } catch (e) { console.warn('[AuthManager] listener error:', e); }
    });
  }
}
