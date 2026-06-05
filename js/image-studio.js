/* ============================================================
   IMAGE-STUDIO.JS — Image Studio
   Handles: photo upload → Claude vision analysis →
            prompt optimization → DALL·E 3 generation →
            download + save to history
   ============================================================ */

const IMAGE_STUDIO = {

  // State
  _uploadedBase64: null,
  _uploadedMediaType: null,
  _uploadedFilename: null,
  _analysisText: null,
  _builtPrompt: null,
  _generatedImageUrl: null,

  // Style preset prompts
  PRESET_PROMPTS: {
    gameday:      'dramatic game-day atmosphere, stadium lights blazing, intense action, electric crowd energy',
    playoff:      'high-stakes playoff intensity, championship atmosphere, dramatic lighting, winner energy',
    seniornght:   'celebratory senior night, warm nostalgic atmosphere, team unity, emotional and proud',
    poster:       'clean graphic design poster style, bold typography feel, sharp and modern, flat graphic look',
    celebration:  'joyful celebration, confetti energy, triumphant moment, team coming together, big win energy',
    school:       'clean professional school aesthetic, bright and welcoming, community feel, organized and clear',
  },

  // Platform-specific prompt suffixes
  PLATFORM_SUFFIXES: {
    dalle:      '',
    midjourney: ' --ar 1:1 --style raw --v 6.1 --q 2',
    firefly:    ' Style: photographic. Content type: photo.',
  },

  // ── PHOTO UPLOAD ────────────────────────────────────
  handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    this._uploadedFilename = file.name;
    this._uploadedMediaType = file.type || 'image/jpeg';

    const reader = new FileReader();
    reader.onload = async (e) => {
      // Strip the data:image/...;base64, prefix
      this._uploadedBase64 = e.target.result.split(',')[1];

      // Show analyzed state immediately
      document.getElementById('img-upload-state').classList.add('hidden');
      document.getElementById('img-analyzed-state').classList.remove('hidden');
      document.getElementById('img-filename').textContent = file.name;
      document.getElementById('img-analysis-text').textContent = 'Analyzing your photo...';

      // Run Claude vision
      await this._analyzePhoto();
    };
    reader.readAsDataURL(file);
  },

  async _analyzePhoto() {
    try {
      const analysis = await API.claudeVision(
        this._uploadedBase64,
        this._uploadedMediaType,
        `Analyze this photo for a King Philip Warriors (KP) high school Instagram post.
Describe in 2-3 sentences:
- What's happening in the image (sport, action, people, setting)
- Key visual details (jerseys, colors, expressions, lighting)
- How it could be used for social media

Be concise and specific. Focus on what's useful for writing a prompt or caption.`
      );
      this._analysisText = analysis;
      document.getElementById('img-analysis-text').textContent = analysis;
    } catch (err) {
      this._analysisText = null;
      document.getElementById('img-analysis-text').textContent = 'Analysis failed — you can still build a prompt manually.';
    }
  },

  clearUpload() {
    this._uploadedBase64    = null;
    this._uploadedMediaType = null;
    this._uploadedFilename  = null;
    this._analysisText      = null;
    document.getElementById('img-file-input').value = '';
    document.getElementById('img-analyzed-state').classList.add('hidden');
    document.getElementById('img-upload-state').classList.remove('hidden');
  },

  // ── BUILD PROMPT ────────────────────────────────────
  async buildPrompt() {
    const desc   = document.getElementById('img-desc').value.trim();
    const preset = document.querySelector('#img-presets .preset-btn.active')?.dataset.preset || 'gameday';
    const format = document.querySelector('#img-formats .format-btn.active')?.dataset.label || 'Square (IG post)';
    const mode   = APP.currentMode;

    if (!desc && !this._analysisText) {
      APP.toast('Describe what you want or upload a reference photo.', 'error');
      return;
    }

    this._setBuilding(true);

    const systemPrompt = `You are an expert AI image prompt engineer specializing in creating prompts for DALL·E 3.
You write prompts that produce stunning, specific results — never generic.
Always incorporate the King Philip Warriors brand: forest green (#1A5C1A) and gold (#F0A500).
Return ONLY the optimized prompt text. No preamble, no explanation, no labels.`;

    const parts = [];
    if (desc) parts.push(`User's vision: ${desc}`);
    if (this._analysisText) parts.push(`Reference photo analysis: ${this._analysisText}`);
    parts.push(`Style preset: ${preset} — ${this.PRESET_PROMPTS[preset] || ''}`);
    parts.push(`Format: ${format}`);
    parts.push(`Mode: ${mode} post for King Philip Regional High School Instagram`);
    parts.push('Include: KP Warriors branding, forest green and gold color palette, school-appropriate content');

    const userMessage = parts.join('\n');

    try {
      const prompt = await API.claude(systemPrompt, [{ role: 'user', content: userMessage }], 400);
      this._builtPrompt = prompt.trim();
      this._renderPrompt(this._builtPrompt);
    } catch (err) {
      APP.toast(err.message, 'error');
    } finally {
      this._setBuilding(false);
    }
  },

  _renderPrompt(promptText) {
    document.getElementById('img-prompt-box').innerHTML = `
      <div class="prompt-text">${promptText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
  },

  // ── COPY PROMPT (platform-specific) ─────────────────
  async copyPrompt(platform) {
    if (!this._builtPrompt) {
      APP.toast('Build a prompt first.', 'error');
      return;
    }
    const full = this._builtPrompt + (this.PLATFORM_SUFFIXES[platform] || '');
    try {
      await navigator.clipboard.writeText(full);
      APP.toast(`Copied for ${platform === 'dalle' ? 'DALL·E 3' : platform === 'midjourney' ? 'Midjourney' : 'Adobe Firefly'}!`, 'success');
    } catch {
      APP.toast('Copy failed.', 'error');
    }
  },

  // ── GENERATE IMAGE ───────────────────────────────────
  async generate() {
    if (!this._builtPrompt) {
      APP.toast('Build a prompt first, then generate.', 'error');
      return;
    }

    const size = document.querySelector('#img-formats .format-btn.active')?.dataset.format || '1024x1024';

    this._setGenerating(true);
    document.getElementById('img-download-row').classList.add('hidden');

    try {
      const url = await API.generateImage(this._builtPrompt, size);
      if (!url) throw new Error('No image URL returned.');

      this._generatedImageUrl = url;
      document.getElementById('img-placeholder').classList.add('hidden');
      const imgEl = document.getElementById('img-result');
      imgEl.src = url;
      imgEl.classList.remove('hidden');
      document.getElementById('img-download-row').classList.remove('hidden');
      APP.toast('Image generated!', 'success');
    } catch (err) {
      APP.toast(err.message, 'error');
    } finally {
      this._setGenerating(false);
    }
  },

  // ── DOWNLOAD ────────────────────────────────────────
  async download() {
    if (!this._generatedImageUrl) return;
    const a = document.createElement('a');
    a.href     = this._generatedImageUrl;
    a.download = `kp-warriors-${Date.now()}.png`;
    a.target   = '_blank';
    a.click();
  },

  // ── SAVE TO HISTORY ─────────────────────────────────
  saveToHistory() {
    if (!this._builtPrompt) return;

    const desc = document.getElementById('img-desc').value.trim();
    STORAGE.addHistoryItem({
      type:    'image',
      mode:    APP.currentMode,
      status:  'draft',
      title:   desc || 'Image prompt',
      content: this._builtPrompt,
      imageUrl: this._generatedImageUrl || null,
    });

    APP.toast('Saved to history!', 'success');
  },

  // ── UI STATE ────────────────────────────────────────
  _setBuilding(on) {
    const btn     = document.getElementById('img-build-btn');
    const spinner = document.getElementById('img-build-spinner');
    const text    = btn.querySelector('span');
    btn.disabled = on;
    spinner.classList.toggle('hidden', !on);
    text.textContent = on ? 'Building...' : 'Build prompt';
  },

  _setGenerating(on) {
    const btn     = document.getElementById('img-generate-btn');
    const spinner = document.getElementById('img-gen-spinner');
    const text    = btn.querySelector('span');
    btn.disabled = on;
    spinner.classList.toggle('hidden', !on);
    text.textContent = on ? 'Generating...' : 'Generate image';

    if (on) {
      document.getElementById('img-placeholder').classList.remove('hidden');
      document.getElementById('img-result').classList.add('hidden');
      document.getElementById('img-placeholder').querySelector('.img-placeholder-title').textContent = 'Generating your image...';
      document.getElementById('img-placeholder').querySelector('.img-placeholder-sub').textContent = 'DALL·E 3 · this takes ~10 seconds';
    } else {
      document.getElementById('img-placeholder').querySelector('.img-placeholder-title').textContent = 'Generated image appears here';
      document.getElementById('img-placeholder').querySelector('.img-placeholder-sub').textContent = 'DALL·E 3 · ~10 sec per image';
    }
  },
};
