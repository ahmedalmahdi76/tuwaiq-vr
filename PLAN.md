# PLAN — حين تتحدث الدوال بلغة المشاعر (VR)

How to use this file:
- We work **one step at a time, in order**. I start a step only when you tell me which one.
- When a step is done I tick its box, summarise what changed, list how to test it on **laptop / phone / VR emulator**, then stop.
- Each step ends with something visible or testable in the browser.
- Changes to this plan happen only after you agree.
- Every finished step ends with **one git commit**, message like `Step 1.4: sky, sun, fog and lights`, so we can go back to any step.

Legend for test notes: 💻 laptop · 📱 phone (same Wi-Fi, `https://<laptop-LAN-IP>:5173`) · 🥽 VR (Immersive Web Emulator in Chrome, or a Quest).

---

## Decisions (confirmed)

| # | Topic | Decision |
|---|---|---|
| A1 | Fonts | `assets/Tajawal/Tajawal-Regular.ttf` + `Tajawal-Bold.ttf` for all Arabic. **Fira Sans** (also in `assets/`) for the Latin math formulas, because Tajawal may not have glyphs like `ₐ`, `ˣ`, `√`, `³`. Cairo stays unused. |
| A2 | Formula text | The info panel shows the formula **exactly as in the content** (e.g. `f(x) = |x|`). The sculpture label above the curve shows the **live parameterised** form (e.g. `f(x) = 2·|x|`). |
| A3 | Arabic text | Copied verbatim into `src/content.js`. A small check script compares it to `PROJECT_BRIEF.md` so nothing changes by accident. The typo «سنتعرض» was fixed to «سنتعرف» in the brief. |
| A4 | Sounds | Chime and glow sounds are synthesised with Web Audio (no audio files needed). Narration files are optional and detected at build time. |
| A5 | Visited state | Resets on every page load. |
| A6 | Station 9 ranges | a: −2 → 2 step 0.5 (skipping 0), b: −2 → 2 step 0.5, c: −2 → 2 step 0.5. |
| A7 | Station 2 "semi-transparent ground" | A **translucent glowing glass patch** set into the ground, with the roots visible below it. |
| A8 | Git | `git init` in step 1.1; one commit per finished step. GitHub / deploy is **on hold**: see "Later" at the end of this plan. |
| A9 | Shared three.js | troika-three-text imports `three`. A Vite alias points `three` at the **same npm package A-Frame depends on** (checked in `node_modules/aframe/package.json`, expected `super-three`), so troika and A-Frame share one copy. Verified in step 1.2 before anything else depends on it. |
| A10 | Test devices | **Android phone (Chrome) + Immersive Web Emulator in Chrome.** No iPhone, no Quest. iOS support and real-headset support are still built as the brief requires, but test notes only list 💻, 📱 Android and 🥽 emulator. |
| A11 | Art direction | Brief §11 is the visual target and wins over §3/§4/§8 where they differ. Glow, watercolour, particles and lanterns use only cheap tricks, and every effect has a quality setting. Phase 1.5 sets the look; you approve it before continuing. |
| A12 | New Arabic text | No new visible Arabic text is invented. Anything that would need new words (e.g. a "skip" label) uses an icon or a gesture instead, unless you give me the exact text. |

---

## Phase 1 — Foundation
Goal: open it on laptop and phone and walk around Jebel Tuwaiq at sunset, with correct Arabic text at the start.

- [x] **1.1 Project scaffold + HTTPS dev server**
  Vite (vanilla JS), A-Frame, `@vitejs/plugin-basic-ssl`, all versions pinned exactly. `vite.config.js` with `server.host = true` and `base` read from an env variable (default `/`). `index.html` with an empty `<a-scene>` and one test box. `git init`, `.gitignore`, first version of `CLAUDE.md`.
  *Test:* 💻 `npm run dev`, open `https://localhost:5173`, see the box. 📱 open the LAN URL printed in the terminal, accept the certificate warning, see the box.

