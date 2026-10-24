# PLAN — حين تتحدث الدوال بلغة المشاعر (VR)

How to use this file:
- We work **one step at a time, in order**. I start a step only when you tell me which one.
- When a step is done I tick its box, summarise what changed, list what to look at on **laptop / phone / VR emulator**, then stop.
- Each step ends with something visible or testable in the browser.
- Changes to this plan happen only after you agree.
- Every finished step ends with **one git commit**, message like `Step A.1: trail and station markers`, so we can go back to any step.

**Now: Phase N (nature scenes, NATURE_SCENES.md).** Earlier: **Wrap-up (after B.6): going online.** Phases C, D, F and most of E and G are **not doing** for now. Remaining work: B.7 review, W.1 minimum phone support, W.2 GitHub Pages deploy.

**Priority (since V.4): content first, visual polish later.** Phases A–E build the complete experience in a clean, readable form; Phase F (Polish) brings it up to the art direction in brief §11.

Legend for test notes: 💻 laptop · 📱 phone (same Wi-Fi, `https://<laptop-LAN-IP>:5173`) · 🥽 VR (Immersive Web Emulator in Chrome).

---

## Decisions (confirmed)

| # | Topic | Decision |
|---|---|---|
| A1 | Fonts | `assets/Tajawal/Tajawal-Regular.ttf` + `Tajawal-Bold.ttf` for all Arabic. **Fira Sans** (also in `assets/`) for the Latin math formulas, because Tajawal may not have glyphs like `ₐ`, `ˣ`, `√`, `³`. Cairo stays unused. |
| A2 | Formula text | The info panel shows the formula **exactly as in the content** (e.g. `f(x) = |x|`). The label above the curve shows the **live parameterised** form (e.g. `f(x) = 2·|x|`). |
| A3 | Arabic text | Copied verbatim into `src/content.js`. A small check script compares it to `PROJECT_BRIEF.md` so nothing changes by accident. The typo «سنتعرض» was fixed to «سنتعرف» in the brief. |
| A4 | Sounds | Chime sounds are synthesised with Web Audio (no audio files needed). Narration files are optional and detected at build time. |
| A5 | Visited state | Resets on every page load. |
| A6 | Station 9 ranges | a: −2 → 2 step 0.5 (skipping 0), b: −2 → 2 step 0.5, c: −2 → 2 step 0.5. |
| A7 | Station 2 "semi-transparent ground" | A **translucent glowing glass patch** set into the ground, with the roots visible below it. |
| A8 | Git | `git init` in step 1.1; one commit per finished step. GitHub / deploy is **on hold**: see G.7 (L.1). |
| A9 | Shared three.js | `three` is pinned to the same `super-three` package A-Frame depends on, plus Vite `resolve.dedupe`, so troika and A-Frame share one copy (verified in 1.2). |
| A10 | Test devices | Laptop, Android phone (Chrome), Immersive Web Emulator. iOS and real headsets are still supported in code. |
| A11 | Art direction | Brief §11 is the visual target and wins over §3/§4/§8 where they differ. Content phases (A–E) use clean, readable versions; Phase F applies §11. Cheap tricks only, every effect has a quality setting. |
| A12 | New Arabic text | No new visible Arabic text is invented. Anything that would need new words uses an icon or a gesture instead, unless you give me the exact text (given so far: «تخطٍّ» for skipping the opening). |
| A13 | Readability | Panel / card backgrounds are **unlit** (same paper colour at every time of day). Floating labels without a card are light cream with a soft glow. Particles never come within 2.5 m of the eyes. |

---

## Done — Foundation and visual base

