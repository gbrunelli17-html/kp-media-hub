/* ============================================================
   API.JS — all external API calls
   Claude API (captions, vision, prompt optimization)
   OpenAI API (GPT Image generation + edits)
   ============================================================ */

const API = {

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
      throw new Error(err?.error?.message || `Claude API error ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  },

  async claudeVision(base64Data, mediaType, prompt) {
    const key = STORAGE.getClaudeKey();
    if (!key) throw new Error('No Claude API key set.');

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
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Claude Vision error ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
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
