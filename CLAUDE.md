# CLAUDE.md — notes for future sessions

Browser VR/3D experience «حين تتحدث الدوال بلغة المشاعر»: a walk along Jebel Tuwaiq with 10 math-function stations.
- `PROJECT_BRIEF.md` = the vision (background only, not a task list).
- `PLAN.md` = the agreed step-by-step plan. **Work one step at a time, only when the user names the step.** At the end of a step: tick its box, summarise, give test notes (laptop / phone / VR emulator), make **one commit** (`Step X.Y: short title`), then stop.
- Never change the Arabic content text. Ask if something looks like a typo.
- Pin every dependency exactly (`npm install --save-exact`).
- Test devices: laptop, **Android phone (Chrome)**, **Immersive Web Emulator** in Chrome. No iPhone, no Quest (still support them in code; just don't list them in test notes).
- GitHub / deploy is on hold (PLAN.md "Later", step L.1). **Don't ask about GitHub until the user brings it up**; skip it at the end of Phase 1.

## Run
- `npm install`
- `npm run dev` → `https://localhost:5173` (self-signed cert: accept the warning). The terminal also prints a `Network` URL for a phone on the same Wi-Fi. HTTPS is required for motion sensors and WebXR.
- `npm run build` → `dist/`. `BASE_PATH=/repo-name/ npm run build` for GitHub Pages.

## Stack
- Vite 8 (vanilla JS) + `@vitejs/plugin-basic-ssl`, config in `vite.config.js` (`base` from `BASE_PATH` env, default `/`).
- A-Frame 1.8.0 (npm). Its ES-module build does **not** bundle three; it does `import … from "three"`, and A-Frame depends on `three` = `npm:super-three@0.184.0`.
- **One three.js:** our package.json pins `"three": "npm:super-three@0.184.0"` (same as A-Frame) and `vite.config.js` has `resolve.dedupe: ['three']`. `npm ls three` must show every copy as "deduped". If A-Frame is upgraded, update this `three` pin to match `node_modules/aframe/package.json`.
- **Arabic 3D text = canvas, not troika** (decision in step 1.3b). troika misplaces a damma on a word-initial ت / ب / ي («تُعدّ», «بُعد», «تُمثَّل», «يُسمّى») with every font; it's troika's shaping (unsupported GPOS LookupType 5 / 8). The browser's canvas shaping is exact.
  - Component `arabic-text` ([src/components/arabic-text.js](src/components/arabic-text.js)): props from the brief + `weight` (`regular`/`bold`), `lineHeight`, `activeDistance`. Set `value` from JS with an object (`el.setAttribute('arabic-text', { value })`), never as an attribute string, because `:` and `;` are A-Frame separators. Emits `textsync` with `{ width, height }` in metres.
  - Drawing + cache in [src/text-canvas.js](src/text-canvas.js): waits for Tajawal (`arabicFontsReady()` in fonts.js: FontFace API + `document.fonts.load`), canvas sized to the wrapped text block + 0.12 em padding, 1024 px/m (em capped at 128 px, side capped at 2048), sRGB, mipmaps, anisotropy ≤ 8, premultiplied alpha. Textures are shared by a key of all drawing props, ref-counted, disposed at 0 refs. After GPU upload the canvas is shrunk to 1×1 to free CPU memory (a WebGL context loss would need a redraw; not handled).
  - Memory = w×h×4×4/3 bytes per block. Step 1.3b numbers: dev boards 34.1 MB (6 textures, temporary); station panels estimated at 51 MB for all 10, 5.5 MB for the largest → **use `activeDistance` on station panels** (≈2 stations resident ≈ 11 MB). Reserve idea if memory gets tight: single-channel (R8) textures, 4× smaller.
- **Latin math formulas = troika** via `math-text` ([src/components/math-text.js](src/components/math-text.js)), Fira Sans, SDF-sharp, cheap to update live.
  - **Glyph gaps:** none of Fira Sans / Tajawal / Cairo has subscript `ₐ` (U+2090), and Tajawal has no `ˣ` (U+02E3). Station 5's `logₐ x` must be handled in step 2.4 (e.g. a smaller, lowered "a" as its own text). On canvas panels, missing glyphs fall back to a system font.
- Fonts are imported with `?url` in [src/fonts.js](src/fonts.js) so the build copies them and respects `base`. Tajawal faces are registered from JS (used by canvas and HTML).

## Structure
- `index.html`: the `<a-scene>`.
- `src/main.js`: entry; imports A-Frame, styles, components.
- `src/content.js`: all Arabic content (verbatim from the brief) + `toArabicDigits`, `visitedText`. `npm run check:content` ([scripts/check-content.mjs](scripts/check-content.mjs)) parses the brief and compares every string both ways, character by character; run it after any edit to content or brief.
- `src/components/`: A-Frame components (`arabic-text`, `math-text`).
- `src/text-canvas.js`: canvas drawing, texture cache, memory stats for Arabic text.
- `src/fonts.js`: font URLs + `arabicFontsReady()`. `src/styles.css`: HTML overlay styles.
- `src/dev/`: temporary test scenes (`arabic-test.js` = intro boards + a board of every word with harakat, each mirrored in an HTML reference, a math-text sample, live texture memory; remove when the start area is built in 1.11).
- `assets/`: fonts (Tajawal for Arabic, Fira Sans for math formulas; Cairo unused). Audio/images may be added later and must stay optional.

## Decisions
See the "Decisions" table in `PLAN.md`.

## Progress
- Step 1.1 done: scaffold + HTTPS dev server.
- Step 1.2 done: shared three.js verified, `arabic-text` component (troika).
- Step 1.3 done: `content.js` + `check:content`. Found the troika damma bug (see Stack).
- Step 1.3b done: `arabic-text` switched to canvas; `math-text` (troika) for formulas.

## Checking visuals without the user
Headless Chrome can render the scene: `npx vite build && npx vite preview`, then Chrome `--headless=new --ignore-certificate-errors --enable-unsafe-swiftshader --use-angle=swiftshader --remote-debugging-port=…` and grab `Page.captureScreenshot` over DevTools after a few seconds of **real** time. `--screenshot` with `--virtual-time-budget` fires before fonts/workers finish, so text is missing. `Runtime.evaluate` (with `awaitPromise`) can move the camera (`document.querySelector('[camera]').object3D.position`) for close/far checks.
