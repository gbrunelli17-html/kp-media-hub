/* ============================================================
   CAPTIONS.JS — Caption Studio
   Generates 3 caption variants using Claude API.
   Handles: form inputs, vibe selection, tone slider,
            copy to clipboard, save to history
   ============================================================ */

const CAPTIONS = {

  // KP-specific hashtags by sport/type
  HASHTAGS: {
    football:     '#KPWarriors #GoWarriors #KPFootball #WarriorPride #KPAthletics',
    baseball:     '#KPWarriors #GoWarriors #KPBaseball #WarriorPride #KPAthletics',
    basketball:   '#KPWarriors #GoWarriors #KPBasketball #WarriorPride #KPAthletics',
    soccer:       '#KPWarriors #GoWarriors #KPSoccer #WarriorPride #KPAthletics',
    track:        '#KPWarriors #GoWarriors #KPTrack #WarriorPride #KPAthletics',
    volleyball:   '#KPWarriors #GoWarriors #KPVolleyball #WarriorPride #KPAthletics',
    lacrosse:     '#KPWarriors #GoWarriors #KPLacrosse #WarriorPride #KPAthletics',
    event:        '#KPWarriors #KingPhilip #KPRegional #WarriorPride',
    club:         '#KPWarriors #KingPhilip #KPStudents #WarriorPride',
    announcement: '#KPWarriors #KingPhilip #KPRegional',
    nhs:          '#KPWarriors #KingPhilip #NHS #WarriorPride #KPNational HonorSociety',
    college:      '#KPWarriors #KingPhilip #ClassOf2026 #CollegeBound #WarriorPride',
  },

  // Style presets per vibe
  VIBE_GUIDE: {
    hype:         'electric, urgent, all-caps moments, punchy short sentences, warrior mentality',
    celebratory:  'proud, warm, energetic, shoutout energy, celebratory emojis optional',
    informational:'clear, concise, dates and details included, calls to action, community-focused',
    serious:      'composed, powerful, respectful, meaningful, no fluff',
    recap:        'storytelling, highlight key moments, score/result if provided, closing energy',
  },

  // ── GENERATE ────────────────────────────────────────
  async generate() {
    const event   = document.getElementById('cap-event').value.trim();
    const type    = document.getElementById('cap-type').value;
    const context = document.getElementById('cap-context').value.trim();
    const tone    = parseInt(document.getElementById('cap-tone').value);
    const vibe    = document.querySelector('#vibe-pills .vibe-pill.active')?.dataset.vibe || 'hype';
    const mode    = APP.currentMode;

    if (!event) {
      APP.toast('Add an event name first.', 'error');
      return;
    }

    this._setLoading(true);
    document.getElementById('cap-regen-btn').classList.add('hidden');

    const systemPrompt = this._buildSystemPrompt(mode, vibe, tone);
    const userMessage  = this._buildUserMessage(event, type, context, vibe, tone);

    try {
      const response = await API.claude(systemPrompt, [{ role: 'user', content: userMessage }], 1200);
      this._renderOutput(response, event, type, mode, vibe);
      document.getElementById('cap-regen-btn').classList.remove('hidden');
    } catch (err) {
      APP.toast(err.message, 'error');
      document.getElementById('cap-output').innerHTML = `
        <div class="output-placeholder">
          <i class="ti ti-alert-circle"></i>
          <p>Error: ${err.message}</p>
        </div>`;
    } finally {
      this._setLoading(false);
    }
  },

  // ── PROMPTS ─────────────────────────────────────────
  _buildSystemPrompt(mode, vibe, tone) {
    const modeDesc = mode === 'sports'
      ? 'You are the social media voice for King Philip Regional High School athletics (KP Warriors). Your captions are for sports posts on Instagram.'
      : 'You are the social media voice for King Philip Regional High School. Your captions are for school event/club posts on Instagram.';

    return `${modeDesc}
School colors: forest green and gold. Mascot: Warriors. Location: Wrentham, Massachusetts.

You write punchy, authentic Instagram captions. Never generic. Always KP-specific.
Vibe to match: ${vibe} — ${this.VIBE_GUIDE[vibe] || 'authentic and engaging'}
Tone level: ${tone}/100 (0 = formal, 100 = maximum hype)

Return EXACTLY 3 caption variants, each labeled exactly like this:
[SHORT]
(caption text, 1-2 sentences max, no hashtags)

[MEDIUM]
(caption text, 2-4 sentences, include relevant hashtags at the end)

[LONG]
(caption text, 4-6 sentences, more storytelling, include hashtags at the end)

Use real KP Warriors hashtags. Do not use emojis unless the vibe calls for it. No placeholder text.`;
  },

  _buildUserMessage(event, type, context, vibe, tone) {
    const hashtags = this.HASHTAGS[type] || this.HASHTAGS.event;
    let msg = `Event: ${event}\nType: ${type}\nVibe: ${vibe}\nTone: ${tone}/100`;
    if (context) msg += `\nExtra context: ${context}`;
    msg += `\nHashtags to use: ${hashtags}`;
    return msg;
  },

  // ── RENDER OUTPUT ───────────────────────────────────
  _renderOutput(response, event, type, mode, vibe) {
    const variants = this._parseVariants(response);
    if (!variants.length) {
      document.getElementById('cap-output').innerHTML = `
        <div class="output-placeholder">
          <i class="ti ti-alert-circle"></i>
          <p>Couldn't parse the response. Try regenerating.</p>
        </div>`;
      return;
    }

    const labels = ['Short & punchy', 'Medium + hashtags', 'Long storytelling'];

    document.getElementById('cap-output').innerHTML = variants.map((text, i) => `
      <div class="caption-variant">
        <div class="caption-tag">${labels[i] || `Variant ${i+1}`}</div>
        <div class="caption-text">${this._highlightHashtags(text)}</div>
        <div class="caption-actions">
          <button class="caption-action-btn" onclick="CAPTIONS.copy(${i})">
            <i class="ti ti-copy"></i> Copy
          </button>
          <button class="caption-action-btn" onclick="CAPTIONS.saveDraft(${i})">
            <i class="ti ti-bookmark"></i> Save draft
          </button>
        </div>
      </div>
    `).join('');

    // Store variants for copy/save
    this._lastVariants  = variants;
    this._lastEvent     = event;
    this._lastType      = type;
    this._lastMode      = mode;
    this._lastVibe      = vibe;
  },

  // ── PARSE ───────────────────────────────────────────
  _parseVariants(text) {
    const tags = ['[SHORT]', '[MEDIUM]', '[LONG]'];
    const variants = [];
    tags.forEach((tag, i) => {
      const start = text.indexOf(tag);
      if (start === -1) return;
      const contentStart = start + tag.length;
      const nextTag = tags[i+1] ? text.indexOf(tags[i+1]) : text.length;
      const content = text.slice(contentStart, nextTag === -1 ? text.length : nextTag).trim();
      if (content) variants.push(content);
    });
    // Fallback: split by double newline if tags not found
    if (!variants.length) {
      return text.split(/\n{2,}/).filter(p => p.trim()).slice(0,3);
    }
    return variants;
  },

  _highlightHashtags(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(#\w+)/g, '<span class="caption-hashtags">$1</span>');
  },

  // ── COPY ────────────────────────────────────────────
  async copy(index) {
    const text = this._lastVariants?.[index];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      APP.toast('Copied to clipboard!', 'success');
    } catch {
      APP.toast('Copy failed — try selecting manually.', 'error');
    }
  },

  // ── SAVE TO HISTORY ─────────────────────────────────
  saveDraft(index) {
    const text = this._lastVariants?.[index];
    if (!text) return;

    STORAGE.addHistoryItem({
      type:    'caption',
      mode:    this._lastMode || APP.currentMode,
      status:  'draft',
      title:   this._lastEvent || 'Untitled caption',
      subtype: this._lastType || '',
      vibe:    this._lastVibe || '',
      content: text,
    });

    APP.toast('Saved to drafts!', 'success');
  },

  // ── UI STATE ────────────────────────────────────────
  _setLoading(on) {
    const btn     = document.getElementById('cap-generate-btn');
    const spinner = document.getElementById('cap-spinner');
    const btnText = btn.querySelector('span');

    if (on) {
      btn.disabled = true;
      spinner.classList.remove('hidden');
      btnText.textContent = 'Generating...';
      document.getElementById('cap-output').innerHTML = `
        <div class="output-placeholder">
          <i class="ti ti-loader" style="animation: spin .8s linear infinite"></i>
          <p>Writing your captions...</p>
        </div>`;
    } else {
      btn.disabled = false;
      spinner.classList.add('hidden');
      btnText.textContent = 'Generate captions';
    }
  },

  // Stored last results for copy/save
  _lastVariants: null,
  _lastEvent: '',
  _lastType: '',
  _lastMode: 'sports',
  _lastVibe: 'hype',
};
