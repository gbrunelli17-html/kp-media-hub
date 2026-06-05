# KP Media Hub

King Philip Regional High School Digital Media tool.
AI-powered caption writer, image studio, content calendar, and post history.

**Live demo:** https://gbrunelli17-html.github.io/kp-media-hub/
**Repo:** https://github.com/gbrunelli17-html/kp-media-hub

---

## Quick Start

1. **Drop your KP logo** → place `kp-logo.png` inside the `assets/` folder
2. **Open in browser** → double-click `index.html` or use the live demo link above
3. **Enter API keys on first load** — you'll be prompted automatically
4. **To deploy** → push to GitHub (GitHub Pages) or import to [Vercel](https://vercel.com/new)

---

## API Keys

| Key | Where to get it | Used for |
|-----|----------------|----------|
| Claude API key (`sk-ant-...`) | [console.anthropic.com](https://console.anthropic.com) | Captions, vision analysis, prompt building |
| OpenAI API key (`sk-...`) | [platform.openai.com](https://platform.openai.com) | GPT Image generation + photo stylization |

Keys are saved per-browser in localStorage. Each team member enters their own.

**Cost notes:**
- Claude: mostly free for light team use
- GPT Image text generation: ~$0.04/image
- GPT Image edits (photo stylization): higher cost, scales with number of input images

---

## What's Shipped

| Feature | Status |
|---------|--------|
| Caption Studio (3 variants, vibes, tone slider) | Shipped |
| Image Studio — text-only generation (GPT Image) | Shipped |
| Image Studio — single player photo stylization | Shipped |
| Image Studio — drag-and-drop uploads | Shipped (Sprint 2) |
| Image Studio — multiple player photos | Shipped (Sprint 2) |
| Image Studio — pro style reference matching | Shipped (Sprint 2) |
| Content calendar | Shipped |
| Post history | Shipped |
| Sports / School mode toggle | Shipped |

---

## Image Studio Workflow

1. **Player photos** — drag or click to add up to 8 game photos
2. **Style reference** (optional) — upload an NFL/MLB/ESPN post screenshot to match layout and graphic style
3. **Describe** what you want + pick a style preset and format
4. **Build stylize prompt** — Claude analyzes photos and reference, writes an optimized prompt
5. **Stylize post** — GPT Image edits API combines your images into a KP-branded post
6. **Download** or save to history

Without player photos or a reference, Image Studio generates a new image from text only.

**Limitations:**
- AI matches pro post *style*, not pixel-perfect templates
- Do not copy pro team logos from reference images
- Player likeness may vary, especially with multiple athletes
- More input images = higher API cost

---

## Project Structure

```
kp-media-hub/
├── index.html              ← main shell, all screens
├── assets/
│   └── kp-logo.png         ← KP logo
├── styles/
│   └── main.css            ← all styles, dark theme
└── js/
    ├── storage.js          ← localStorage read/write
    ├── api.js              ← Claude + GPT Image API calls
    ├── app.js              ← navigation, settings, dashboard
    ├── captions.js         ← caption studio
    ├── image-studio.js     ← upload, vision, stylize/generate
    ├── calendar.js         ← content calendar
    ├── history.js          ← post history
    └── init.js             ← bootstrap / onboarding
```

---

## Sprint 3 Backlog

- [ ] **Team sync** — export/import JSON blobs so partners can share drafts
- [ ] **Caption from photo** — generate captions from uploaded player photos
- [ ] **Caption tone memory** — remember preferred tone per mode
- [ ] **Hashtag manager** — custom hashtag sets per sport/event type
- [ ] **Bulk calendar import** — paste a schedule CSV
- [ ] **Post preview** — mock IG square preview with overlaid caption
- [ ] **Score template** — quick scoreboard graphic generator
- [ ] **Canva-style editor** — drag-and-drop text/image composer
- [ ] **Real-time team sync** — Supabase backend
- [ ] **Analytics** — posts per week/month tracking
- [ ] **Instagram direct post** — Meta API (requires app review)

---

## Customization

### Change the AI model
Edit `js/api.js` → `claude()` → change `model: 'claude-opus-4-6'`

### Add a new sport
Edit `js/captions.js` → `HASHTAGS` object
Add `<option>` to the sport select in `index.html`

### Change brand colors
Edit `styles/main.css` → `:root` → `--green` and `--gold`

### Add a new screen
1. Add `<section class="screen" id="screen-name">` in `index.html`
2. Add sidebar nav button with `data-screen="name"`
3. Add to `APP.SCREENS` in `js/app.js`
4. Create `js/name.js` and add script tag to `index.html`
