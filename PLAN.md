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
| A8 | Git | `git init` in step 1.1; one commit per finished step. The GitHub repo is needed in step 1.13. |
| A9 | Shared three.js | troika-three-text imports `three`. A Vite alias points `three` at the **same npm package A-Frame depends on** (checked in `node_modules/aframe/package.json`, expected `super-three`), so troika and A-Frame share one copy. Verified in step 1.2 before anything else depends on it. |
| A10 | Test devices | *To fill in:* which phones / headsets you have. Until then, test notes list every device type. |

---

## Phase 1 — Foundation
Goal: open it on laptop and phone and walk around Jebel Tuwaiq at sunset, with correct Arabic text at the start.

- [x] **1.1 Project scaffold + HTTPS dev server**
  Vite (vanilla JS), A-Frame, `@vitejs/plugin-basic-ssl`, all versions pinned exactly. `vite.config.js` with `server.host = true` and `base` read from an env variable (default `/`). `index.html` with an empty `<a-scene>` and one test box. `git init`, `.gitignore`, first version of `CLAUDE.md`.
  *Test:* 💻 `npm run dev`, open `https://localhost:5173`, see the box. 📱 open the LAN URL printed in the terminal, accept the certificate warning, see the box.

- [ ] **1.2 `arabic-text` component (Arabic rendering proof)**
  First, set up the `three` alias (A9) and confirm only one three.js copy is loaded (no "Multiple instances of Three.js" warning, and troika's objects render inside the A-Frame scene). Then wrap troika-three-text in an A-Frame component (`value, fontSize, color, maxWidth, align, direction, anchorX, anchorY`) using Tajawal. Test scene shows the title, one long quote with «» and punctuation, Arabic-Indic digits, and mixed Arabic + `f(x)`. A plain HTML version of the same lines sits beside it for comparison. If troika fails, switch to the canvas-texture fallback. I will tell you which approach we kept.
  *Test:* 💻 DevTools console has no duplicate-three.js warning. 💻📱 letters are joined, words are in right-to-left order, punctuation at the correct end, and the 3D text matches the HTML reference.

- [ ] **1.3 `src/content.js` with all Arabic content**
  Intro texts, 10 stations (name, formula, subtitle, math, life, quote), UI strings, movement hints, author credit. Plus a small script `npm run check:content` that confirms every string matches `PROJECT_BRIEF.md` exactly.
  *Test:* 💻 `npm run check:content` prints "all match". The test scene shows the intro panel text loaded from `content.js`.

- [ ] **1.4 Sky, sun, fog and lights**
  Gradient sky (`#F7C98B` → `#E9A9B8` → `#B59AB8`), low sun disc on the horizon, fog matching the horizon colour, one directional light (sun) + one hemisphere light.
  *Test:* 💻📱 look around: warm gold at the horizon, pink above, mauve at the top, sun low on one side, distant objects fade into the fog.

- [ ] **1.5 Terrain: `terrainHeight(x, z)` + plateau mesh with cliff edge**
  Height function for a low-poly plateau with a dramatic cliff on one side and a wide desert plain far below. Flat-shaded mesh in sand, rose and terracotta tones, coloured by height/slope. Built so stations can add local shapes to it later.
  *Test:* 💻 a temporary fly camera (keyboard) shows the plateau, the cliff edge, and the plain below. No gaps or spikes in the mesh.

- [ ] **1.6 Trail layout + placeholder station markers**
  Define the trail waypoints (start → 1 … 10 → closing lookout) running near the cliff edge, in one data list. Draw the lighter trail on the ground. Put a simple numbered pillar at each station position, in alternating pink / purple.
  *Test:* 💻 fly along the trail: it follows the edge, the view is always there, 10 numbered pillars plus the lookout point in the right order.

- [ ] **1.7 Desktop movement with terrain following**
  WASD + arrows, Shift to walk faster, mouse drag to look, click for pointer lock, Esc to release. Eye height follows `terrainHeight` smoothly. Invisible boundary stops the player at the cliff edge and at the world edge. Replaces the fly camera. Dev shortcut: `?station=5` in the URL starts the player at that station (`?station=end` for the closing lookout).
  *Test:* 💻 walk between two stations in about 10–15 s; walk up and down slopes without sinking or floating; you cannot walk off the cliff. Open `?station=5` and start in front of pillar 5.

- [ ] **1.8 Start screen (HTML overlay) + device detection**
  Simple overlay with the title, credit and the "ابدأ الرحلة" button (RTL, Tajawal). Detects desktop / phone / VR-capable. The button is where iOS will ask for motion-sensor permission (next step). A full loading screen with a progress bar comes in Phase 6.
  *Test:* 💻📱 overlay appears first, Arabic is correct, button starts the scene.

- [ ] **1.9 Phone movement: joystick, touch-look, gyro**
  Semi-transparent joystick bottom-left. Drag on the screen to look. Tilt-to-look with the gyroscope (permission request from "ابدأ الرحلة" on iOS). Same terrain following and boundaries as desktop.
  *Test:* 📱 Android Chrome and iPhone Safari: walk with the joystick, look by dragging and by turning the phone, cannot walk off the cliff.

- [ ] **1.10 Decoration: rocks and desert plants**
  Instanced low-poly rocks and small plants with white flowers, scattered on the plateau but kept off the trail.
  *Test:* 💻📱 decoration looks natural and avoids the trail. A dev FPS counter (`?stats` in the URL) shows the frame rate stays high on the phone.

- [ ] **1.11 Start area: 3D title, welcome, credit, hint, intro panels**
  Spawn facing the cliff and the sun. Big floating title, «مرحبا بكم في مشروعنا», author credit, device-matched movement hint, and two rounded intro panels (جبل طويق, ما هي الدوال؟). The rounded-panel component made here is reused by stations.
  *Test:* 💻📱 on load you face the sunset, all text is readable and correct, the hint matches the device.

- [ ] **1.12 Phase 1 checkpoint**
  Update `CLAUDE.md` (how to run, structure, decisions so far). Quick review on laptop and phone; list anything to adjust before Phase 2.
  *Test:* 💻📱 full walk from the start area to the last placeholder pillar.

- [ ] **1.13 Early GitHub Pages deploy** *(moved here from 6.5)*
  `.github/workflows/deploy.yml` builds with the correct `base` (repo sub-path) and deploys on every push to `main`. I give you the exact repo settings (Pages → Source → GitHub Actions) and the push commands. Deploy the Phase 1 version.
  *Test:* open `https://<user>.github.io/<repo>/` on laptop and phone: fonts load, no 404s in the console, motion sensors work over HTTPS, `?station=5` works on the live link.

---

## Phase 2 — Generic station system + stations 1 and 3 complete
Goal: two finished stations that act as the template. Review the look and feel before copying the pattern.

- [ ] **2.1 `src/functions.js`: math and parameters**
  For each station: `f(x, params)`, parameter list (name, min, max, step, default, skipped values like 0), a sample x-range, the live formula label, and where the function is undefined (1/x at 0, log for x ≤ 0, jumps in floor). Plus `npm run check:functions` that prints sample values and checks clamping.
  *Test:* 💻 `npm run check:functions` shows correct values (e.g. |−2| = 2, log₂ 8 = 3, [2.7] = 2) and no NaN where the function is defined.

- [ ] **2.2 Station entities generated from data**
  A `station` component builds each station at its trail position from `content.js` + `functions.js`: stone base, number, colour theme (pink odd / purple even). Replaces the placeholder pillars.
  *Test:* 💻 10 stations in the right places, colours alternate correctly.

- [ ] **2.3 Info panel**
  Rounded card in the station tint with a frame: station number, name (big), subtitle, math text, life text, quote styled as a quote. Right-aligned RTL. Slowly turns to face the player. (Generic, so all 10 stations get their panel here.)
  *Test:* 💻📱 walk around a panel: it turns smoothly toward you, all text fits, nothing overflows, colours match the station.

- [ ] **2.4 Curve sculpture**
  Glowing tube following y = f(x), thin x and y axes, standing on the base, live formula label above it in Fira Sans. Handles breaks (asymptotes, steps) by drawing separate tube pieces. (Generic, so all 10 shapes appear here.)
  *Test:* 💻 each of the 10 sculptures has the correct shape for its function; no stray lines across the 1/x asymptote or between floor steps.

- [ ] **2.5 Parameter control (3D − / + buttons)**
  `param-control` component: − and + buttons and the value label (`a = 2`). Clicking with mouse or tapping on phone changes the value within its range and rebuilds only that sculpture. Supports more than one row (needed by stations 3, 7, 9).
  *Test:* 💻 click − / + on station 1: the value changes in steps, stops at the min/max, and the curve updates instantly. 📱 the same with taps.

- [ ] **2.6 Terrain landmarks system + station 1 V-canyon**
  Stations add a local shape to `terrainHeight` with a smooth blend into the plateau. Only the affected terrain section is rebuilt when a parameter changes. Station 1: V-shaped canyon; the trail goes down one side and up the other; `a` changes its steepness (clamped to stay walkable).
  *Test:* 💻📱 walk through the canyon; change `a` while standing in it: the ground and the sculpture both update and you stay on the ground.

- [ ] **2.7 Station 3: linear ramp toward the horizon**
  Straight ramp pointing at the horizon; `m` changes the slope and `b` the starting height (two control rows).
  *Test:* 💻📱 walk up the ramp; change `m` and `b`: ramp and sculpture both update; negative `m` gives a gentle downhill.

- [ ] **2.8 Visited state: chime + glow**
  When the player first comes near a station: synthesised soft chime, a glow on the sculpture/base, station marked as visited in a small shared state object (used later by the HUD and quiz).
  *Test:* 💻 reach station 1: chime once and glow; leaving and returning does not repeat the chime; the console shows the visited list.

- [ ] **2.9 Phase 2 review**
  You review stations 1 and 3 on laptop and phone. I apply look-and-feel changes before Phase 3. Update `CLAUDE.md`.
  *Test:* 💻📱 your review notes are addressed.

---

## Phase 3 — The remaining 8 stations
One station per step. Each step: terrain landmark + any special objects + parameter wiring. Panel and sculpture already exist from Phase 2.

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

- [ ] **5.4 End screen + restart**
  Total score, «شكرًا لرحلتكم معنا», «إعداد: رحمة محمد أحمد المهدي», "ابدأ من جديد" which resets visited state and returns to the start area.
  *Test:* 💻📱 finish both activities, see the score and credit, restart and confirm the counter is back to zero.

---

## Phase 6 — Polish, performance and deploy

- [ ] **6.1 Loading screen with progress bar**
  Title + progress bar while fonts and the scene load; then the "ابدأ الرحلة" button.
  *Test:* 💻📱 with network throttling in DevTools, the bar fills and the button appears only when ready.

- [ ] **6.2 Performance pass**
  Measure on a mid-range Android and in the VR emulator; reduce terrain resolution, decoration count or tube segments where needed.
  *Test:* 📱 30+ fps along the whole trail; 💻 60 fps; 🥽 smooth in the emulator.

- [ ] **6.3 Phone polish**
  Safe areas (notch), portrait/landscape, text sizes, button sizes for fingers, iOS Safari quirks.
  *Test:* 📱 iPhone and Android, both orientations: nothing overlaps or is cut off.

- [ ] **6.4 Cross-browser check**
  Chrome, Edge, Firefox, Safari (desktop); fix anything broken.
  *Test:* 💻 full walkthrough in each browser.

- [ ] **6.5 Final deploy check**
  The workflow already exists (step 1.13). Push the final version, confirm the Action succeeds, and check the live build (narration files, if added, are included).
  *Test:* open the public `https://<user>.github.io/<repo>/` link on laptop and phone; everything loads, including fonts and any audio.

- [ ] **6.6 QR code + final device check**
  How to make a QR code for the final link. Final checklist on laptop, Android, iPhone and (if available) a Quest. Final `CLAUDE.md` update.
  *Test:* scan the QR with a phone, open the experience and complete it end to end.
