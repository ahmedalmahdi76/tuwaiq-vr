# CLAUDE.md — notes for future sessions

Browser VR/3D experience «حين تتحدث الدوال بلغة المشاعر»: a walk along Jebel Tuwaiq with 10 math-function stations.
- `PROJECT_BRIEF.md` = the vision (background only, not a task list). **§11 = art direction** (watercolour slides look, light ribbons, time of day, lanterns, opening, heart finale, phone-cheap tricks + quality settings); it wins over §3/§4/§8.
- `reference/` (project root) = slide images 1–5 from the presentation (slide-01 heart + light lines, slide-03 Tuwaiq photo, slide-04 paper card style). **Visual reference only, never import them into the build.** (As of step 1.5 the folder wasn't on disk yet; the user shared the slides in chat.)
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
- **Quality** (step V.1): [src/quality.js](src/quality.js) exports a frozen `quality` = `{ level, source, device, ...settings }`. Level is auto (desktop → high, phone → medium, headset → medium) or `?quality=low|medium|high`. Per-level settings live in its `SETTINGS` table (`maxPixelRatio`, `terrainStep`, …); every new effect adds its own entry there and reads `quality.x`, never the device directly. `applyQuality(scene)` caps the pixel ratio. Changing level = page reload.
- Fonts are imported with `?url` in [src/fonts.js](src/fonts.js) so the build copies them and respects `base`. Tajawal faces are registered from JS (used by canvas and HTML).
- **Environment** (step 1.4): `<a-scene sunset-environment>` ([src/components/sunset-environment.js](src/components/sunset-environment.js)) adds the shader sky dome (gradient + sun disc + glow, follows the camera, no fog), linear fog, one directional sun light and one hemisphere light. All values in [src/world-config.js](src/world-config.js) (`SKY`, `SUN`, `FOG`, `LIGHTS`, `sunDirection()`). Sun: azimuth 15° right of the spawn's forward (−z), 5° up.
  - **Light units:** three r155+ is physical: intensity ≈ π equals the old "1.0". Our sun 4.5, hemisphere 3.6.
  - Fog: linear 150–2600 m (tuned in 1.5 so the plain shows below the cliff and melts into the gold horizon).
  - Lights: warm gold sun against a lilac hemisphere sky light, so shade reads mauve like the slides.
- **Terrain** (step 1.5): math in [src/terrain.js](src/terrain.js) (pure, no three): `edgeZ(x)` rim line (plain on the −z side, headlands jut out), `rowZ(x, d)` mesh rows (hug the rim, relax to `smoothEdgeZ` past 30–140 m inland so coarse/fine grids meet), `plateauHeight`, `plainHeight` (PLAIN_Y = −140), `wadi`, `terrainHeight` = plateau + `addHeightModifier()` fns (for station landmarks), `spawnPoint()` (x 0, 7 m behind the rim, facing −z).
  - Meshes in [src/components/tuwaiq-terrain.js](src/components/tuwaiq-terrain.js): near plateau band (0–150 m inland, 4 m columns in x −150…800), far plateau (coarse, overlaps 5 m, sunk 0.4 m), cliff curtain (8 strata layers with ledges/undercuts, noise columns, scree slope), plain (60 m grid). One shared flat-shaded vertex-colour MeshStandardMaterial. ~76k triangles total, built in <100 ms. World spans x −3000…3400 so the ends hide in the fog.
  - Camera `near: 0.1; far: 6000` (A-Frame's default near 0.005 would z-fight at kilometre distances).
  - Sky colours are passed as `THREE.Color` uniforms (linear) and the shader ends with `colorspace_fragment`, so they match the hex values on screen.

## Structure
- `index.html`: the `<a-scene>`.
- `src/main.js`: entry; imports A-Frame, styles, components.
- `src/content.js`: all Arabic content (verbatim from the brief) + `toArabicDigits`, `visitedText`. `npm run check:content` ([scripts/check-content.mjs](scripts/check-content.mjs)) parses the brief and compares every string both ways, character by character; run it after any edit to content or brief.
- `src/components/`: A-Frame components (`arabic-text`, `math-text`).
- `src/text-canvas.js`: canvas drawing, texture cache, memory stats for Arabic text.
- `src/fonts.js`: font URLs + `arabicFontsReady()`. `src/styles.css`: HTML overlay styles.
- `src/world-config.js`: sky / sun / fog / light values.
- `src/noise.js`: deterministic value noise / fBm / smoothstep. `src/terrain.js`: terrain math.
- `src/dev/`: temporary dev helpers. `arabic-test.js` = Arabic text boards with HTML reference + texture memory, only with `?text` (remove in 1.11). `fps-meter.js` = `?stats` overlay (fps, worst frame, triangles, draw calls, pixel ratio, quality; tap to cycle quality); uses the scene tick so it works in VR. `camera-presets.js` = fly-camera viewpoints `?cam=spawn|edge|aerial|below`, keys 1–4 (remove when movement exists, 1.7).
- `index.html`: `#rig` holds the camera; temporary `wasd-controls="fly: true"` until 1.7.
- `assets/`: fonts (Tajawal for Arabic, Fira Sans for math formulas; Cairo unused). Audio/images may be added later and must stay optional.

## Decisions
See the "Decisions" table in `PLAN.md`.

## Progress
- Step 1.1 done: scaffold + HTTPS dev server.
- Step 1.2 done: shared three.js verified, `arabic-text` component (troika).
- Step 1.3 done: `content.js` + `check:content`. Found the troika damma bug (see Stack).
- Step 1.3b done: `arabic-text` switched to canvas; `math-text` (troika) for formulas.
- Step 1.4 done: sky, sun, fog, lights.
- Step 1.5 done: Tuwaiq terrain (plateau, layered cliff, plain), fog retuned, dev camera presets.
- Step V.1 done: quality levels + `?stats` FPS meter. Terrain: ~86k tris high / ~76k medium / ~66k low.
- Proposed for V.2 (from the reference slides; pending the user's OK): layered hazy ridges + clearer branching wadis on the plain, mauve-tinted low haze, more and thinner cliff strata with deeper vertical clefts and a pale cream cap rock, cooler grey-brown variation on the plain.
- Agreed for later: time of day follows the **furthest** point reached (1.12); the opening is skippable by tap/click/key and may show the label «تخطٍّ» in a corner (1.13; user-provided text; add it to content.js and the brief's UI strings then).

## Checking visuals without the user
**Stopping test processes:** only by command line (`chrome-profile` user-data-dir, or `vite` + `tuwaiq`) via `Get-CimInstance Win32_Process`. Never `taskkill /IM chrome.exe`: that closes the user's own browser. Headless fps (SwiftShader, ~10 fps) is meaningless; real fps come from the user's devices.

Headless Chrome can render the scene: `npx vite build && npx vite preview`, then Chrome `--headless=new --ignore-certificate-errors --enable-unsafe-swiftshader --use-angle=swiftshader --remote-debugging-port=…` and grab `Page.captureScreenshot` over DevTools after a few seconds of **real** time. `--screenshot` with `--virtual-time-budget` fires before fonts/workers finish, so text is missing. `Runtime.evaluate` (with `awaitPromise`) can move the camera (`document.querySelector('[camera]').object3D.position`) for close/far checks.