- [x] **1.1 Project scaffold + HTTPS dev server** — Vite, A-Frame, basic-ssl, pinned versions, `base` from env, git, `CLAUDE.md`.
- [x] **1.2 `arabic-text` component + shared three.js** — one three.js copy verified.
- [x] **1.3 `src/content.js` + `npm run check:content`** — all Arabic content, verified against the brief.
- [x] **1.3b Canvas rendering for all Arabic text** — exact harakat; texture cache, `activeDistance`; troika kept only for math (`math-text`).
- [x] **1.4 Sky, sun, fog and lights**
- [x] **1.5 Terrain: plateau, layered cliff, desert plain** (`terrainHeight(x, z)`)
- [x] **V.1 Quality settings + FPS meter** (`?quality=`, `?stats`)
- [x] **V.2 Watercolour paper look** + slide-based terrain changes
- [x] **V.3 Time-of-day system** (`journey` 0 → 1, `?time=`, `[` `]`)
- [x] **V.4 Atmosphere** — dust motes → fireflies, sky-coloured clouds, sun rays

---

## Phase A — Walk the trail (laptop)

- [x] **A.1 Trail waypoints + station markers** *(was 1.6)*
  The trail waypoints (start → 1 … 10 → closing lookout) running near the cliff edge, in one data list, spaced so walking between stations takes about 10–15 s. A lighter path drawn on the ground. A simple numbered marker at each of the 10 station positions (pink odd / purple even) plus a marker at the closing lookout. Plain markers are fine for now.
  *Test:* 💻 fly along the trail (keys 1–4, WASD): it follows the edge with the view always there; 10 numbered markers plus the lookout, in order.

- [x] **A.2 Desktop movement with terrain following** *(was 1.7)*
  WASD + arrows, Shift to walk faster, mouse drag to look, click for pointer lock, Esc to release. Eye height follows `terrainHeight` smoothly. Invisible boundary at the cliff edge and the world edge. Replaces the fly camera. Dev shortcut: `?station=N` starts in front of station N, `?station=end` at the closing lookout.
  *Test:* 💻 walk between two stations in about 10–15 s; up and down slopes without sinking or floating; you can't walk off the cliff; `?station=5` starts in front of marker 5.

---

## Phase B — Station content (the core of the project)

- [x] **B.1 `src/functions.js`: math and parameters** *(was 2.1)*
  For each of the 10 stations: `f(x, params)`, parameter list (name, min, max, step, default, skipped values like 0, the sign toggle for 7), x-range, the live formula label, and where the function is undefined (1/x at 0, log for x ≤ 0, jumps in floor). Plus `npm run check:functions` that prints sample values and checks clamping.
  *Test:* 💻 `npm run check:functions` shows correct values (e.g. |−2| = 2, log₂ 8 = 3, [2.7] = 2) and no NaN where the function is defined.

- [x] **B.2 Station entities from data** *(was 2.2)*
  A `station` component builds each station at its trail position from `content.js` + `functions.js`: number, colour theme (pink odd / purple even), and the places for panel, curve and controls. Replaces the A.1 markers.
  *Test:* 💻 10 stations in the right places, colours alternate correctly.

- [x] **B.3 Info panel (clean version)** *(was 2.3)*
  Unlit paper-colour card in the station tint with a simple frame: station number, name (big), subtitle, math text, life text, quote styled as a quote. Right-aligned RTL. Slowly turns to face the player. **No pop-in:** textures are created at a larger distance than where the panel becomes visible, and the panel fades in; creation is spread over frames if it stutters. Readable first; watercolour layers and flowers come in Polish.
  *Test:* 💻📱 every panel's text is complete and correct (compare with the brief); walk around a panel: it turns smoothly toward you; walking up from far away, it fades in without popping.

