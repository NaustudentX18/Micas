# Micas — AI-Powered CAD Assistant for 3D Printing

A mobile-first Progressive Web App (PWA) that helps you design 3D-printable parts without traditional CAD skills.

## Features

- **AI-assisted design briefs** — describe what you want to build, answer a few questions, and get a ready-to-generate design brief
- **12 parametric generators** — Box, Bracket, Spacer, Organizer, Phone Stand, Enclosure, Adapter, Gear, Threaded Connector, Hinge, Snap-Fit, and Custom
- **3D preview** — interactive Three.js viewer with wireframe toggle and touch controls
- **Engineering validation** — checks for thin walls, overhangs, and orientation recommendations
- **Export center** — STL, OpenSCAD, Bambu Studio sheet, MakerWorld listing, job summary, and more
- **Import STL** — import any existing `.stl` file for preview and re-export
- **Fully offline** — works without internet after first load (PWA service worker)
- **Local-only storage** — all data stays on your device (IndexedDB)

## Free Online Deployment

No build step required — this is plain HTML + ES6 modules.

### Option A: GitHub Pages (free)

1. Go to your repository → **Settings → Pages**
2. Set **Source** to `Deploy from a branch`
3. Select branch `main` (or your default branch) and folder `/ (root)`
4. Click **Save** — your app will be live at `https://<your-username>.github.io/<repo-name>/`

> The `.nojekyll` file in the repo root disables Jekyll processing, which is required for ES6 module paths to work correctly.

### Option B: Netlify (free, recommended)

1. Go to [netlify.com](https://netlify.com) and sign up for free
2. Click **Add new site → Import an existing project**
3. Connect your GitHub account and select this repository
4. Leave all build settings blank (no build command, publish directory is `.`)
5. Click **Deploy** — your app will be live in ~30 seconds

The `netlify.toml` and `_redirects` files in the repo handle all routing and security headers automatically.

### Option C: Drag-and-drop on Netlify

1. Zip the entire repository (excluding `.git`)
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
3. Drag the zip file onto the page — done

## AI Setup (Optional)

The app works fully offline using a built-in rule-based engine. For enhanced AI analysis:

1. Visit [openrouter.ai/keys](https://openrouter.ai/keys) and create a free account
2. Generate an API key
3. Open the app → **Settings** → paste your API key
4. Several models (Gemini 2.0 Flash, Llama 3.1, Phi-3) are free with no usage limits

## Usage

1. **New Project** → describe what you want to build
2. **Questions** → answer a few questions about material and constraints
3. **Brief** → review the AI-generated design summary
4. **Generator** → pick a part type and tune the parameters
5. **Preview** → rotate and inspect the 3D model
6. **Export** → download STL, OpenSCAD, or other formats

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | Vanilla ES6 modules, no framework |
| 3D Preview | [Three.js](https://threejs.org) (bundled) |
| Storage | IndexedDB (all local) |
| AI | [OpenRouter](https://openrouter.ai) (optional) |
| Offline | Service Worker (PWA) |
