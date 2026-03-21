# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Micas is a **static, client-side PWA** (vanilla ES6 modules, no framework, no build step). All files are served as-is — there is no bundler, transpiler, or `package.json`.

### Running the dev server

Serve the repo root over HTTP (required — `file://` will fail due to ES module / CORS restrictions):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/` in Chrome.

### Key caveats

- **No package manager or build step.** There is no `npm install`, `pip install`, or equivalent. Three.js is vendored at `vendor/three.module.js`.
- **No test framework.** The repo has no automated tests, no linter config, and no CI pipeline.
- **No backend.** All persistence uses browser IndexedDB. The only external call is to the optional OpenRouter AI API.
- **Service Worker caching** can cause stale assets during development. To bypass, open DevTools → Application → Service Workers → check "Update on reload", or use an incognito window.
- **AI features are optional.** The rule-based engine (`js/ai/rule-based.provider.js`) works offline. To enable AI, add an OpenRouter API key in the app's Settings page.
