# Agent Guide – Mobile Shop Catalog for Phones

This file is the single source of truth for every agent working in this project.
It overrides any older environment assumptions in agent instructions.

## Environment (verified 2026-10-03)

| Tool | Status |
|---|---|
| PowerShell, browser | ✅ available |
| Node.js / npm / npx | ✅ installed (Node v24.19.0, npm 11.17.0) |
| git | ✅ installed (git version 2.55.0) |
| Next.js / React / TypeScript | ✅ installed and building cleanly |
| Google Sheets Live Sync | ✅ connected and verified (580+ products) |
| `generate_image` (image-artist) | ✅ available |
| Python | ❌ not installed (`python` is only the Microsoft Store alias) |
| FFmpeg | ❌ not installed |
| `GEMINI_API_KEY` | ❌ not set |

Implications until the user installs tools:
- Build the site with plain HTML/CSS/vanilla JS that runs by opening `index.html`.
- No image resizing/conversion scripts, no JSON validation via Python (validate by careful review).
- Video generation is blocked (see "Enabling video" below).
- Do NOT install system software yourself; report what is needed.

### Enabling video (user must run / approve)
```powershell
winget install -e --id Python.Python.3.12      # Gemini Omni pipeline
winget install -e --id Gyan.FFmpeg             # slideshow pipeline + video prep
winget install -e --id OpenJS.NodeJS           # brag / Hyperframes (Node 22+)
# then, in the project root:
python -m venv .venv; .\.venv\Scripts\pip install -U google-genai
setx GEMINI_API_KEY "<your key>"               # restart the terminal afterwards
```

## Team

| Agent | Role | Output location |
|---|---|---|
| `task-manager` | Plans, tracks `TASKS.md`, delegates, reviews | `TASKS.md` |
| `coder` | Website code | project root (e.g. `index.html`, `css/`, `js/`, `data/`) |
| `image-artist` | Logos, banners, mockups | `assets/images/` |
| `video-producer` | Promo videos | `assets/videos/` |
| `seo-content` | Copy, meta, JSON-LD, sitemap | `content/` or files named by coder |
| `research` | Read-only research | – |

## Rules
- `external/` contains third-party reference repos – read-only, never modify or ship it.
- Never invent prices, specs, stock, reviews or ratings – use placeholders like `{{PRICE}}`.
- No real people's likenesses or trademarked brand logos in generated media.
- Never print or commit API keys.
- Useful references: `external/skills/skills/engineering/*/SKILL.md`, `external/free-for-dev/README.md`,
  `external/awesome-seo-tools/README.md`, `external/awesome-llm-apps/`.
