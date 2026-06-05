# KP Media Hub — Sprint 1

King Philip Regional High School Digital Media tool.
AI-powered caption writer, image studio, content calendar, and post history.

---

## Quick Start

1. **Drop your KP logo** → place `kp-logo.png` inside the `assets/` folder
2. **Open in browser** → just double-click `index.html` (no server needed for browsing)
3. **Enter API keys on first load** — you'll be prompted automatically
4. **To deploy** → drag the whole folder to [vercel.com/new](https://vercel.com/new) and hit deploy

---

## API Keys needed

| Key | Where to get it | Cost |
|-----|----------------|------|
| Claude API key (`sk-ant-...`) | [console.anthropic.com](https://console.anthropic.com) | ~free for light use |
| OpenAI API key (`sk-...`) | [platform.openai.com](https://platform.openai.com) | ~$0.04/image |

Keys are saved to each user's browser localStorage. Each team member enters their own.

---

## Project Structure

```
kp-media-hub/
├── index.html              ← main shell, all screens laid out here
├── assets/
│   └── kp-logo.png         ← DROP YOUR KP LOGO HERE
├── styles/
│   └── main.css            ← all styles, CSS variables, dark theme
└── js/
    ├── storage.js          ← all localStorage read/write (single source of truth)
    ├── api.js              ← Claude API + OpenAI API calls (edit models/params here)
    ├── app.js              ← core shell: navigation, mode toggle, settings, toast
    ├── captions.js         ← caption studio: generation, copy, save
    ├── image-studio.js     ← image studio: upload, vision analysis, prompt build, DALL·E
    ├── calendar.js         ← content calendar: render, add/delete entries
    ├── history.js          ← post history: render, filter, search, delete
    └── init.js             ← bootstrap: onboarding check, app start
```

---

## Sprint 2 Ideas (build on top of this)

- [ ] **Team sync** — export/import JSON blobs so partners can share drafts
- [ ] **Caption tone memory** — remember each user's preferred tone per mode
- [ ] **Hashtag manager** — custom hashtag sets per sport/event type
- [ ] **Bulk calendar import** — paste a schedule CSV, auto-populate calendar
- [ ] **Post preview** — mock IG square preview with overlaid caption
- [ ] **Score template** — quick scoreboard graphic generator (e.g. KP 21 - Franklin 14)

## Sprint 3 Ideas

- [ ] **Canva-style editor** — drag-and-drop text/image composer for school posts
- [ ] **Real-time team sync** — Supabase backend for shared drafts
- [ ] **Analytics** — track how many posts per week/month by mode and person
- [ ] **Instagram direct post** — Meta API integration (requires app review)

---

## Customization

### Change the AI model
Edit `js/api.js` → `claude()` method → change `model: 'claude-opus-4-6'`

### Add a new sport
Edit `js/captions.js` → `HASHTAGS` object → add your sport key + hashtags
Then add `<option value="yourkey">Sport Name</option>` to the select in `index.html`

### Change brand colors
Edit `styles/main.css` → `:root` block → `--green` and `--gold` variables

### Add a new screen
1. Add screen HTML in `index.html` as `<section class="screen" id="screen-newscreen">`
2. Add a nav button in the sidebar with `data-screen="newscreen"`
3. Add the screen to `APP.SCREENS` in `js/app.js`
4. Create `js/newscreen.js` and add `<script src="js/newscreen.js">` to `index.html`
