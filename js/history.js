/* ============================================================
   HISTORY.JS — Post History
   Renders saved captions + image prompts.
   Handles: search, filter by mode/type, delete, mark as posted,
            copy content
   ============================================================ */

const HISTORY = {

  _currentFilter: 'all',
  _currentSearch: '',

  // ── RENDER ──────────────────────────────────────────
  render() {
    let items = STORAGE.getHistory();

    // Apply filter
    if (this._currentFilter !== 'all') {
      if (this._currentFilter === 'sports' || this._currentFilter === 'school') {
        items = items.filter(i => i.mode === this._currentFilter);
      } else {
        items = items.filter(i => i.type === this._currentFilter);
      }
    }

    // Apply search
    if (this._currentSearch) {
      const q = this._currentSearch.toLowerCase();
      items = items.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.content?.toLowerCase().includes(q)
      );
    }

    const list = document.getElementById('history-list');

    if (!items.length) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="ti ti-history"></i>
          <p>${this._currentSearch || this._currentFilter !== 'all' ? 'No matching posts found.' : 'No saved posts yet.'}</p>
          <p class="output-placeholder-sub">Captions and image prompts you save will appear here.</p>
        </div>`;
      return;
    }

    list.innerHTML = items.map(item => this._renderItem(item)).join('');
  },

  _renderItem(item) {
    const date     = new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const isImage  = item.type === 'image';
    const preview  = (item.content || '').slice(0, 100) + ((item.content || '').length > 100 ? '…' : '');
    const statusChip = this._statusChip(item.status);

    return `
      <div class="history-item" id="hist-${item.id}">
        <div class="history-icon ${isImage ? 'type-image' : ''}">
          <i class="ti ti-${isImage ? 'photo' : 'writing'}"></i>
        </div>
        <div class="history-meta">
          <div class="history-title-row">
            <div class="history-name">${item.title || 'Untitled'}</div>
            <div class="chip chip-${item.mode}">${item.mode}</div>
          </div>
          <div class="history-info">${this._historyLabel(item)} · ${date}${item.assignee ? ` · ${item.assignee}` : ''}</div>
          <div class="history-preview">${preview}</div>
          <div class="history-actions">
            ${statusChip}
            <button class="caption-action-btn" onclick="HISTORY.copy('${item.id}')">
              <i class="ti ti-copy"></i> Copy
            </button>
            ${item.status !== 'posted' ? `
              <button class="caption-action-btn" onclick="HISTORY.markPosted('${item.id}')">
                <i class="ti ti-check"></i> Mark posted
              </button>` : ''}
            <button class="caption-action-btn" onclick="HISTORY.delete('${item.id}')">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        </div>
      </div>`;
  },

  _historyLabel(item) {
    if (item.type !== 'image') return 'Caption';
    if (item.source === 'player-photo') {
      const count = item.playerCount > 1 ? ` · ${item.playerCount} photos` : '';
      const ref   = item.hasStyleReference ? ' · style ref' : '';
      const files = item.sourceFiles?.length ? ` · ${item.sourceFiles.join(', ')}` : '';
      return `Stylized player photo${count}${ref}${files}`;
    }
    if (item.source === 'style-reference') return 'Style reference post';
    return 'Image prompt';
  },

  _statusChip(status) {
    const map = {
      draft:     'chip-draft',
      scheduled: 'chip-scheduled',
      posted:    'chip-posted',
    };
    const cls = map[status] || 'chip-draft';
    return `<span class="chip ${cls}">${status || 'draft'}</span>`;
  },

  // ── SEARCH ──────────────────────────────────────────
  search(query) {
    this._currentSearch = query;
    this.render();
  },

  // ── FILTER ──────────────────────────────────────────
  filter(value) {
    this._currentFilter = value;

    document.querySelectorAll('#history-filters .filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === value);
    });

    this.render();
  },

  // ── ACTIONS ─────────────────────────────────────────
  async copy(id) {
    const item = STORAGE.getHistory().find(i => i.id === id);
    if (!item?.content) return;
    try {
      await navigator.clipboard.writeText(item.content);
      APP.toast('Copied!', 'success');
    } catch {
      APP.toast('Copy failed.', 'error');
    }
  },

  markPosted(id) {
    STORAGE.updateHistoryItem(id, { status: 'posted', postedAt: new Date().toISOString() });
    APP.toast('Marked as posted!', 'success');
    this.render();
  },

  delete(id) {
    if (!confirm('Delete this saved item?')) return;
    STORAGE.deleteHistoryItem(id);
    this.render();
    APP.toast('Deleted.', 'success');
  },
};
