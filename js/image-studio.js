/* ============================================================
   IMAGE-STUDIO.JS — Image Studio
   Handles: multi player photo upload, style reference, drag-drop,
            Claude vision, prompt build, GPT Image stylize/generate
   ============================================================ */

const IMAGE_STUDIO = {

  MAX_PLAYER_PHOTOS: 8,

  _playerPhotos: [],
  _styleReference: null,
  _builtPrompt: null,
  _generatedImageUrl: null,

  PRESET_PROMPTS: {
    gameday:      'dramatic game-day atmosphere, stadium lights blazing, intense action, electric crowd energy',
    playoff:      'high-stakes playoff intensity, championship atmosphere, dramatic lighting, winner energy',
    seniornght:   'celebratory senior night, warm nostalgic atmosphere, team unity, emotional and proud',
    poster:       'clean graphic design poster style, bold typography feel, sharp and modern, flat graphic look',
    celebration:  'joyful celebration, confetti energy, triumphant moment, team coming together, big win energy',
    school:       'clean professional school aesthetic, bright and welcoming, community feel, organized and clear',
  },

  PLATFORM_SUFFIXES: {
    gptimage:   '',
    midjourney: ' --ar 1:1 --style raw --v 6.1 --q 2',
    firefly:    ' Style: photographic. Content type: photo.',
  },

  // ── INIT ────────────────────────────────────────────
  initDropZones() {
    this._bindDropZone('img-dropzone', 'player', 'img-file-input');
    this._bindDropZone('img-ref-dropzone', 'reference', 'img-ref-file-input');
  },

  _bindDropZone(zoneId, type, inputId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    if (!zone || !input) return;

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-active');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-active'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-active');
      if (e.dataTransfer.files?.length) this.handleFiles(e.dataTransfer.files, type);
    });
    input.addEventListener('change', (e) => {
      if (e.target.files?.length) this.handleFiles(e.target.files, type);
      e.target.value = '';
    });
  },

  // ── FILE HANDLING ───────────────────────────────────
  handleFiles(fileList, type) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) {
      APP.toast('Please upload an image file (JPG or PNG).', 'error');
      return;
    }

    if (type === 'player') {
      const slots = this.MAX_PLAYER_PHOTOS - this._playerPhotos.length;
      if (slots <= 0) {
        APP.toast(`Maximum ${this.MAX_PLAYER_PHOTOS} player photos.`, 'error');
        return;
      }
      files.slice(0, slots).forEach(file => this._addPlayerPhoto(file));
      if (files.length > slots) {
        APP.toast(`Added ${slots} photos. Max is ${this.MAX_PLAYER_PHOTOS}.`, 'error');
      }
    } else {
      this._setStyleReference(files[0]);
    }
  },

  _addPlayerPhoto(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const photo = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        dataUrl,
        base64: dataUrl.split(',')[1],
        mediaType: file.type || 'image/jpeg',
        filename: file.name,
        analysis: null,
        analyzing: true,
      };
      this._playerPhotos.push(photo);
      this._renderPlayerPhotos();
      this._updateActionLabels();
      await this._analyzePlayerPhoto(photo);
    };
    reader.readAsDataURL(file);
  },

  async _analyzePlayerPhoto(photo) {
    try {
      photo.analysis = await API.claudeVision(
        photo.base64,
        photo.mediaType,
        `Analyze this player photo for a King Philip Warriors (KP) high school Instagram post.
Describe in 2-3 sentences:
- Sport and action happening
- Athlete details: jersey number, uniform colors, pose, expression
- Setting, lighting, and opponent or crowd context
- What must be preserved when stylizing this photo

Be concise. Focus on keeping the same athlete recognizable.`
      );
    } catch {
      photo.analysis = null;
    } finally {
      photo.analyzing = false;
      this._renderPlayerPhotos();
    }
  },

  _setStyleReference(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      this._styleReference = {
        dataUrl,
        base64: dataUrl.split(',')[1],
        mediaType: file.type || 'image/jpeg',
        filename: file.name,
        analysis: null,
        analyzing: true,
      };
      this._renderStyleReference();
      await this._analyzeStyleReference();
    };
    reader.readAsDataURL(file);
  },

  async _analyzeStyleReference() {
    if (!this._styleReference) return;
    try {
      this._styleReference.analysis = await API.claudeVision(
        this._styleReference.base64,
        this._styleReference.mediaType,
        `Analyze this social media graphic as a STYLE REFERENCE for a high school sports post.
Describe in 2-3 sentences:
- Layout and composition (photo placement, text areas, borders)
- Typography and graphic style (bold headlines, overlays, score graphics)
- Color grading and mood
- What design elements to emulate (NOT logos or team branding — layout only)

Be concise. Focus on reusable graphic design patterns.`
      );
    } catch {
      this._styleReference.analysis = null;
    } finally {
      this._styleReference.analyzing = false;
      this._renderStyleReference();
    }
  },

  removePlayerPhoto(id) {
    this._playerPhotos = this._playerPhotos.filter(p => p.id !== id);
    this._renderPlayerPhotos();
    this._updateActionLabels();
    if (!this._playerPhotos.length) this._resetPreview();
  },

  clearStyleReference() {
    this._styleReference = null;
    document.getElementById('img-ref-file-input').value = '';
    this._renderStyleReference();
  },

  clearAllPlayers() {
    this._playerPhotos = [];
    document.getElementById('img-file-input').value = '';
    this._renderPlayerPhotos();
    this._updateActionLabels();
    this._resetPreview();
  },

  // ── RENDER UPLOAD UI ────────────────────────────────
  _renderPlayerPhotos() {
    const grid  = document.getElementById('img-player-grid');
    const count = document.getElementById('img-player-count');
    const clearBtn = document.getElementById('img-clear-players');
    const hasPhotos = this._playerPhotos.length > 0;

    if (grid) grid.classList.toggle('hidden', !hasPhotos);
    if (count) count.textContent = `${this._playerPhotos.length} / ${this.MAX_PLAYER_PHOTOS}`;
    if (clearBtn) clearBtn.classList.toggle('hidden', !hasPhotos);

    if (!grid) return;

    grid.innerHTML = this._playerPhotos.map(photo => `
      <div class="photo-thumb-card" title="${photo.filename}">
        <img src="${photo.dataUrl}" alt="${photo.filename}" class="photo-thumb-img" />
        <button class="photo-thumb-remove" onclick="IMAGE_STUDIO.removePlayerPhoto('${photo.id}')" title="Remove">
          <i class="ti ti-x"></i>
        </button>
        ${photo.analyzing ? '<div class="photo-thumb-status">Analyzing...</div>' : ''}
      </div>
    `).join('');
  },

  _renderStyleReference() {
    const dropzone = document.getElementById('img-ref-dropzone');
    const preview  = document.getElementById('img-ref-preview');
    const ref      = this._styleReference;

    if (dropzone) dropzone.classList.toggle('hidden', !!ref);
    if (preview) preview.classList.toggle('hidden', !ref);
    this._updateActionLabels();
    if (!ref) return;

    document.getElementById('img-ref-filename').textContent = ref.filename;
    document.getElementById('img-ref-thumb').src = ref.dataUrl;
    document.getElementById('img-ref-analysis-text').textContent =
      ref.analyzing ? 'Analyzing style reference...' : (ref.analysis || 'Analysis unavailable.');
  },

  _combinedAnalysis() {
    const playerParts = this._playerPhotos
      .map((p, i) => p.analysis ? `Photo ${i + 1} (${p.filename}): ${p.analysis}` : null)
      .filter(Boolean);
    return playerParts.join('\n\n');
  },

  // ── IMAGE PREP ──────────────────────────────────────
  _blobFromDataUrl(dataUrl, mediaType) {
    const maxEdge = 2048;
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
        const type = mediaType === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Could not prepare image.')),
          type,
          0.92
        );
      };
      img.onerror = () => reject(new Error('Could not read image.'));
      img.src = dataUrl;
    });
  },

  async _prepareEditImages() {
    const images = [];
    for (const photo of this._playerPhotos) {
      const blob = await this._blobFromDataUrl(photo.dataUrl, photo.mediaType);
      images.push({ blob, filename: photo.filename || 'player-photo.jpg' });
    }
    if (this._styleReference) {
      const blob = await this._blobFromDataUrl(this._styleReference.dataUrl, this._styleReference.mediaType);
      images.push({ blob, filename: this._styleReference.filename || 'style-reference.png' });
    }
    return images;
  },

  // ── BUILD PROMPT ────────────────────────────────────
  async buildPrompt() {
    const desc   = document.getElementById('img-desc').value.trim();
    const preset = document.querySelector('#img-presets .preset-btn.active')?.dataset.preset || 'gameday';
    const format = document.querySelector('#img-formats .format-btn.active')?.dataset.label || 'Square (IG post)';
    const mode   = APP.currentMode;
    const hasPhoto = this._hasPhoto();
    const hasRef   = !!this._styleReference;
    const analysis = this._combinedAnalysis();

    if (!desc && !analysis && !this._styleReference?.analysis) {
      APP.toast('Add a description, player photos, or a style reference.', 'error');
      return;
    }

    this._setBuilding(true);

    const systemPrompt = hasPhoto || hasRef
      ? `You write stylization prompts for GPT Image edits that create King Philip Warriors Instagram posts.
Preserve each athlete's appearance, jersey number, uniform colors, and action pose from player photos.
If a style reference is provided, match its layout and graphic design — NOT its logos or pro team branding.
Incorporate KP branding: forest green (#1A5C1A) and gold (#F0A500).
Return ONLY the optimized prompt text. No preamble, no explanation, no labels.`
      : `You are an expert AI image prompt engineer for GPT Image.
Always incorporate King Philip Warriors brand: forest green (#1A5C1A) and gold (#F0A500).
Return ONLY the optimized prompt text. No preamble, no explanation, no labels.`;

    const parts = [];
    if (desc) parts.push(`User's vision: ${desc}`);
    if (analysis) parts.push(`Player photo analysis:\n${analysis}`);
    if (this._styleReference?.analysis) {
      parts.push(`Style reference analysis (match layout only, no pro logos): ${this._styleReference.analysis}`);
    }
    parts.push(`Style preset: ${preset} — ${this.PRESET_PROMPTS[preset] || ''}`);
    parts.push(`Format: ${format}`);
    parts.push(`Mode: ${mode} post for King Philip Regional High School Instagram`);
    if (hasPhoto && hasRef) {
      parts.push('Task: Combine player photos with the reference post graphic style into one KP-branded social post.');
    } else if (hasPhoto) {
      parts.push('Task: Stylize the player photo(s) into a polished KP social post while keeping athletes recognizable.');
    } else if (hasRef) {
      parts.push('Task: Create a new KP post matching the reference graphic layout and style.');
    } else {
      parts.push('Include: KP Warriors branding, forest green and gold palette, school-appropriate content');
    }

    try {
      const prompt = await API.claude(systemPrompt, [{ role: 'user', content: parts.join('\n') }], 500);
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

  async copyPrompt(platform) {
    if (!this._builtPrompt) {
      APP.toast('Build a prompt first.', 'error');
      return;
    }
    const labels = { gptimage: 'GPT Image', midjourney: 'Midjourney', firefly: 'Adobe Firefly' };
    const full = this._builtPrompt + (this.PLATFORM_SUFFIXES[platform] || '');
    try {
      await navigator.clipboard.writeText(full);
      APP.toast(`Copied for ${labels[platform] || platform}!`, 'success');
    } catch {
      APP.toast('Copy failed.', 'error');
    }
  },

  // ── GENERATE ────────────────────────────────────────
  async generate() {
    if (!this._builtPrompt) {
      APP.toast('Build a prompt first, then generate.', 'error');
      return;
    }

    const size = document.querySelector('#img-formats .format-btn.active')?.dataset.format || '1024x1024';
    const hasPhoto = this._hasPhoto();
    const hasRef   = !!this._styleReference;

    this._setGenerating(true);
    document.getElementById('img-download-row').classList.add('hidden');

    try {
      let url;
      if (hasPhoto || hasRef) {
        const images = await this._prepareEditImages();
        url = await API.editImages(this._builtPrompt, size, images);
      } else {
        url = await API.generateImage(this._builtPrompt, size);
      }

      if (!url) throw new Error('No image returned.');

      this._generatedImageUrl = url;
      this._showResult(url);
      document.getElementById('img-download-row').classList.remove('hidden');
      APP.toast(hasPhoto || hasRef ? 'Post stylized!' : 'Image generated!', 'success');
    } catch (err) {
      APP.toast(err.message, 'error');
    } finally {
      this._setGenerating(false);
    }
  },

  _showResult(url) {
    document.getElementById('img-placeholder').classList.add('hidden');

    if (this._hasPhoto() || this._styleReference) {
      document.getElementById('img-single-view').classList.add('hidden');
      document.getElementById('img-compare-view').classList.remove('hidden');
      this._renderCompareSources();
      document.getElementById('img-result-compare').src = url;
    } else {
      document.getElementById('img-compare-view').classList.add('hidden');
      document.getElementById('img-single-view').classList.remove('hidden');
      document.getElementById('img-result').src = url;
      document.getElementById('img-result').classList.remove('hidden');
    }
  },

  _renderCompareSources() {
    const strip = document.getElementById('img-source-strip');
    if (!strip) return;

    const sources = [
      ...this._playerPhotos.map(p => ({ src: p.dataUrl, label: p.filename })),
      ...(this._styleReference ? [{ src: this._styleReference.dataUrl, label: 'Style ref' }] : []),
    ];

    strip.innerHTML = sources.map(s => `
      <img src="${s.src}" alt="${s.label}" class="img-source-mini" title="${s.label}" />
    `).join('');
  },

  _resetPreview() {
    document.getElementById('img-placeholder').classList.remove('hidden');
    document.getElementById('img-single-view').classList.add('hidden');
    document.getElementById('img-compare-view').classList.add('hidden');
    document.getElementById('img-result').src = '';
    document.getElementById('img-result-compare').src = '';
    const strip = document.getElementById('img-source-strip');
    if (strip) strip.innerHTML = '';
    this._generatedImageUrl = null;
  },

  async download() {
    if (!this._generatedImageUrl) return;
    const a = document.createElement('a');
    a.href     = this._generatedImageUrl;
    a.download = `kp-warriors-${Date.now()}.png`;
    a.target   = '_blank';
    a.click();
  },

  saveToHistory() {
    if (!this._builtPrompt) return;

    const desc = document.getElementById('img-desc').value.trim();
    const hasPhoto = this._hasPhoto();
    const hasRef   = !!this._styleReference;

    STORAGE.addHistoryItem({
      type:              'image',
      mode:              APP.currentMode,
      status:            'draft',
      title:             desc || (hasPhoto ? 'Stylized player photo' : hasRef ? 'Style reference post' : 'Image prompt'),
      content:           this._builtPrompt,
      imageUrl:          this._generatedImageUrl || null,
      source:            hasPhoto ? 'player-photo' : hasRef ? 'style-reference' : 'text-only',
      playerCount:       this._playerPhotos.length,
      hasStyleReference: hasRef,
      sourceFiles:       [
        ...this._playerPhotos.map(p => p.filename),
        ...(this._styleReference ? [this._styleReference.filename] : []),
      ],
      analysis:          this._combinedAnalysis() || null,
    });

    APP.toast('Saved to history!', 'success');
  },

  _hasPhoto() {
    return this._playerPhotos.length > 0;
  },

  _updateActionLabels() {
    const hasInputs = this._hasPhoto() || this._styleReference;
    document.getElementById('img-build-btn').querySelector('span').textContent =
      hasInputs ? 'Build stylize prompt' : 'Build prompt';
    document.getElementById('img-generate-btn').querySelector('span').textContent =
      hasInputs ? 'Stylize post' : 'Generate image';
  },

  _setBuilding(on) {
    const btn = document.getElementById('img-build-btn');
    const spinner = document.getElementById('img-build-spinner');
    const text = btn.querySelector('span');
    btn.disabled = on;
    spinner.classList.toggle('hidden', !on);
    text.textContent = on ? 'Building...' : (this._hasPhoto() || this._styleReference ? 'Build stylize prompt' : 'Build prompt');
  },

  _setGenerating(on) {
    const btn = document.getElementById('img-generate-btn');
    const spinner = document.getElementById('img-gen-spinner');
    const text = btn.querySelector('span');
    const hasInputs = this._hasPhoto() || this._styleReference;
    btn.disabled = on;
    spinner.classList.toggle('hidden', !on);

    if (on) {
      text.textContent = hasInputs ? 'Stylizing...' : 'Generating...';
      this._resetPreview();
      document.getElementById('img-placeholder').classList.remove('hidden');
      document.getElementById('img-placeholder').querySelector('.img-placeholder-title').textContent =
        hasInputs ? 'Stylizing your post...' : 'Generating your image...';
      document.getElementById('img-placeholder').querySelector('.img-placeholder-sub').textContent =
        'GPT Image · this takes ~10–20 seconds';
    } else {
      this._updateActionLabels();
      document.getElementById('img-placeholder').querySelector('.img-placeholder-title').textContent =
        hasInputs ? 'Stylized post appears here' : 'Generated image appears here';
      document.getElementById('img-placeholder').querySelector('.img-placeholder-sub').textContent =
        'Upload photos or a style reference to stylize';
    }
  },
};
