/* ============================================================
   CALENDAR.JS — Content Calendar
   Renders a monthly grid, handles adding/deleting entries,
   color-coded by mode (sports = green, school = gold)
   ============================================================ */

const CALENDAR = {

  _year:  new Date().getFullYear(),
  _month: new Date().getMonth(), // 0-indexed

  // ── RENDER ──────────────────────────────────────────
  render() {
    this._renderHeader();
    this._renderGrid();
  },

  _renderHeader() {
    const label = new Date(this._year, this._month, 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('cal-month-label').textContent = label;
  },

  _renderGrid() {
    const grid     = document.getElementById('cal-grid');
    const entries  = STORAGE.getCalendar();
    const today    = new Date();
    const firstDay = new Date(this._year, this._month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(this._year, this._month + 1, 0).getDate();

    let html = '';

    // Empty cells before day 1
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-day dimmed"><div class="cal-day-num"></div></div>`;
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr  = `${this._year}-${String(this._month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday  = today.getDate() === day && today.getMonth() === this._month && today.getFullYear() === this._year;
      const dayEntries = entries.filter(e => e.date === dateStr);

      html += `
        <div class="cal-day ${isToday ? 'today' : ''}" onclick="CALENDAR.openAddModal('${dateStr}')">
          <div class="cal-day-num">${day}</div>
          ${dayEntries.slice(0,3).map(e => `
            <div class="cal-event cal-event-${e.mode}" title="${e.title}"
                 onclick="event.stopPropagation(); CALENDAR.deleteEntry('${e.id}')">
              ${e.title}
            </div>`).join('')}
          ${dayEntries.length > 3 ? `<div class="cal-event" style="color:var(--text-muted)">+${dayEntries.length - 3} more</div>` : ''}
        </div>`;
    }

    grid.innerHTML = html;
  },

  // ── NAVIGATION ──────────────────────────────────────
  prev() {
    this._month--;
    if (this._month < 0) { this._month = 11; this._year--; }
    this.render();
  },

  next() {
    this._month++;
    if (this._month > 11) { this._month = 0; this._year++; }
    this.render();
  },

  // ── ADD MODAL ───────────────────────────────────────
  openAddModal(dateStr = '') {
    const modal = document.getElementById('cal-modal');
    modal.classList.remove('hidden');

    // Pre-fill date if passed
    if (dateStr) document.getElementById('cal-modal-date').value = dateStr;
    else document.getElementById('cal-modal-date').value = new Date().toISOString().slice(0,10);

    // Reset other fields
    document.getElementById('cal-modal-title').value    = '';
    document.getElementById('cal-modal-assignee').value = '';
    document.getElementById('cal-modal-mode').value     = APP.currentMode;
    document.getElementById('cal-modal-status').value   = 'idea';

    setTimeout(() => document.getElementById('cal-modal-title').focus(), 50);
  },

  closeModal() {
    document.getElementById('cal-modal').classList.add('hidden');
  },

  saveEntry() {
    const title    = document.getElementById('cal-modal-title').value.trim();
    const date     = document.getElementById('cal-modal-date').value;
    const mode     = document.getElementById('cal-modal-mode').value;
    const assignee = document.getElementById('cal-modal-assignee').value.trim();
    const status   = document.getElementById('cal-modal-status').value;

    if (!title || !date) {
      APP.toast('Title and date are required.', 'error');
      return;
    }

    STORAGE.addCalendarEntry({ title, date, mode, assignee, status });
    this.closeModal();
    this.render();
    APP.toast('Post added to calendar!', 'success');
  },

  deleteEntry(id) {
    if (!confirm('Remove this post from the calendar?')) return;
    STORAGE.deleteCalendarEntry(id);
    this.render();
    APP.toast('Post removed.', 'success');
  },
};
