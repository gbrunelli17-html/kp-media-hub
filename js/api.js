/* ============================================================
   API.JS — all external API calls
   Claude API (captions, vision, prompt optimization)
   OpenAI API (GPT Image generation + edits)
   ============================================================ */

const API = {

  _claudeErrorMessage(status, errBody) {
    const msg = errBody?.error?.message || `Claude API error ${status}`;
    if (status === 401 || /authentication|invalid.*credentials|invalid x-api-key/i.test(msg)) {
      return 'Claude API key is invalid. Open Settings, paste a fresh key from console.anthropic.com, and save.';
    }
    return msg;
  },

  // ── CLAUDE ──────────────────────────────────────────

  async claude(systemPrompt, messages, maxTokens = 1000) {
    const key = STORAGE.getClaudeKey();
    if (!key) throw new Error('No Claude API key set. Open Settings to add one.');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(this._claudeErrorMessage(res.status, err));
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  },

  _normalizeVisionMediaType(base64Data, mediaType) {
    const aliases = {
      'image/jpg': 'image/jpeg',
      'image/x-png': 'image/png',
      'image/pjpeg': 'image/jpeg',
    };
    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

    try {
      const bytes = atob(base64Data.slice(0, 32));
      if (bytes.startsWith('\x89PNG')) return 'image/png';
      if (bytes.startsWith('\xff\xd8\xff')) return 'image/jpeg';
      if (bytes.startsWith('GIF8')) return 'image/gif';
      if (bytes.slice(0, 4) === 'RIFF' && bytes.slice(8, 12) === 'WEBP') return 'image/webp';
    } catch { /* fall through */ }

    const normalized = aliases[mediaType] || mediaType;
    if (allowed.has(normalized)) return normalized;
    return 'image/jpeg';
  },

  async claudeVision(base64Data, mediaType, prompt) {
    const key = STORAGE.getClaudeKey();
    if (!key) throw new Error('No Claude API key set. Open Settings to add one.');

    const cleanBase64 = base64Data.replace(/\s/g, '');
    const bytes = Math.ceil((cleanBase64.length * 3) / 4);
    if (bytes > 5 * 1024 * 1024) {
      throw new Error('Image is too large for analysis. Try a smaller screenshot.');
    }

    const normalizedType = this._normalizeVisionMediaType(cleanBase64, mediaType);

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: normalizedType, data: cleanBase64 },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(this._claudeErrorMessage(res.status, err));
    }

    const data = await res.json();
    const text = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')
      .trim();

    if (!text) throw new Error('Claude returned an empty analysis. Try a different image.');
    return text;
  },

  // ── OPENAI / GPT IMAGE ──────────────────────────────

  async generateImage(prompt, size = '1024x1024') {
    const key = STORAGE.getOpenAIKey();
    if (!key) throw new Error('No OpenAI API key set. Open Settings to add one.');

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        n: 1,
        size,
        quality: 'high',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI API error ${res.status}`);
    }

    const data = await res.json();
    return this._parseImageResponse(data);
  },

  /**
   * Stylize images with GPT Image edits (player photos + optional style reference).
   * @param {string} prompt
   * @param {string} size
   * @param {Array<{blob: Blob, filename: string}>} images
   */
  async editImages(prompt, size, images) {
    const key = STORAGE.getOpenAIKey();
    if (!key) throw new Error('No OpenAI API key set. Open Settings to add one.');
    if (!images?.length) throw new Error('No images to stylize.');

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('quality', 'high');
    form.append('input_fidelity', 'high');
    images.forEach(({ blob, filename }) => {
      form.append('image', blob, filename);
    });

    const res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}` },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI API error ${res.status}`);
    }

    const data = await res.json();
    return this._parseImageResponse(data);
  },

  _parseImageResponse(data) {
    const item = data.data?.[0];
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    if (item?.url) return item.url;
    return null;
  },
};
