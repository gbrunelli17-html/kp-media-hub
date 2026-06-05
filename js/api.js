/* ============================================================
   API.JS — all external API calls
   Claude API (captions, vision, prompt optimization)
   OpenAI API (DALL·E 3 image generation)
   ============================================================ */

const API = {

  // ── CLAUDE ──────────────────────────────────────────

  /**
   * Core Claude call. Returns the assistant's text response.
   * @param {string} systemPrompt
   * @param {Array}  messages   - array of {role, content}
   * @param {number} maxTokens
   */
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

  /**
   * Claude vision call — pass base64 image data for analysis.
   * @param {string} base64Data  - base64 encoded image
   * @param {string} mediaType   - e.g. 'image/jpeg'
   * @param {string} prompt
   */
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

  // ── OPENAI / DALL·E 3 ───────────────────────────────

  /**
   * Generate an image with DALL·E 3.
   * @param {string} prompt
   * @param {string} size  - '1024x1024' | '1024x1792' | '1792x1024'
   * Returns the image URL.
   */
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
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        quality: 'hd',
        response_format: 'url',
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `OpenAI API error ${res.status}`);
    }

    const data = await res.json();
    return data.data?.[0]?.url || null;
  },
};