- [x] **B.4 Light curves for all 10 stations (simple version)** *(was 2.4)*
  A glowing ribbon floating in the air for y = f(x) (additive, baked soft gradient), with faint axes of light and a light cream formula label with the live parameter (Fira Sans; station 5's `ₐ` drawn as a small lowered "a"). Breaks (asymptotes, floor steps) are separate pieces. No drawing animation yet.
  *Test:* 💻 each of the 10 curves has the correct shape; no stray lines across the 1/x asymptote or between floor steps; `logₐ` shows a real subscript; labels readable at sunset and at night.

- [x] **B.5 Parameter controls for all stations** *(was 2.5)*
  3D − / + buttons and the value label (`a = 2`) for every station, multi-row for stations 3 (m, b), 7 (a + sign) and 9 (a, b, c). Mouse click and tap; values clamp to their ranges and skip forbidden values; the curve and its label update live (rebuilt once per change, never per frame).
  *Test:* 💻 at every station, − / + change the value in steps, stop at min / max, and the curve updates instantly; station 9 skips a = 0. 📱 the same with taps.

- [x] **B.6 Visited state**
  When the player first comes near a station: a soft synthesised chime and a small highlight, and the station is marked visited in a shared state object (used later by the HUD, the time of day and the quiz). The visited count is logged in the console.
  *Test:* 💻 reach station 1: chime once and the highlight; leaving and returning doesn't repeat it; the console shows `visited 1 / 10`, then 2, …

- [x] **B.7 Review checkpoint**
  You walk all 10 stations and check every text and curve; I fix what you find. Update `CLAUDE.md`.
  *Test:* 💻📱 your review notes are addressed.

---

## Phase C — Terrain landmarks — ⛔ not doing (for now)
Each station's walkable shape, blended into `terrainHeight`. Only the affected terrain section is rebuilt when a parameter changes; the curve and the landmark update together.

- [ ] **C.1 Landmark system + station 1 V-canyon** *(was 2.6)* — the trail goes down one side and up the other; `a` changes the steepness (clamped to stay walkable).
  *Test:* 💻 walk through the canyon; change `a` while standing in it: ground and curve both update and you stay on the ground.
- [ ] **C.2 Station 3 — linear ramp toward the horizon** *(was 2.7)* — `m` slope, `b` starting height.
  *Test:* 💻 walk up the ramp; change `m` and `b`: ramp and curve update; negative `m` gives a gentle downhill.
- [ ] **C.3 Station 2 — square root: glowing roots + rising path** *(was 3.1)* — roots under a translucent glass patch (A7), path rises gently following √x.
  *Test:* 💻 roots visible, path rises gently, `a` updates path and curve.
- [ ] **C.4 Station 4 — constant: flat raised plateau** *(was 3.2)* — stone bench and lone tree; `c` sets the height, gentle ramp up.
  *Test:* 💻 walk onto it; change `c`: platform and objects move together and you stay on top.
- [ ] **C.5 Station 5 — logarithm: steep then level path + dissolving "؟"** *(was 3.3)*
  *Test:* 💻 question marks fade as you climb; `a` changes how fast the path levels out.
- [ ] **C.6 Station 6 — exponential: flat then up a rock pillar + doubling particles** *(was 3.4)*
  *Test:* 💻 particles double along the path; `a` changes the curve.
- [ ] **C.7 Station 7 — cubic: S-shaped path + sign toggle** *(was 3.5)*
  *Test:* 💻 walk the S; toggle the sign: terrain and curve flip.
- [ ] **C.8 Station 8 — rational: two curved paths + asymptote walls** *(was 3.6)* — the player can't walk through the vertical wall.
  *Test:* 💻 walking into the vertical wall stops you; both branches update with `a`.
- [ ] **C.9 Station 9 — quadratic: valley that flips into a hill** *(was 3.7)*
  *Test:* 💻 stand in the valley and flip `a`: it becomes a hill smoothly and you stay on the ground.
- [ ] **C.10 Station 10 — floor: real staircase** *(was 3.8)* — step height 0.3 → 1, clamped to stay climbable.
  *Test:* 💻 climb the stairs; change the step height: stairs and curve update.
- [ ] **C.11 Near/far activation** *(was 3.9)* — only stations near the player are fully active; far ones are simplified.
  *Test:* 💻📱 `?stats`: steady frame rate anywhere on the trail.

---

## Phase D — Closing activities — ⛔ not doing (for now)

- [ ] **D.1 Closing lookout area** *(was 5.1)* — lookout on the cliff edge after station 10, title «أنشطة ختامية», a start button.
  *Test:* 💻 walk from station 10 to the lookout and start the activities.
- [ ] **D.2 Activity 1 — «أي دالة هذه؟»** *(was 5.2)* — a glowing curve in the sky, 3 answer stones; right: glow + chime; wrong: gentle shake + the right one highlights. 5 random rounds.
  *Test:* 💻📱 play 5 rounds with mouse and tap; score counts correctly.
- [ ] **D.3 Activity 2 — «صِل الدالة بالشعور»** *(was 5.3)* — a function and 3 subtitles to choose from; 5 rounds.
  *Test:* 💻📱 play 5 rounds; the right subtitle is always one of the 3.
- [ ] **D.4 End screen + restart** *(was 5.5)* — score, «شكرًا لرحلتكم معنا», «إعداد: رحمة محمد أحمد المهدي», «ابدأ من جديد» resets visited state and time of day and returns to the start.
  *Test:* 💻📱 finish both activities, see score and credit, restart: counter back to zero, golden sunset again.

---

## Phase E — Start screen and controls for everyone — ⛔ not doing (for now); a minimal start screen, touch controls and next / previous are done in W.1

- [ ] **E.1 Start screen (HTML overlay) + device detection** *(was 1.8)* — title, credit, «ابدأ الرحلة» (also where iOS asks for motion permission).
  *Test:* 💻📱 overlay appears first, Arabic correct, button starts the scene.
- [ ] **E.2 Phone movement: joystick, touch-look, gyro** *(was 1.9)* — same terrain following and boundaries as desktop.
  *Test:* 📱 walk with the joystick, look by dragging and by turning the phone; can't walk off the cliff.
- [ ] **E.3 Start area: 3D title, welcome, credit, movement hint, intro panels** *(was 1.11)* — spawn facing the cliff and the sun; both intro panels (جبل طويق, ما هي الدوال؟) in the clean panel style; removes the dev text boards.
  *Test:* 💻📱 on load you face the sunset, all text readable and correct, the hint matches the device.
- [ ] **E.4 HUD shell + visited counter** *(was 4.1)* — small title, `زرت ٣ من ١٠ محطات`, corner buttons; hidden in immersive VR.
  *Test:* 💻📱 counter updates on visits; layout fits a small phone in both orientations.
- [ ] **E.5 Stations menu + glide + next / previous** *(was 4.2)* — the whole trail can be done with taps only.
  *Test:* 💻📱 go through all 10 stations and the lookout using only the menu and next / previous.
- [ ] **E.6 HUD parameter mirror on phones** *(was 4.3)*
  *Test:* 📱 near station 1, HUD − / + change `a` and the 3D label shows the same value.
- [ ] **E.7 Mute and fullscreen buttons** *(was 4.4)*
  *Test:* 💻📱 mute silences the chime; fullscreen works on laptop and Android.

---

## Phase F — Polish (brief §11 art direction) — ⛔ not doing (for now)
Everything decorative, moved here from the earlier phases. §11 stays the target.

- [ ] **F.1 Lantern + dim trail** *(was V.5)* — low-poly stone lantern (emissive core, additive glow sprite, baked light pool; no real lights) at every station; the trail stays dim until lit.
- [ ] **F.2 Lighting moment on visit** *(from 2.8)* — the lantern lights up with the chime, the trail piece to it glows; looking back shows the path glowing along the cliff edge.
- [ ] **F.3 Watercolour panels** *(was V.6)* — paper card with watercolour texture, two stacked layers (pink / purple), small dried white flowers in a corner; applied to every station panel and the intro panels.
- [ ] **F.4 Curve drawing animation** *(from V.7 / 2.4)* — a spark draws the curve on the first visit, then it glows softly (shader `progress` uniform, no rebuilds).
- [ ] **F.5 Decoration: rocks, dried white flowers, desert plants** *(was 1.10)* — instanced, kept off the trail, counts from quality.
- [ ] **F.6 Time of day follows the journey** *(was 1.12)* — follows the **furthest point reached**, eases slowly; `?station=` and `?time=` still work.
- [ ] **F.7 Cinematic opening** *(was 1.13)* — camera rises from the plain up the cliff face, title written in light; skip by tap / click / key with a small «تخطٍّ» label; VR gets a comfortable fade version instead of a flight.
- [ ] **F.8 Heart finale** *(was 5.4)* — all 10 curves rise into the night sky and form a heart of light (vertex-shader morph), then the credit under the stars.
- [ ] **F.9 Ambient music** *(was 4.11)* — `assets/audio/ambient.mp3` if present (loaded after the start), else a soft generated pad; follows the time of day, ducks under narration, respects mute.
- [ ] **F.10 Optional narration hooks** *(was 4.10)* — «استمع» only on panels whose `assets/audio/station-NN.mp3` exists.
- [ ] **F.11 Enter VR + basic immersive mode** *(was 4.5)*
- [ ] **F.12 VR smooth walking + snap turn** *(was 4.6)*
- [ ] **F.13 VR teleport** *(was 4.7)*
- [ ] **F.14 Laser pointer clicking** *(was 4.8)*
- [ ] **F.15 VR wrist menu** *(was 4.9)*
- [ ] **F.16 Visual review** *(was V.8)* — you review the whole polished experience; I tune until you approve.

Each F step gets its test notes when it starts.

---

## Wrap-up — going online

- [x] **W.1 Minimum phone support** — HTML start screen (title, credit, «ابدأ الرحلة»: unlocks sound, asks iPhone motion permission; touch still works if denied), touch joystick bottom-left + drag-to-look + gyro when allowed, tapping 3D buttons, «المحطة السابقة» / «المحطة التالية» buttons that glide to the standing spots (all devices), medium quality on phones, iPhone memory kept low, dev tools hidden unless `?dev`.
- [x] **W.2 GitHub Pages deploy** — workflow (base `/tuwaiq-vr/`, deploy on push to main), remote `ahmedalmahdi76/tuwaiq-vr`, push, Pages source = GitHub Actions, live check of https://ahmedalmahdi76.github.io/tuwaiq-vr/, QR code instructions.

## Phase N — Nature scenes «رحلة على المنحنى» (spec: NATURE_SCENES.md, wins over the brief)

Every station becomes a living diorama like the team's physical models (reference/diorama-*.jpg): a pastel plinth, a small faceless girl travelling along the curve, and a landscape that follows the math and the time of day.

- [x] **N.1 Plinths + asset pipeline** — plinths for all 10 stations with the front face: the − / + controls move there, the name band, a placeholder properties row, the «▶ رحلة على المنحنى» button. Kenney Nature Kit (CC0) downloaded, ~20 props selected, recoloured to the palette with a shared material set, loaded; CREDITS.md.
- [x] **N.2 The traveller** — chibi faceless girl built in code (one skinned mesh, shared geometry), joint hierarchy, all 10 poses with 0.4 s blending, idle life (breathing, head turns). Shown at every station in its resting pose and resting spot.
- [ ] **N.3 Scenes for stations 9, 3 and 4** (closest to the photos), signs, parameter-following anchors. → review the look before the rest.
- [ ] **N.4 Scenes for stations 1, 2, 5, 6, 7, 8 and 10.**
- [ ] **N.5 The journey** — button + HUD mirror, slope-driven moods, rain cloud and sparkles, mood sounds, emotion tint, every station's ending, auto-play on the first visit.
- [ ] **N.6 «خواص الدالة» cards** with live values, plus checks.
- [ ] **N.7 Time of day, performance pass (medium), iPhone memory check**, commit, push, confirm live.

## Phase G — Final checks and deploy — ⛔ not doing (for now), except deploy (W.2)

- [ ] **G.1 Loading screen with progress bar** *(was 6.1)*
- [ ] **G.2 Performance pass** *(was 6.2)* — tune the automatic quality choice and counts.
- [ ] **G.3 Phone polish** *(was 6.3)* — safe areas, orientations, text and button sizes.
- [ ] **G.4 Cross-browser check** *(was 6.4)* — Chrome, Edge, Firefox, Safari desktop.
- [ ] **G.5 Final deploy check** *(was 6.5; only after G.7)*
- [ ] **G.6 QR code + final end-to-end check** *(was 6.6)*
- [ ] **G.7 GitHub Pages deploy** *(was L.1)* — **only when you bring it up.** Workflow with the correct `base`, Pages settings, push commands.
