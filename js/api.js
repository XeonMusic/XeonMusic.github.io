/**
 * XeonMusic — XeonAPI (class XeonAPI)
 * Semua komunikasi ke Google Apps Script backend
 * Developer: AlfandoXeon
 */
class XeonAPI {
  constructor(gasUrl) {
    this.baseUrl = gasUrl;
    this._isConfigured = !!(gasUrl && gasUrl.startsWith('https://script.google.com'));
  }

  // ══════════════════════════════════════════
  //  BASE REQUEST METHODS
  // ══════════════════════════════════════════

  async _get(action, params = {}) {
    if (!this._isConfigured) return this._mockError('-1');
    try {
      const payload = { action, ...params };
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error(`[XeonAPI GET ${action}]`, e);
      throw e;
    }
  }

  async _post(action, data = {}) {
    if (!this._isConfigured) return this._mockError('-1');
    try {
      const res = await fetch(this.baseUrl, {
        method: 'POST',
        body: JSON.stringify({ action, ...data }),
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

  async login(email, password) {
    return this._post('login', { email, password });
  }

  async register(username, email, password) {
    return this._post('register', { username, email, password });
  }

  // ══════════════════════════════════════════
  //  SONG ENDPOINTS
  // ══════════════════════════════════════════

  async getSongs(limit = 60, offset = 0, userId = null) {
    return this._get('getSongs', { limit, offset, userId });
  }

  async getSong(id) {
    return this._get('getSong', { id });
  }

  async getTopSongs(limit = 10, userId = null) {
    return this._get('getTopSongs', { limit, userId });
  }

  async getNewReleases(limit = 10, userId = null) {
    return this._get('getNewReleases', { limit, userId });
  }

  async searchSongs(q, userId = null) {
    return this._get('searchSongs', { q, userId });
  }

  async getTopArtists(limit = 8) {
    return this._get('getTopArtists', { limit });
  }

  async uploadSong(data) {
    return this._post('uploadSong', data);
  }

  /**
   * Hapus lagu milik user
   * Returns: { success, message }
   */
  async deleteSong(songId, userId, token) {
    return this._post('deleteSong', { songId, userId, token });
  }

  // ══════════════════════════════════════════
  //  INTERACTION ENDPOINTS
  // ══════════════════════════════════════════

  async likeSong(songId, userId, token) {
    return this._post('likeSong', { songId, userId, token });
  }

  async getLikes(userId) {
    return this._get('getLikes', { userId });
  }

  async addComment(songId, userId, content, token) {
    return this._post('addComment', { songId, userId, content, token });
  }

  async getComments(songId) {
    return this._get('getComments', { songId });
  }

  async incrementPlay(songId) {
    return this._post('incrementPlay', { songId });
  }

  async downloadSong(songId, userId, token) {
    return this._post('downloadSong', { songId, userId, token });
  }

  // ══════════════════════════════════════════
  //  USER ENDPOINTS
  // ══════════════════════════════════════════

  /**
   * Ambil profil + uploads + likes user
   * Returns: { success, data: { user, uploads, likes, followerCount, followingCount, viewerIsFollowing, isFriend } }
   */
  async getUserProfile(userId, viewerId = null) {
    return this._get('getUserProfile', { id: userId, viewerId });
  }

  /**
   * Update profil user (bio, username, foto, banner)
   * Returns: { success, user }
   */
  async updateProfile(data) {
    return this._post('updateProfile', data);
  }

  // ══════════════════════════════════════════
  //  FOLLOW ENDPOINTS
  // ══════════════════════════════════════════

  /**
   * Toggle follow user lain
   * Returns: { success, following: boolean, isFriend: boolean }
   */
  async followUser(targetId, userId, token) {
    return this._post('followUser', { targetId, userId, token });
  }

  /**
   * Ambil daftar followers & following user
   * Returns: { success, data: { followers, following, followingIds, followerIds } }
   */
  async getFollows(userId) {
    return this._get('getFollows', { userId });
  }

  // ══════════════════════════════════════════
  //  NOTIFICATION ENDPOINTS
  // ══════════════════════════════════════════

  /**
   * Ambil notifikasi user
   * Returns: { success, data: Notification[], unreadCount }
   */
  async getNotifications(userId, token) {
    return this._get('getNotifications', { userId, token });
  }

  /**
   * Tandai semua notifikasi sebagai sudah dibaca
   * Returns: { success }
   */
  async markNotificationsRead(userId, token) {
    return this._post('markNotificationsRead', { userId, token });
  }
}
