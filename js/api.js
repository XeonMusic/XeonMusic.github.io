/**
 * XeonMusic — XeonAPI (class XeonAPI)
 * Semua komunikasi ke Google Apps Script backend
 * Developer: AlfandoXeon
 */
class XeonAPI {
  constructor(gasUrl) {
    this.baseUrl = gasUrl;
    // _isConfigured = true hanya jika URL sudah diisi (bukan placeholder)
    this._isConfigured = !!(gasUrl && gasUrl.startsWith('https://script.google.com'));
  }

  // ══════════════════════════════════════════
  //  BASE REQUEST METHODS
  // ══════════════════════════════════════════

  /**
   * HTTP GET — appends action + params as query string
   * @param {string} action
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async _get(action, params = {}) {
    if (!this._isConfigured) return this._mockError('-1');

    // Kirim sebagai POST tanpa Content-Type agar tidak trigger preflight CORS
    // GAS membaca body via e.postData.contents
    try {
      const payload = { action, ...params };
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
        // Sengaja TANPA header Content-Type → "simple request" → tidak perlu preflight
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`[XeonAPI GET ${action}]`, e);
      throw e;
    }
  }

  /**
   * HTTP POST — sends JSON body (tanpa Content-Type agar CORS simple request)
   * @param {string} action
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async _post(action, data = {}) {
    if (!this._isConfigured) return this._mockError('-1');

    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify({ action, ...data }),
        // Sengaja TANPA header Content-Type → tidak trigger preflight OPTIONS
        // GAS tetap menerima body via e.postData.contents
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`[XeonAPI POST ${action}]`, e);
      throw e;
    }
  }

  _mockError(msg) {
    console.warn('[XeonAPI]', msg);
    return { success: false, message: msg, data: [] };
  }

  // ══════════════════════════════════════════
  //  AUTH ENDPOINTS
  // ══════════════════════════════════════════

  /**
   * Login dengan email + password
   * Returns: { success, user: { id, username, email, role, avatar_drive_id }, token }
   */
  async login(email, password) {
    return this._post('login', { email, password });
  }

  /**
   * Registrasi user baru
   * Returns: { success, user, token }
   */
  async register(username, email, password) {
    return this._post('register', { username, email, password });
  }

  // ══════════════════════════════════════════
  //  SONG ENDPOINTS
  // ══════════════════════════════════════════

  /**
   * Ambil daftar semua lagu
   * Returns: { success, data: Song[] }
   */
  async getSongs(limit = 60, offset = 0, userId = null) {
    return this._get('getSongs', { limit, offset, userId });
  }

  /**
   * Ambil detail satu lagu by ID
   * Returns: { success, data: Song }
   */
  async getSong(id) {
    return this._get('getSong', { id });
  }

  /**
   * Ambil top lagu berdasarkan play_count
   * Returns: { success, data: Song[] }
   */
  async getTopSongs(limit = 10, userId = null) {
    return this._get('getTopSongs', { limit, userId });
  }

  /**
   * Ambil lagu terbaru berdasarkan uploaded_at
   * Returns: { success, data: Song[] }
   */
  async getNewReleases(limit = 10, userId = null) {
    return this._get('getNewReleases', { limit, userId });
  }

  /**
   * Cari lagu berdasarkan query
   * Returns: { success, data: Song[] }
   */
  async searchSongs(q, userId = null) {
    return this._get('searchSongs', { q, userId });
  }

  /**
   * Ambil artis unik dengan jumlah lagu
   * Returns: { success, data: Artist[] }
   */
  async getTopArtists(limit = 8) {
    return this._get('getTopArtists', { limit });
  }

  /**
   * Upload lagu baru (audio + thumbnail ke GDrive, metadata ke Sheets)
   * @param {Object} data - { title, artist, album, genre, userId, token,
   *                          audioBase64, audioMime, audioName,
   *                          coverBase64, coverMime, coverName }
   * Returns: { success, songId, message }
   */
  async uploadSong(data) {
    return this._post('uploadSong', data);
  }

  // ══════════════════════════════════════════
  //  INTERACTION ENDPOINTS
  // ══════════════════════════════════════════

  /**
   * Toggle like pada lagu
   * Returns: { success, liked: boolean, likeCount: number }
   */
  async likeSong(songId, userId, token) {
    return this._post('likeSong', { songId, userId, token });
  }

  /**
   * Ambil semua lagu yang dilike oleh user
   * Returns: { success, data: string[] (songIds) }
   */
  async getLikes(userId) {
    return this._get('getLikes', { userId });
  }

  /**
   * Tambah komentar pada lagu
   * Returns: { success, comment }
   */
  async addComment(songId, userId, content, token) {
    return this._post('addComment', { songId, userId, content, token });
  }

  /**
   * Ambil semua komentar lagu
   * Returns: { success, data: Comment[] }
   */
  async getComments(songId) {
    return this._get('getComments', { songId });
  }

  /**
   * Tambah 1 ke play_count lagu
   * Returns: { success }
   */
  async incrementPlay(songId) {
    return this._post('incrementPlay', { songId });
  }

  /**
   * Catat download dan return audio URL
   * Returns: { success }
   */
  async downloadSong(songId, userId, token) {
    return this._post('downloadSong', { songId, userId, token });
  }

  // ══════════════════════════════════════════
  //  USER ENDPOINTS
  // ══════════════════════════════════════════

  /**
   * Ambil profil + uploads + likes user
   * Returns: { success, data: { user, uploads: Song[], likes: Song[] } }
   */
  async getUserProfile(userId) {
    return this._get('getUserProfile', { id: userId });
  }
}
