/* ============================================================
   IMAGE-STUDIO.JS — Image Studio
   Handles: player photo upload → Claude vision analysis →
            prompt optimization → GPT Image stylize/generate →
            download + save to history
   ============================================================ */

const IMAGE_STUDIO = {

  // State
  _uploadedBase64: null,
  _uploadedDataUrl: null,
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
      const dataUrl = e.target.result;
      this._uploadedDataUrl = dataUrl;
      this._uploadedBase64 = dataUrl.split(',')[1];

      document.getElementById('img-upload-state').classList.add('hidden');
      document.getElementById('img-analyzed-state').classList.remove('hidden');
      document.getElementById('img-filename').textContent = file.name;
      document.getElementById('img-analysis-text').textContent = 'Analyzing your photo...';

      const thumb = document.getElementById('img-upload-thumb');
      thumb.src = dataUrl;
      thumb.classList.remove('hidden');

      this._updateActionLabels();
      await this._analyzePhoto();
    };
    reader.readAsDataURL(file);
  },

  async _analyzePhoto() {
    try {
      const analysis = await API.claudeVision(
        this._uploadedBase64,
        this._uploadedMediaType,
        `Analyze this player photo for a King Philip Warriors (KP) high school Instagram post.
Describe in 2-3 sentences:
- Sport and action happening (scoring, defense, celebration, etc.)
- Athlete details: jersey number, uniform colors, pose, expression
- Setting, lighting, and any opponent or crowd context
- What should be preserved when stylizing this photo for social media

Be concise and specific. Focus on details needed to keep the same athlete recognizable.`
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
    this._uploadedDataUrl   = null;
    this._uploadedMediaType = null;
    this._uploadedFilename  = null;
    this._analysisText      = null;
    document.getElementById('img-file-input').value = '';
    document.getElementById('img-analyzed-state').classList.add('hidden');
    document.getElementById('img-upload-state').classList.remove('hidden');

    const thumb = document.getElementById('img-upload-thumb');
    thumb.src = '';
    thumb.classList.add('hidden');

    this._resetPreview();
    this._updateActionLabels();
  },

  // ── IMAGE PREP ──────────────────────────────────────
  async _prepareImageBlob() {
    const maxEdge = 2048;
    const dataUrl = this._uploadedDataUrl;
    if (!dataUrl) throw new Error('No player photo uploaded.');

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width  = Math.round(width * scale);
        height = Math.round(height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        const type = this._uploadedMediaType === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Could not prepare photo.')),
          type,
          0.92
        );
      };
      img.onerror = () => reject(new Error('Could not read uploaded photo.'));
      img.src = dataUrl;
    });
  },

  // ── BUILD PROMPT ────────────────────────────────────
  async buildPrompt() {
    const desc   = document.getElementById('img-desc').value.trim();
    const preset = document.querySelector('#img-presets .preset-btn.active')?.dataset.preset || 'gameday';
    const format = document.querySelector('#img-formats .format-btn.active')?.dataset.label || 'Square (IG post)';
    const mode   = APP.currentMode;
    const hasPhoto = this._hasPhoto();

    if (!desc && !this._analysisText) {
      APP.toast(hasPhoto ? 'Add a description or wait for photo analysis.' : 'Describe what you want or upload a player photo.', 'error');
      return;
    }

    this._setBuilding(true);

    const systemPrompt = hasPhoto
      ? `You write stylization prompts for GPT Image edits that transform an existing player photo into a King Philip Warriors Instagram post.
Preserve the same athlete's appearance, jersey number, uniform colors, and action pose from the source photo.
Apply the requested style preset while incorporating KP branding: forest green (#1A5C1A) and gold (#F0A500).
Do not invent a different player or replace the athlete.
Return ONLY the optimized prompt text. No preamble, no explanation, no labels.`
      : `You are an expert AI image prompt engineer specializing in creating prompts for GPT Image.
You write prompts that produce stunning, specific results — never generic.
Always incorporate the King Philip Warriors brand: forest green (#1A5C1A) and gold (#F0A500).
Return ONLY the optimized prompt text. No preamble, no explanation, no labels.`;

    const parts = [];
    if (desc) parts.push(`User's vision: ${desc}`);
    if (this._analysisText) parts.push(`Player photo analysis: ${this._analysisText}`);
    parts.push(`Style preset: ${preset} — ${this.PRESET_PROMPTS[preset] || ''}`);
    parts.push(`Format: ${format}`);
    parts.push(`Mode: ${mode} post for King Philip Regional High School Instagram`);
    if (hasPhoto) {
      parts.push('Task: Stylize the uploaded player photo into a polished social post while keeping the same athlete recognizable.');
    } else {
      parts.push('Include: KP Warriors branding, forest green and gold color palette, school-appropriate content');
    }

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
    const hasPhoto = this._hasPhoto();

    this._setGenerating(true);
    document.getElementById('img-download-row').classList.add('hidden');

    try {
      let url;
      if (hasPhoto) {
        const blob = await this._prepareImageBlob();
        url = await API.editImageFromPhoto(
          this._builtPrompt,
          size,
          blob,
          this._uploadedFilename || 'player-photo.jpg'
        );
      } else {
        url = await API.generateImage(this._builtPrompt, size);
      }

      if (!url) throw new Error('No image returned.');

      this._generatedImageUrl = url;
      this._showResult(url);
      document.getElementById('img-download-row').classList.remove('hidden');
      APP.toast(hasPhoto ? 'Photo stylized!' : 'Image generated!', 'success');
    } catch (err) {
      APP.toast(err.message, 'error');
    } finally {
      this._setGenerating(false);
    }
  },

  _showResult(url) {
    document.getElementById('img-placeholder').classList.add('hidden');

    if (this._hasPhoto()) {
      document.getElementById('img-single-view').classList.add('hidden');
      document.getElementById('img-compare-view').classList.remove('hidden');
      document.getElementById('img-source-thumb').src = this._uploadedDataUrl;
      document.getElementById('img-result-compare').src = url;
    } else {
      document.getElementById('img-compare-view').classList.add('hidden');
      document.getElementById('img-single-view').classList.remove('hidden');
      const imgEl = document.getElementById('img-result');
      imgEl.src = url;
      imgEl.classList.remove('hidden');
    }
  },

  _resetPreview() {
    document.getElementById('img-placeholder').classList.remove('hidden');
    document.getElementById('img-single-view').classList.remove('hidden');
    document.getElementById('img-compare-view').classList.add('hidden');
    document.getElementById('img-result').classList.add('hidden');
    document.getElementById('img-result').src = '';
    document.getElementById('img-result-compare').src = '';
    document.getElementById('img-source-thumb').src = '';
    this._generatedImageUrl = null;
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
    const hasPhoto = this._hasPhoto();
    STORAGE.addHistoryItem({
      type:       'image',
      mode:       APP.currentMode,
      status:     'draft',
      title:      desc || (hasPhoto ? 'Stylized player photo' : 'Image prompt'),
      content:    this._builtPrompt,
      imageUrl:   this._generatedImageUrl || null,
      source:     hasPhoto ? 'player-photo' : 'text-only',
      sourceFile: hasPhoto ? this._uploadedFilename : null,
      analysis:   hasPhoto ? (this._analysisText || '') : null,
    });

    APP.toast('Saved to history!', 'success');
  },

  // ── UI STATE ────────────────────────────────────────
  _hasPhoto() {
    return !!this._uploadedBase64;
  },

  _updateActionLabels() {
    const hasPhoto = this._hasPhoto();
    document.getElementById('img-build-btn').querySelector('span').textContent =
      hasPhoto ? 'Build stylize prompt' : 'Build prompt';
    document.getElementById('img-generate-btn').querySelector('span').textContent =
      hasPhoto ? 'Stylize photo' : 'Generate image';
  },

  _setBuilding(on) {
    const btn     = document.getElementById('img-build-btn');
    const spinner = document.getElementById('img-build-spinner');
    const text    = btn.querySelector('span');
    btn.disabled = on;
    spinner.classList.toggle('hidden', !on);
    if (!on) {
      this._updateActionLabels();
    } else {
      text.textContent = 'Building...';
    }
  },

  _setGenerating(on) {
    const btn     = document.getElementById('img-generate-btn');
    const spinner = document.getElementById('img-gen-spinner');
    const text    = btn.querySelector('span');
    const hasPhoto = this._hasPhoto();
    btn.disabled = on;
    spinner.classList.toggle('hidden', !on);

    if (on) {
      text.textContent = hasPhoto ? 'Stylizing...' : 'Generating...';
      this._resetPreview();
      document.getElementById('img-placeholder').classList.remove('hidden');
      document.getElementById('img-placeholder').querySelector('.img-placeholder-title').textContent =
        hasPhoto ? 'Stylizing your player photo...' : 'Generating your image...';
      document.getElementById('img-placeholder').querySelector('.img-placeholder-sub').textContent =
        'GPT Image · this takes ~10 seconds';
    } else {
      this._updateActionLabels();
      document.getElementById('img-placeholder').querySelector('.img-placeholder-title').textContent =
        hasPhoto ? 'Stylized post appears here' : 'Generated image appears here';
      document.getElementById('img-placeholder').querySelector('.img-placeholder-sub').textContent =
        hasPhoto ? 'Upload a game photo to stylize it' : 'GPT Image · ~10 sec per image';
    }
  },
};
