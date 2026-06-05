/* ============================================================
   STORAGE.JS — localStorage wrapper
   All data access goes through here. Change storage backend
   here without touching any other file.
   ============================================================ */

const STORAGE = {

  KEYS: {
    CLAUDE_KEY:   'kp_claude_key',
    OPENAI_KEY:   'kp_openai_key',
    USER_NAME:    'kp_user_name',
    MODE:         'kp_mode',
    HISTORY:      'kp_history',
    CALENDAR:     'kp_calendar',
    ONBOARDED:    'kp_onboarded',
  },

  // ── API KEYS ────────────────────────────────────────
  _cleanKey(key) {
    return (key || '').trim().replace(/\s+/g, '');
  },

  getClaudeKey()  { return this._cleanKey(localStorage.getItem(this.KEYS.CLAUDE_KEY)); },
  getOpenAIKey()  { return this._cleanKey(localStorage.getItem(this.KEYS.OPENAI_KEY)); },
  setClaudeKey(k) { localStorage.setItem(this.KEYS.CLAUDE_KEY, this._cleanKey(k)); },
  setOpenAIKey(k) { localStorage.setItem(this.KEYS.OPENAI_KEY, this._cleanKey(k)); },
  hasKeys() { return !!(this.getClaudeKey() && this.getOpenAIKey()); },

  // ── USER ────────────────────────────────────────────
  getUserName()  { return localStorage.getItem(this.KEYS.USER_NAME) || 'Gio'; },
  setUserName(n) { localStorage.setItem(this.KEYS.USER_NAME, n); },

  // ── MODE ────────────────────────────────────────────
  getMode()  { return localStorage.getItem(this.KEYS.MODE) || 'sports'; },
  setMode(m) { localStorage.setItem(this.KEYS.MODE, m); },

  // ── ONBOARDING ──────────────────────────────────────
  isOnboarded()    { return localStorage.getItem(this.KEYS.ONBOARDED) === 'true'; },
  setOnboarded()   { localStorage.setItem(this.KEYS.ONBOARDED, 'true'); },

  // ── HISTORY ─────────────────────────────────────────
  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.HISTORY) || '[]');
    } catch { return []; }
  },
  saveHistory(items) {
    localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(items));
  },
  addHistoryItem(item) {
    const items = this.getHistory();
    item.id = Date.now().toString();
    item.createdAt = new Date().toISOString();
    items.unshift(item); // newest first
    // Keep max 200 items
    if (items.length > 200) items.splice(200);
    this.saveHistory(items);
    return item;
  },
  deleteHistoryItem(id) {
    const items = this.getHistory().filter(i => i.id !== id);
    this.saveHistory(items);
  },
  updateHistoryItem(id, updates) {
    const items = this.getHistory();
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...updates };
      this.saveHistory(items);
    }
  },

  // ── CALENDAR ────────────────────────────────────────
  getCalendar() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.CALENDAR) || '[]');
    } catch { return []; }
  },
  saveCalendar(entries) {
    localStorage.setItem(this.KEYS.CALENDAR, JSON.stringify(entries));
  },
  addCalendarEntry(entry) {
    const entries = this.getCalendar();
    entry.id = Date.now().toString();
    entry.createdAt = new Date().toISOString();
    entries.push(entry);
    this.saveCalendar(entries);
    return entry;
  },
  deleteCalendarEntry(id) {
    const entries = this.getCalendar().filter(e => e.id !== id);
    this.saveCalendar(entries);
  },

  // ── STATS ───────────────────────────────────────────
  getStats() {
    const history  = this.getHistory();
    const calendar = this.getCalendar();
    const now      = new Date();
    const thisMonth = now.getMonth();
    const thisYear  = now.getFullYear();

    const posted = history.filter(i => {
      const d = new Date(i.createdAt);
      return i.status === 'posted' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const drafts = history.filter(i => !i.status || i.status === 'draft').length;
    const scheduled = calendar.filter(e => e.status === 'scheduled').length;

    return { posted, drafts, scheduled };
  },

  // ── NUKE ────────────────────────────────────────────
  clearAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  },
};
