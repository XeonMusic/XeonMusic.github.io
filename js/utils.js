/**
 * XeonMusic — Utils (class Utils)
 * Static helper functions used throughout the app
 * Developer: AlfandoXeon
 */
class Utils {

  // ── Format seconds to M:SS string ──
  static formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Format ISO date string to relative time ──
  static formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const sec = Math.floor((now - d) / 1000);
      if (sec < 60) return 'baru saja';
      if (sec < 3600) return `${Math.floor(sec / 60)} menit lalu`;
      if (sec < 86400) return `${Math.floor(sec / 3600)} jam lalu`;
      if (sec < 2592000) return `${Math.floor(sec / 86400)} hari lalu`;
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ''; }
  }

  // ── Generate a unique ID string ──
  static generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // ── Show a toast notification ──
  static showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>`,
      error: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E41629" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
      info: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      warning: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `${icons[type] || ''}  <span>${message}</span>`;
    container.appendChild(toast);

    const remove = () => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 280);
    };

    toast.addEventListener('click', remove);
    const timer = setTimeout(remove, duration);
    toast.addEventListener('mouseenter', () => clearTimeout(timer));
  }

  // ── Get a Google Drive thumbnail URL for cover art ──
  static getCoverUrl(driveId, size = 400) {
    if (!driveId) return 'assets/default-cover.png';
    return `https://drive.google.com/thumbnail?id=${encodeURIComponent(driveId)}&sz=w${size}`;
  }

  // ── Get a Google Drive direct download/stream URL ──
  // ── Get a Google Drive direct stream URL via API ──
  static getAudioUrl(driveId) {
    if (!driveId) return '';
    // Ganti dengan API Key kamu sendiri!
    const API_KEY = 'AIzaSyDEY84UWmPuZZ4UTLdJsfrTOAwjp9IsPqg';
    return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveId)}?alt=media&key=${API_KEY}`;
  }


  // ── Debounce a function call ──
  static debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ── Sanitize string for safe innerHTML insertion ──
  static sanitize(str) {
    if (!str) return '';
    const el = document.createElement('div');
    el.textContent = String(str);
    return el.innerHTML;
  }

  // ── Get initials from a display name ──
  static getInitials(name) {
    if (!name) return '?';
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // ── Format large numbers (1200 → 1.2K) ──
  static formatCount(n) {
    const num = Number(n);
    if (!num || isNaN(num)) return '0';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
  }

  // ── Render a row of skeleton placeholder cards ──
  static renderSkeletons(container, count = 6) {
    container.innerHTML = Array.from({ length: count }, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-cover"></div>
        <div class="skeleton-info">
          <div class="skeleton skeleton-line skeleton-line--medium"></div>
          <div class="skeleton skeleton-line skeleton-line--short"></div>
        </div>
      </div>
    `).join('');
  }

  // ── Convert a File object to base64 encoded string ──
  static fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ── Clamp a number between min and max ──
  static clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  }
}