- [x] **1.2 `arabic-text` component (Arabic rendering proof)**
  First, set up the `three` alias (A9) and confirm only one three.js copy is loaded (no "Multiple instances of Three.js" warning, and troika's objects render inside the A-Frame scene). Then wrap troika-three-text in an A-Frame component (`value, fontSize, color, maxWidth, align, direction, anchorX, anchorY`) using Tajawal. Test scene shows the title, one long quote with «» and punctuation, Arabic-Indic digits, and mixed Arabic + `f(x)`. A plain HTML version of the same lines sits beside it for comparison. If troika fails, switch to the canvas-texture fallback. I will tell you which approach we kept.
  *Test:* 💻 DevTools console has no duplicate-three.js warning. 💻📱 letters are joined, words are in right-to-left order, punctuation at the correct end, and the 3D text matches the HTML reference.

- [x] **1.3 `src/content.js` with all Arabic content**
  Intro texts, 10 stations (name, formula, subtitle, math, life, quote), UI strings, movement hints, author credit. Plus a small script `npm run check:content` that confirms every string matches `PROJECT_BRIEF.md` exactly.
  *Test:* 💻 `npm run check:content` prints "all match". The test scene shows the intro panel text loaded from `content.js`.

- [x] **1.3b Canvas rendering for all Arabic text** *(added after 1.3: troika misplaces a damma on word-initial ت/ب/ي)*
  `arabic-text` keeps the same API but draws with a 2D canvas (browser shaping) into a texture: waits for Tajawal via `document.fonts.load`, sizes the canvas to the text block, mipmaps + anisotropic filtering, a resolution chosen for VR reading distance, a shared cache (redraw only when the text changes, dispose unused textures), and optional near-only creation (`activeDistance`) for the phone memory budget. troika stays only for Latin math formulas (new `math-text` component, Fira Sans).
  *Test:* 💻📱 the marks board matches the HTML reference for every word, especially «تُعدّ», «بُعد», «تُمثَّل», «يُسمّى»; text is sharp up close and readable from a few metres; the dev panel shows the texture memory total.

- [x] **1.4 Sky, sun, fog and lights**
  Gradient sky (`#F7C98B` → `#E9A9B8` → `#B59AB8`), low sun disc on the horizon, fog matching the horizon colour, one directional light (sun) + one hemisphere light.
  *Test:* 💻📱 look around: warm gold at the horizon, pink above, mauve at the top, sun low on one side, distant objects fade into the fog.

- [ ] **1.5 Terrain: `terrainHeight(x, z)` + plateau mesh with cliff edge** *(final art, not a placeholder)*
  Height function for a low-poly plateau with a dramatic cliff on one side and a wide desert plain far below. Flat-shaded mesh in the slide palette: sand, rose and terracotta, with Tuwaiq's horizontal rock layers as soft colour bands down the cliff face and gentle colour blotches on top (vertex colours, no extra textures yet). Built so stations can add local shapes to it later. Fog distances are tuned here against the real cliff view. Removes the flat test floor and pillars from 1.4.
  *Test:* 💻📱 a temporary fly camera (keyboard / drag) shows the plateau, the layered cliff and the plain below fading into the haze. No gaps or spikes in the mesh. It already looks like a place, not a test.

---

## Phase 1.5 — Visual target
Goal: the start area at its **final look** (brief §11). Every station later copies this look, so you review and approve it before anything else continues. Each effect gets a lighter version for the phone (see §11 performance rules).

- [ ] **V.1 Quality settings + FPS meter**
  One `quality` value (low / medium / high), chosen automatically (desktop = high, phone = medium, VR headset = medium) and overridable with `?quality=low|medium|high`. Every later effect reads it. Dev FPS meter with `?stats` (moved here from 1.10).
  *Test:* 💻📱 `?stats` shows fps and the chosen quality; `?quality=low` changes the label.

- [ ] **V.2 Watercolour paper look**
  One small tiling paper-grain texture, generated once in code and shared, laid over the terrain and the sky with soft colour variation so nothing looks flat or digital.
  *Test:* 💻📱 up close the ground looks like painted paper; no visible tiling pattern at eye height; fps unchanged with `?stats`.

- [ ] **V.3 Time-of-day system**
  A single `journey` value from 0 to 1 drives everything: golden sunset (0) → deeper pink and purple (≈0.5) → starry night (1). The sky gradient, sun height (it sets), fog colour and distance, light colours and a star field all follow it, using only uniform and colour changes. Text and panels stay readable at night. Dev controls: `?time=0.6` and the `[` / `]` keys to scrub.
  *Test:* 💻📱 scrub from 0 to 1: smooth change with no stutter, the sun sinks, stars fade in at night, the ground is still visible.

- [ ] **V.4 Atmosphere: particles, clouds, sun rays**
  Slow floating light motes / petals (one instanced object, animated in the shader; count set by quality), a few soft watercolour cloud sprites, and sun rays as additive gradient fans near the sun (off on low quality). They follow the time of day: rays fade at dusk, and motes become fireflies at night.
  *Test:* 💻📱 gentle motion everywhere, nothing flickers; `?quality=low` visibly reduces the effects; phone fps stays 30+.

- [ ] **V.5 Lantern + dim trail sample**
  One low-poly stone lantern: an emissive core, an additive glow sprite and a baked light pool on the ground (no real lights). A "light up" animation with a soft synthesised chime, and a short piece of trail that stays dim until it's lit, then glows. Dev key `L` toggles it.
  *Test:* 💻📱 press `L`: the lantern lights up with a chime and the trail piece glows; it reads clearly at night (`?time=1`).

- [ ] **V.6 Watercolour panel**
  The panel component in its final style: a paper card with a watercolour texture, two stacked offset layers (pink / purple), small dried white flowers in a corner, and Arabic text via `arabic-text`. It fades in. Built as the real «جبل طويق» intro panel; stations (2.3) and the second intro panel (1.11) reuse it. One shared paper texture for all panels.
  *Test:* 💻📱 the panel looks like a slide card, not a box; text matches the HTML reference; it fades in smoothly.

- [ ] **V.7 Light ribbon curve + drawing animation**
  A `light-curve` component: a glowing ribbon (soft core plus a wider faint halo, additive, baked gradient) sampled once from y = f(x), with breaks handled as separate pieces. It draws itself: a spark travels along the curve (shader `progress` uniform) and the ribbon then glows softly. Faint axes as lines of light, with the formula label (`math-text`) floating above. Samples: the glowing sine wave from slide 1 above the start area, and `f(x) = |x|`.
  *Test:* 💻📱 trigger the drawing (dev key `D`): the spark draws the curve smoothly, then it glows; no geometry rebuilds during the animation.

- [ ] **V.8 Visual target review** *(gate)*
  The start area put together with everything above: terrain, sky, paper look, particles, clouds, rays, a lantern with a trail piece, the جبل طويق panel, light curves, and the time-of-day scrubber. You review on laptop and phone; I tune until you approve. I record phone fps for each quality level in `CLAUDE.md`.
  *Test:* 💻📱 your approval. Nothing after this step starts before it.

---

## Phase 1 (continued) — Trail, movement and start area

- [ ] **1.6 Trail layout + unlit lanterns**
  Define the trail waypoints (start → 1 … 10 → closing lookout) running near the cliff edge, in one data list. Draw the dim trail on the ground (it glows later, piece by piece, as stations are visited). Put an **unlit lantern** (from V.5) at each station position, plus a small number marker in alternating pink / purple.
  *Test:* 💻 fly along the trail: it follows the edge, the view is always there, 10 lanterns plus the lookout point in the right order.

- [ ] **1.7 Desktop movement with terrain following**
  WASD + arrows, Shift to walk faster, mouse drag to look, click for pointer lock, Esc to release. Eye height follows `terrainHeight` smoothly. Invisible boundary stops the player at the cliff edge and at the world edge. Replaces the fly camera. Dev shortcut: `?station=5` in the URL starts the player at that station (`?station=end` for the closing lookout).
  *Test:* 💻 walk between two stations in about 10–15 s; walk up and down slopes without sinking or floating; you cannot walk off the cliff. Open `?station=5` and start in front of pillar 5.

- [ ] **1.8 Start screen (HTML overlay) + device detection**
  Simple overlay with the title, credit and the "ابدأ الرحلة" button (RTL, Tajawal). Detects desktop / phone / VR-capable. The button is where iOS will ask for motion-sensor permission (next step). A full loading screen with a progress bar comes in Phase 6.
  *Test:* 💻📱 overlay appears first, Arabic is correct, button starts the scene.

- [ ] **1.9 Phone movement: joystick, touch-look, gyro**
  Semi-transparent joystick bottom-left. Drag on the screen to look. Tilt-to-look with the gyroscope (permission request from "ابدأ الرحلة" on iOS). Same terrain following and boundaries as desktop.
  *Test:* 📱 Android Chrome and iPhone Safari: walk with the joystick, look by dragging and by turning the phone, cannot walk off the cliff.

- [ ] **1.10 Decoration: rocks, dried white flowers, desert plants**
  Instanced low-poly rocks, dried white flowers like the slides, and small desert plants in the watercolour palette, scattered on the plateau but kept off the trail. Counts depend on quality (V.1).
  *Test:* 💻📱 decoration looks natural and avoids the trail; with `?stats` the frame rate stays 30+ on the phone.

- [ ] **1.11 Start area: 3D title, welcome, credit, hint, intro panels**
  Spawn facing the cliff and the sun. Big floating title, «مرحبا بكم في مشروعنا», author credit, device-matched movement hint, and both intro panels (جبل طويق, ما هي الدوال؟) in the V.6 watercolour style. Removes the dev test boards.
  *Test:* 💻📱 on load you face the sunset, all text is readable and correct, the hint matches the device.

- [ ] **1.12 Time of day follows the journey**
  The V.3 `journey` value is driven by how far along the trail the player has come: golden at the start, night by station 10. It follows the **furthest point reached**, so walking back doesn't turn night back into day; it changes slowly and smoothly. `?station=` and `?time=` still work for testing.
  *Test:* 💻📱 walk (or use `?station=3`, `?station=7`, `?station=10`): the sky deepens from gold to pink and purple to night; walking back keeps the later sky.

- [ ] **1.13 Cinematic opening**
  After "ابدأ الرحلة", the camera rises from the desert plain up the cliff face to the top of Tuwaiq (about 8–10 s, smooth easing), and the title appears written in light. Then control starts. A tap / click / key skips it (no new text added). **VR:** no camera flight, which causes motion sickness; instead a short fade sequence from a plain view to the cliff top, then the title (see notes).
  *Test:* 💻📱 the flight is smooth with no stutter, the title writes itself in light, skipping works; 🥽 the fade version is comfortable.

- [ ] **1.14 Phase 1 checkpoint**
  Update `CLAUDE.md` (how to run, structure, decisions so far). Quick review on laptop and phone; list anything to adjust before Phase 2.
  *Test:* 💻📱 from the opening to the last lantern: the full walk, with the sky changing along the way.

---

## Phase 2 — Generic station system + stations 1 and 3 complete
Goal: two finished stations that act as the template. Review the look and feel before copying the pattern.

- [ ] **2.1 `src/functions.js`: math and parameters**
  For each station: `f(x, params)`, parameter list (name, min, max, step, default, skipped values like 0), a sample x-range, the live formula label, and where the function is undefined (1/x at 0, log for x ≤ 0, jumps in floor). Plus `npm run check:functions` that prints sample values and checks clamping.
  *Test:* 💻 `npm run check:functions` shows correct values (e.g. |−2| = 2, log₂ 8 = 3, [2.7] = 2) and no NaN where the function is defined.

- [ ] **2.2 Station entities generated from data**
  A `station` component builds each station at its trail position from `content.js` + `functions.js`: its lantern, number, colour theme (pink odd / purple even).
  *Test:* 💻 10 stations in the right places, colours alternate correctly.

- [ ] **2.3 Info panel**
  The V.6 watercolour card in the station tint (pink odd / purple even layers): station number, name (big), subtitle, math text, life text, quote styled as a quote. Right-aligned RTL. Slowly turns to face the player. (Generic, so all 10 stations get their panel here.)
  **No pop-in:** panel textures are near-only (`activeDistance`, see 1.3b) but created at a larger distance than where the panel becomes visible (load early), and the panel fades in. If creating a panel causes a visible stutter on the phone, spread the work over several frames (e.g. one text block per frame).
  *Test:* 💻📱 walk around a panel: it turns smoothly toward you, all text fits, nothing overflows, colours match the station. Walk toward a station from far away: the panel fades in smoothly, never pops, and there's no stutter on the phone.

- [ ] **2.4 Light curves for all stations**
  Each station gets the V.7 light ribbon floating in the air, generated from its f(x), with faint axes of light and the live formula label above (Fira Sans; station 5's `ₐ` drawn as a small lowered "a", since no font has that glyph). Breaks (asymptotes, steps) are separate pieces. The curve draws itself the first time the visitor arrives. (Generic, so all 10 shapes appear here.)
  *Test:* 💻 each of the 10 curves has the correct shape; no stray lines across the 1/x asymptote or between floor steps; `logₐ` shows a real subscript.

- [ ] **2.5 Parameter control (3D − / + buttons)**
  `param-control` component: − and + buttons and the value label (`a = 2`). Clicking with mouse or tapping on phone changes the value within its range and rebuilds only that curve (once per change, never per frame). Supports more than one row (needed by stations 3, 7, 9).
  *Test:* 💻 click − / + on station 1: the value changes in steps, stops at the min/max, and the curve updates instantly. 📱 the same with taps.

- [ ] **2.6 Terrain landmarks system + station 1 V-canyon**
  Stations add a local shape to `terrainHeight` with a smooth blend into the plateau. Only the affected terrain section is rebuilt when a parameter changes. Station 1: V-shaped canyon; the trail goes down one side and up the other; `a` changes its steepness (clamped to stay walkable).
  *Test:* 💻📱 walk through the canyon; change `a` while standing in it: the ground and the sculpture both update and you stay on the ground.

- [ ] **2.7 Station 3: linear ramp toward the horizon**
  Straight ramp pointing at the horizon; `m` changes the slope and `b` the starting height (two control rows).
  *Test:* 💻📱 walk up the ramp; change `m` and `b`: ramp and sculpture both update; negative `m` gives a gentle downhill.

- [ ] **2.8 Visited state: lantern, chime, curve, glowing trail**
  When the player first comes near a station: its lantern lights up with the soft chime, the light curve draws itself, the trail piece leading to it starts to glow, and the station is marked as visited in a small shared state object (used later by the HUD, the time of day and the quiz).
  *Test:* 💻 reach station 1: chime once, the lantern lights, the curve draws; leaving and returning doesn't repeat it; after a few stations, looking back shows the path glowing along the cliff edge.

- [ ] **2.9 Phase 2 review**
  You review stations 1 and 3 on laptop and phone. I apply look-and-feel changes before Phase 3. Update `CLAUDE.md`.
  *Test:* 💻📱 your review notes are addressed.

---

## Phase 3 — The remaining 8 stations
One station per step. Each step: terrain landmark + any special objects + parameter wiring, in the Phase 1.5 look. Panel, lantern and light curve already exist from Phase 2.

- [ ] **3.1 Station 2 — square root: glowing roots + rising path**
  Glowing roots under a translucent ground patch (see A7) that grow slowly; the path rises gently out of the ground following √x. `a` changes the rise.
  *Test:* 💻📱 roots visibly grow, path rises gently, `a` updates path and sculpture.

- [ ] **3.2 Station 4 — constant: flat raised plateau**
  Perfectly flat raised platform with a stone bench and a lone tree; `c` sets its height (with a gentle ramp to get up).
  *Test:* 💻📱 walk onto the platform; change `c`: the platform and the objects on it rise/fall together and you stay on top.

- [ ] **3.3 Station 5 — logarithm: steep then level path + dissolving question marks**
  Path rises steeply then levels out; floating "؟" marks fade as the player climbs. `a` from 1.5 to 10.
  *Test:* 💻📱 question marks fade as you go up; changing `a` changes how fast the path levels out.

- [ ] **3.4 Station 6 — exponential: flat then shooting up a rock pillar + doubling particles**
  Path almost flat, then rising steeply up a rock pillar (walkable part kept gentle, see brief). Glowing particles that double in number along the path. `a` from 1.2 to 3.
  *Test:* 💻📱 particles double along the path; `a` changes the curve; frame rate stays fine on the phone.

- [ ] **3.5 Station 7 — cubic: S-shaped path + sign toggle**
  Path goes down, turns, then rises. `a` from 0.2 to 2 plus a −/+ sign toggle that mirrors the S.
  *Test:* 💻📱 walk the S; toggle the sign: the terrain and the sculpture flip.

- [ ] **3.6 Station 8 — rational: two curved paths + asymptote walls**
  Two curved path pieces with transparent glowing walls at x = 0 and y = 0. The player **cannot walk through** the vertical wall. `a` from 0.5 to 3.
  *Test:* 💻📱 walking into the vertical wall stops you; both curve branches update with `a`.

- [ ] **3.7 Station 9 — quadratic: valley that flips into a hill**
  Valley when a > 0, hill when a < 0, changing live; `b` and `c` shift it (three control rows, 0 skipped for a).
  *Test:* 💻📱 stand in the valley and flip `a`: it becomes a hill smoothly and you stay on the ground.

- [ ] **3.8 Station 10 — floor: real staircase**
  Flat steps the player climbs; `step height` from 0.3 to 1 (clamped to stay climbable).
  *Test:* 💻📱 climb the stairs; change step height: the stairs and the sculpture update.

- [ ] **3.9 Near/far activation for performance**
  Only stations near the player are fully active (panel animation, particles, glow). Far ones are simplified.
  *Test:* 💻📱 with `?stats`, frame rate on the phone is 30+ fps anywhere on the trail.

---

## Phase 4 — Navigation, HUD and VR

- [ ] **4.1 HUD shell**
  2D RTL overlay: small title and visited counter at the top (`زرت ٣ من ١٠ محطات`, Arabic-Indic digits), corner button area. Hidden in immersive VR.
  *Test:* 💻📱 counter updates when you visit a station; layout fits on a small phone in portrait and landscape.

- [ ] **4.2 Stations menu + glide + next / previous**
  "المحطات" opens a list of all stations; tapping one glides the player there smoothly. "المحطة التالية / المحطة السابقة" buttons. The whole trail can be done with taps only.
  *Test:* 💻📱 go through all 10 stations and the closing area using only the menu and next/previous.

- [ ] **4.3 HUD parameter mirror (phone)**
  The − / + of the nearest station also appears in the HUD on phones, synced with the 3D buttons.
  *Test:* 📱 near station 1, HUD − / + change `a` and the 3D label shows the same value.

- [ ] **4.4 Mute and fullscreen buttons**
  Mute/unmute for all sounds. Fullscreen button (hidden where it's not supported, e.g. iPhone Safari).
  *Test:* 💻📱 mute silences the chime; fullscreen works on laptop and Android.

- [ ] **4.5 Enter VR button + basic immersive mode**
  "دخول الواقع الافتراضي" shown only if `navigator.xr` supports immersive-vr. HUD hides in VR; panels and text are readable at VR scale; player stands at correct terrain height.
  *Test:* 🥽 in the emulator, enter VR, look around the start area, text readable; exit VR restores the HUD.

- [ ] **4.6 VR smooth walking + snap turn**
  Left thumbstick walks in the head direction with terrain following and boundaries; right thumbstick snap-turns 30°.
  *Test:* 🥽 walk to station 1 with the left stick, snap-turn with the right; cannot leave the cliff edge.

- [ ] **4.7 VR teleport**
  Arc from the right controller (trigger or thumbstick push); only valid ground targets; never off the cliff or through the asymptote wall.
  *Test:* 🥽 teleport along the trail; invalid targets show red and do nothing.

- [ ] **4.8 Laser pointer clicking**
  Controller rays click 3D − / + buttons and other 3D buttons.
  *Test:* 🥽 change station 1's `a` with the controller ray.

- [ ] **4.9 VR wrist menu**
  Small stations menu on the left controller, opened with X / menu; same glide-to-station.
  *Test:* 🥽 open the wrist menu and glide to station 5.

- [ ] **4.10 Optional narration hooks**
  Build-time detection of `assets/audio/intro.mp3` and `station-01.mp3 … station-10.mp3`. "استمع" button appears only on panels that have audio. Respects mute.
  *Test:* 💻 with no audio files: no buttons, no errors. Drop in one test mp3: its button appears and plays.

- [ ] **4.11 Ambient music**
  Gentle ambient music that starts softly after "ابدأ الرحلة". It uses `assets/audio/ambient.mp3` if that file exists (loaded after the start, so it never slows loading); otherwise a soft generated pad (Web Audio, no download). It drifts with the time of day, ducks under narration, and respects mute.
  *Test:* 💻📱 music fades in after the start, mute silences it and the chimes, narration plays over it clearly; no file → generated pad, no errors.

---

## Phase 5 — Closing activities and end screen

- [ ] **5.1 Closing lookout area**
  Lookout point on the cliff edge after station 10, with a title "أنشطة ختامية" and a start button for the activities.
  *Test:* 💻📱 walk (or glide) from station 10 to the lookout and see the activity start.

- [ ] **5.2 Activity 1 — "أي دالة هذه؟"**
  A glowing curve in the sky, 3 answer stones with function names. Right: glow + chime. Wrong: gentle shake + the right one highlights. 5 random rounds from the 10 functions.
  *Test:* 💻📱🥽 play 5 rounds; answers can be picked with mouse, tap and controller ray; score counts correctly.

- [ ] **5.3 Activity 2 — "صِل الدالة بالشعور"**
  Show a function; pick one of 3 subtitles. 5 rounds, same feedback style.
  *Test:* 💻📱🥽 play 5 rounds; the right subtitle is always one of the 3 options.

- [ ] **5.4 Heart finale**
  After the activities, under the night sky: all 10 light curves rise from their stations into the sky above the lookout and flow together into a heart of light (like slide 1). Done in the vertex shader: each ribbon blends from its curve shape to its piece of the heart (same vertex count), so nothing is rebuilt per frame. Then the credit «إعداد: رحمة محمد أحمد المهدي» appears under the stars.
  *Test:* 💻📱 the 10 curves rise and form a heart smoothly at 30+ fps on the phone; 🥽 it's comfortable to watch (no camera movement).

- [ ] **5.5 End screen + restart**
  Total score, «شكرًا لرحلتكم معنا», «إعداد: رحمة محمد أحمد المهدي», "ابدأ من جديد" which resets visited state, lanterns and time of day and returns to the start area.
  *Test:* 💻📱 finish both activities and the finale, see the score and credit, restart: counter back to zero, lanterns unlit, golden sunset again.

---

## Phase 6 — Polish, performance and deploy

- [ ] **6.1 Loading screen with progress bar**
  Title + progress bar while fonts and the scene load; then the "ابدأ الرحلة" button.
  *Test:* 💻📱 with network throttling in DevTools, the bar fills and the button appears only when ready.

- [ ] **6.2 Performance pass**
  Measure on a mid-range Android and in the VR emulator at every quality level; tune the automatic quality choice; reduce terrain resolution, decoration and particle counts, or ribbon segments where needed.
  *Test:* 📱 30+ fps along the whole trail; 💻 60 fps; 🥽 smooth in the emulator.

- [ ] **6.3 Phone polish**
  Safe areas (notch), portrait/landscape, text sizes, button sizes for fingers, iOS Safari quirks.
  *Test:* 📱 iPhone and Android, both orientations: nothing overlaps or is cut off.

- [ ] **6.4 Cross-browser check**
  Chrome, Edge, Firefox, Safari (desktop); fix anything broken.
  *Test:* 💻 full walkthrough in each browser.

- [ ] **6.5 Final deploy check** *(only after L.1 is done; skip otherwise)*
  Push the final version, confirm the Action succeeds, and check the live build (narration files, if added, are included).
  *Test:* open the public `https://<user>.github.io/<repo>/` link on laptop and phone; everything loads, including fonts and any audio.

- [ ] **6.6 QR code + final device check**
  How to make a QR code for the final link. Final checklist on laptop, Android phone and the VR emulator (see A10). Final `CLAUDE.md` update.
  *Test:* scan the QR with a phone, open the experience and complete it end to end.

---

## Later — do only when you bring it up
Skipped in the normal order. Don't ask about GitHub until you raise it.

- [ ] **L.1 GitHub Pages deploy** *(was step 1.13)*
  `.github/workflows/deploy.yml` builds with the correct `base` (repo sub-path) and deploys on every push to `main`. I give you the exact repo settings (Pages → Source → GitHub Actions) and the push commands. Deploy whatever version we have at that point.
  *Test:* open `https://<user>.github.io/<repo>/` on laptop and phone: fonts load, no 404s in the console, motion sensors work over HTTPS, `?station=5` works on the live link.
