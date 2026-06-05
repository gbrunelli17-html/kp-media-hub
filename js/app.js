/* ============================================================
   APP.JS — core shell controller
   Handles: navigation, mode toggle, onboarding, settings,
            toast notifications, topbar titles
   ============================================================ */

const APP = {

  // Screen metadata — eyebrow + title per screen
  SCREENS: {
    dashboard: { eyebrow: 'Home',           title: () => `Good ${APP._greeting()}, ${STORAGE.getUserName()}` },
    caption:   { eyebrow: 'Caption Studio', title: () => 'Write a post'   },
    image:     { eyebrow: 'Image Studio',   title: () => 'Build & generate' },
    calendar:  { eyebrow: 'Calendar',       title: () => 'Plan your content' },
    history:   { eyebrow: 'Post History',   title: () => 'All your drafts'   },
  },

  currentScreen: 'dashboard',
  currentMode: 'sports',

  // ── INIT ────────────────────────────────────────────
  init() {
    this.currentMode = STORAGE.getMode();
    this._applyMode(this.currentMode);

    // Wire sidebar nav buttons
    document.querySelectorAll('.sb-btn[data-screen]').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.screen));
    });

    // Wire vibe pills
    document.querySelectorAll('#vibe-pills .vibe-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('#vibe-pills .vibe-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });

    // Wire tone slider readout
    const toneSlider = document.getElementById('cap-tone');
    if (toneSlider) {
      toneSlider.addEventListener('input', () => {
        document.getElementById('tone-readout').textContent = `${toneSlider.value}% hype`;
      });
    }

    // Wire image preset buttons
    document.querySelectorAll('#img-presets .preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#img-presets .preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Wire image format buttons
    document.querySelectorAll('#img-formats .format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#img-formats .format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    this.navigate('dashboard');
  },

  // ── NAVIGATION ──────────────────────────────────────
  navigate(screenName) {
    if (!this.SCREENS[screenName]) return;

    // Hide all screens, deactivate all nav buttons
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sb-btn[data-screen]').forEach(b => b.classList.remove('active'));

    // Show target screen + activate nav button
    document.getElementById(`screen-${screenName}`)?.classList.add('active');
    document.querySelector(`.sb-btn[data-screen="${screenName}"]`)?.classList.add('active');

    // Update topbar
    const meta = this.SCREENS[screenName];
    document.getElementById('topbar-eyebrow').textContent = meta.eyebrow;
    document.getElementById('topbar-title').textContent   = meta.title();

    this.currentScreen = screenName;

    // Trigger screen-specific refresh
    if (screenName === 'dashboard') DASHBOARD.refresh();
    if (screenName === 'history')   HISTORY.render();
    if (screenName === 'calendar')  CALENDAR.render();
  },

  // ── MODE TOGGLE ─────────────────────────────────────
  setMode(mode) {
    this.currentMode = mode;
    STORAGE.setMode(mode);
    this._applyMode(mode);

    // Refresh dashboard stats
    if (this.currentScreen === 'dashboard') DASHBOARD.refresh();
  },

  _applyMode(mode) {
    const btnSports = document.querySelector('.mode-btn.mode-sports');
    const btnSchool = document.querySelector('.mode-btn.mode-school');
    if (mode === 'sports') {
      btnSports?.classList.add('active');
      btnSchool?.classList.remove('active');
    } else {
      btnSchool?.classList.add('active');
      btnSports?.classList.remove('active');
    }

    // Update dashboard mode stat
    const statMode    = document.getElementById('stat-mode');
    const statModeSub = document.getElementById('stat-mode-sub');
    if (statMode) statMode.textContent = mode === 'sports' ? 'Sports' : 'School';
    if (statModeSub) statModeSub.textContent = mode === 'sports' ? 'game-day energy' : 'clean & informational';
  },

  // ── ONBOARDING ──────────────────────────────────────
  saveKeys() {
    const claudeKey = document.getElementById('ob-claude-key').value.trim();
    const openaiKey = document.getElementById('ob-openai-key').value.trim();

    if (!claudeKey || !openaiKey) {
      APP.toast('Both API keys are required.', 'error');
      return;
    }
    if (!claudeKey.startsWith('sk-ant-')) {
      APP.toast('Claude key should start with sk-ant-', 'error');
      return;
    }
    if (!openaiKey.startsWith('sk-')) {
      APP.toast('OpenAI key should start with sk-', 'error');
      return;
    }

    STORAGE.setClaudeKey(claudeKey);
    STORAGE.setOpenAIKey(openaiKey);
    STORAGE.setOnboarded();

    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    APP.init();
  },

  // ── SETTINGS ────────────────────────────────────────
  openSettings() {
    document.getElementById('settings-claude-key').value = STORAGE.getClaudeKey();
    document.getElementById('settings-openai-key').value = STORAGE.getOpenAIKey();
    document.getElementById('settings-name').value = STORAGE.getUserName();
    document.getElementById('settings-overlay').classList.remove('hidden');
    document.getElementById('settings-panel').classList.remove('hidden');
  },

  closeSettings() {
    document.getElementById('settings-overlay').classList.add('hidden');
    document.getElementById('settings-panel').classList.add('hidden');
  },

  updateKeys() {
    const claudeKey = document.getElementById('settings-claude-key').value.trim();
    const openaiKey = document.getElementById('settings-openai-key').value.trim();
    if (claudeKey) STORAGE.setClaudeKey(claudeKey);
    if (openaiKey) STORAGE.setOpenAIKey(openaiKey);
    APP.toast('Keys saved.', 'success');
    this.closeSettings();
  },

  saveName() {
    const name = document.getElementById('settings-name').value.trim();
    if (name) {
      STORAGE.setUserName(name);
      document.getElementById('sb-initials').textContent = name.slice(0,2).toUpperCase();
      APP.toast('Name saved.', 'success');
      this.closeSettings();
      if (this.currentScreen === 'dashboard') DASHBOARD.refresh();
    }
  },

  clearData() {
    if (confirm('Delete all saved posts, drafts, and calendar entries? API keys will be kept.')) {
      STORAGE.saveHistory([]);
      STORAGE.saveCalendar([]);
      APP.toast('Data cleared.', 'success');
      this.closeSettings();
      if (this.currentScreen === 'dashboard') DASHBOARD.refresh();
    }
  },

  // ── TOAST ───────────────────────────────────────────
  _toastTimer: null,
  toast(message, type = '') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast ${type}`;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
  },

  // ── HELPERS ─────────────────────────────────────────
  _greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  },
};

// ── DASHBOARD controller (lives here, simple enough) ──
const DASHBOARD = {
  refresh() {
    const stats = STORAGE.getStats();
    document.getElementById('stat-posts').textContent     = stats.posted;
    document.getElementById('stat-drafts').textContent    = stats.drafts;
    document.getElementById('stat-scheduled').textContent = stats.scheduled;
    document.getElementById('qc-draft-count').textContent = `${stats.drafts} saved item${stats.drafts !== 1 ? 's' : ''}`;

    // Update mode display
    APP._applyMode(APP.currentMode);

    // Topbar title with name
    document.getElementById('topbar-title').textContent = APP.SCREENS.dashboard.title();

    // Upcoming posts from calendar
    const upcoming = STORAGE.getCalendar()
      .filter(e => e.status !== 'posted' && e.date >= new Date().toISOString().slice(0,10))
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    const list = document.getElementById('upcoming-list');
    if (upcoming.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="ti ti-calendar-off"></i>
          <p>No upcoming posts yet.</p>
          <button onclick="APP.navigate('calendar')">Add your first post</button>
        </div>`;
      return;
    }

    list.innerHTML = upcoming.map(e => `
      <div class="upcoming-item">
        <div class="upcoming-dot dot-${e.mode}"></div>
        <div class="upcoming-name">${e.title}</div>
        <div class="chip chip-${e.mode}">${e.mode}</div>
        <div class="upcoming-date">${APP._formatDate(e.date)}</div>
      </div>
    `).join('');
  },

  _formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },
};
