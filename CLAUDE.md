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
- **Arabic 3D text: troika-three-text 0.52.5** (decision from step 1.2: troika works, no canvas fallback needed). Joined letters, RTL order, «», Arabic-Indic digits and mixed Arabic + Latin all render correctly. Console shows `unsupported GPOS table LookupType 5` from troika's font parser; harmless for our text (the shadda in «التقدّم» is placed correctly).
- Component `arabic-text` ([src/components/arabic-text.js](src/components/arabic-text.js)): props from the brief + `weight` (`regular`/`bold`) and `lineHeight`. Set `value` from JS with an object (`el.setAttribute('arabic-text', { value })`), never as an attribute string, because `:` and `;` are A-Frame separators. Emits `textsync` when ready.
- Fonts are imported with `?url` in [src/fonts.js](src/fonts.js) so the build copies them and respects `base`.

## Structure
- `index.html`: the `<a-scene>`.
- `src/main.js`: entry; imports A-Frame, styles, components.
- `src/components/`: A-Frame components (`arabic-text`).
- `src/fonts.js`: font URLs. `src/styles.css`: @font-face + HTML overlay styles.
- `src/dev/`: temporary test scenes (`arabic-test.js` = step 1.2 board + HTML reference; remove when the start area is built in 1.11).
- `assets/`: fonts (Tajawal for Arabic, Fira Sans for math formulas; Cairo unused). Audio/images may be added later and must stay optional.

## Decisions
See the "Decisions" table in `PLAN.md`.

## Progress
- Step 1.1 done: scaffold + HTTPS dev server.
- Step 1.2 done: shared three.js verified, `arabic-text` component (troika).

## Checking visuals without the user
Headless Chrome can render the scene: `npx vite build && npx vite preview`, then Chrome `--headless=new --ignore-certificate-errors --enable-unsafe-swiftshader --use-angle=swiftshader --remote-debugging-port=…` and grab `Page.captureScreenshot` over DevTools after a few seconds of **real** time. `--screenshot` with `--virtual-time-budget` fires before troika's web worker finishes, so text is missing.
