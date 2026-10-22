# PROJECT BRIEF — حين تتحدث الدوال بلغة المشاعر (VR)

> **Claude Code, read this first:**
> This file is **background only**. It describes the idea and the final vision of what we are
> building, so you understand where the project is going. It is **not** a task list, and you must
> **not** try to build everything in it at once.
>
> We will build this **step by step, in small organized steps**, following a plan we agree on
> together. Your job right now is only to understand the vision. Don't write code until I approve
> the plan (see section 10, "How we will work").
>
> Details in this file (exact shapes, parameter ranges, UI layout) are the intended direction. They
> can be adjusted while we build, when we see what works.

---

## 1. What we are building

A browser-based **VR / 3D experience** for a school math presentation titled
**«حين تتحدث الدوال بلغة المشاعر»** (When functions speak the language of emotions).

The presentation takes 10 math functions and links each one's graph shape to a human
feeling or life lesson. Its setting is **Jebel Tuwaiq (جبل طويق)**, the Saudi escarpment
("Edge of the World"), at a pink and gold sunset.

The VR experience turns that into a world: the visitor **walks along a trail on top of
Jebel Tuwaiq**. There are 10 stations on the trail, one for each function. At each station
the function's graph is **built into the landscape**, so the visitor walks on it or sees it
around them. A floating panel shows the Arabic explanation and the station's quote. The trail
ends with a short closing activity (quiz).

**Author credit (show on the start screen and on the end screen):**
إعداد: رحمة محمد أحمد المهدي — (Rahma Mohamed Ahmed Almahdi)

### Hard requirements
1. **Anyone can open it.** It is a static website opened from a link or QR code, with no install
   and no login. It must work on:
   - Desktop browsers (Chrome, Edge, Safari, Firefox)
   - Android phones (Chrome)
   - iPhones (Safari). There is no immersive VR mode on iOS, so iPhones get the 3D world with
     touch controls and tilt-to-look.
   - VR headsets (Meta Quest browser) in full immersive VR
2. **The user can move freely** in the world on every device (see "Controls").
3. **All visible text is Arabic, right-to-left, with correctly joined letters.**
4. **It runs smoothly on a mid-range Android phone.** Keep a performance budget (see section 7).
5. Deployed free on **GitHub Pages**.

---

## 2. Tech stack

- **Vite** (vanilla JS, no framework) as the dev server and bundler.
- **A-Frame** (install from npm, current stable 1.x, pinned exact version in package.json).
  It gives us WebXR, the VR button, controllers and look-controls.
- **Arabic 3D text:** use **troika-three-text** with the Tajawal font from the `assets` folder.
  Use the `THREE` instance that A-Frame exposes (`AFRAME.THREE`) so there aren't two copies of
  three.js. Write a small A-Frame component `arabic-text` that wraps it
  (props: value, fontSize, color, maxWidth, align='right', direction='rtl', anchorX, anchorY).
  **Check early, in Phase 1, that Arabic renders joined and in the right order.** If troika
  cannot do it reliably, fall back to drawing each text panel on an HTML canvas
  (`ctx.direction = 'rtl'`, Tajawal loaded with the FontFace API before drawing) and using it as a
  texture. Tell me which approach you used.
- **Dev server on HTTPS and on the local network** (`server.host = true` plus
  `@vitejs/plugin-basic-ssl`), so I can open it from my phone on the same Wi-Fi. Phones only allow
  motion sensors and WebXR on HTTPS.
- `vite.config.js` must set `base` correctly for GitHub Pages (repo sub-path). Read it from an env
  variable so local dev still works at `/`.
- No backend. Everything is static.

### Assets
- `assets/` contains the **Tajawal** font. Find the actual .ttf file names in there and use the
  Regular and Bold weights if both exist.
- Images and audio will be added later. Code must **not break when they are missing**:
  - Optional narration: `assets/audio/station-01.mp3` … `station-10.mp3` and `intro.mp3`. If a file
    exists, show a "استمع" (listen) button on that station's panel. If it doesn't exist, hide the button.
  - Optional images: `assets/images/…`. Don't depend on them.

---

## 3. The world

### Look and mood
Match the presentation: soft **pink, mauve, lilac and warm gold sunset**, minimalist and calm.
The stations alternate between two accent colours, the same way the slides do:
- Pink stations (odd: 1, 3, 5, 7, 9): curve colour `#E0457B`, panel tint `#F6E3EA`, frame `#C07A9A`
- Purple stations (even: 2, 4, 6, 8, 10): curve colour `#7B3FE4`, panel tint `#EFE6F7`, frame `#9A86C2`
- Panel text: dark plum `#3B1F2B`
- Sky: a gradient from warm gold near the horizon (`#F7C98B`) through pink (`#E9A9B8`) to dusty mauve
  above (`#B59AB8`), with a low sun on the horizon. Add soft fog matching the horizon colour.

### Terrain: Jebel Tuwaiq
- A **stylised low-poly plateau** with flat shading, in sand, rose and terracotta tones.
- One side of the plateau ends in a **dramatic cliff edge** dropping to a wide desert plain far
  below. That's the famous "Edge of the World" view. The trail runs along near the edge so the view
  is always there.
- Build the ground from a **height function `terrainHeight(x, z)`** in code. Each station adds its
  own shape to that function locally (see section 4). The player's feet follow the same function, so
  the visitor actually walks up the linear ramp, down the V canyon, up the staircase, and so on.
- Add a little scattered decoration: small rocks and a few low desert plants with white flowers
  (like the slides). Use instancing and keep it cheap.
- Show a **visible trail** (a slightly lighter path) linking start → station 1 → … → 10 → the
  closing area. Space the stations so walking between them takes about 10–15 seconds.

### The start area
- The visitor spawns facing the cliff edge and the sunset.
- A large floating title: **حين تتحدث الدوال بلغة المشاعر**
- Under it: **مرحبا بكم في مشروعنا** and the author credit line.
- A "how to move" hint that matches the device (keyboard, touch or VR controllers).
- An intro panel with **جبل طويق** and a second panel with **ما هي الدوال؟** (texts in section 5).

---

## 4. The 10 stations

Every station has the same parts. Build them **data-driven** from one content file
(`src/content.js`) so the stations are generated, not hand-written 10 times.

**Each station has:**
1. **A landmark shaped like the graph, built into the terrain** (walkable where it makes sense).
2. **A glowing 3D curve sculpture** of the function: a tube following y = f(x), standing upright on
   a small stone base, with thin x and y axes and the formula written above it in Latin math text
   (for example `f(x) = |x|`). Generate the curve from the equation in code, never from a hand-made
   model.
3. **An information panel** (rounded card in the station's tint) with: station number, function name
   (big), subtitle (the emotional title), the math explanation, the life meaning, and the quote
   (styled as a quote). Text right-aligned and RTL. The panel slowly turns to face the visitor.
4. **One interactive control:** a parameter the visitor can change with **− / +** buttons in 3D
   (clickable with mouse, tap, gaze cursor or VR controller ray) and with the HUD. The curve
   sculpture **and the terrain landmark both update live**. Show the current value
   (for example `a = 2`).
5. A soft chime and glow when the visitor first reaches the station, which marks it "visited".

**Station-specific shapes and parameters:**

| # | Function | Formula | Terrain landmark (walkable) | Parameter |
|---|---|---|---|---|
| 1 | دالة القيمة المطلقة | f(x) = a·\|x\| | A **V-shaped canyon** cut into the plateau. The trail goes down one side and up the other. | a: 0.5 → 3 (steepness of the V) |
| 2 | دالة الجذر التربيعي | f(x) = a·√x | **Glowing roots** visible under semi-transparent ground that grow slowly, then the curve rises out of the ground as a gently rising path | a: 0.5 → 3 |
| 3 | الدالة الخطية | f(x) = m·x + b | A **straight ramp** going toward the horizon ("اتجاه نحو المستقبل") | m: −1 → 2, and b: 0 → 3 |
| 4 | الدالة الثابتة | f(x) = c | A **perfectly flat raised plateau** with calm still objects (a stone bench, a lone tree) | c: 0 → 4 (plateau height) |
| 5 | الدالة اللوغاريتمية | f(x) = logₐ(x) | A path that **rises steeply then levels out**. Floating question marks dissolve as you climb ("لكل سؤال إجابة") | a: 1.5 → 10 (a ≠ 1) |
| 6 | الدالة الأسية | f(x) = aˣ | A path that starts **almost flat, then shoots up** a rock pillar. Small glowing particles double along it ("أثر يتضاعف") | a: 1.2 → 3 |
| 7 | الدالة التكعيبية | f(x) = a·x³ | An **S-shaped path** that goes down then turns and rises | a: 0.2 → 2, plus a sign toggle (−/+) |
| 8 | الدالة الكسرية | f(x) = a / x | Two curved paths with **transparent glowing walls at the asymptotes** (x = 0 and y = 0). The visitor **cannot walk through** the vertical asymptote wall. This is "التوازن والحدود" | a: 0.5 → 3 |
| 9 | الدالة التربيعية | f(x) = a·x² + b·x + c | A **valley (or a hill when a < 0)**. Flipping the sign of a turns the valley into a hill live ("منحنيات الحياة") | a: −2 → 2 (skip 0), b, c small ranges |
| 10 | الدالة الدرجية | f(x) = [x] (floor) | A **real staircase** of flat steps the visitor climbs ("خطوات نحو التغيير") | step height: 0.3 → 1 |

Clamp parameters to their ranges, step them in sensible increments, and clamp landmark sizes so
nothing becomes huge or breaks the walkable terrain. If a landmark would make walking awkward, keep
the walkable part gentle and let the sculpture show the exact math.

---

## 5. Content (copy exactly — do not rewrite the Arabic)

Put this in `src/content.js`.

### Intro — جبل طويق
من قلب وطن لا يعرف المستحيل، ومن همّة تعانق القمم، تبدأ رحلتنا اليوم.. رحلة نكتشف فيها كيف تتحول الأرقام إلى معانٍ، المنحنيات إلى حكايات، والرياضيات إلى حياة

### Intro — ما هي الدوال؟
تُعدّ الدوال الرياضية من أهم المفاهيم في الرياضيات فهي تساعدنا على فهم العلاقة بين المتغيرات وتمثيلها بالرسوم البيانية.

وفي مشروعنا، سنتعرف على عشر دوال رياضية مختلفة، ونستكشف خصائص كل دالة وشكل منحناها، ثم نربط بين شكلها وبعض المشاعر الإنسانية، لنرى كيف يمكن للرياضيات أن تعبّر عن جوانب من حياتنا ومشاعرنا بطريقة إبداعية.

### Station 1
- name: دالة القيمة المطلقة
- formula: f(x) = |x|
- subtitle: مرونة الطريق
- math: القيمة المطلقة تقيس بُعد العدد عن الصفر دون اعتبار اتجاهه، فسواء كان العدد موجبًا أو سالبًا، تبقى المسافة موجبة.
- life: وكما تختلف اتجاهات الأعداد، تختلف طرقنا وتجاربنا في الحياة، لكن لكل تجربة قيمة، ولكل خطوة نتعلم منها شيء جديد.
- quote: «قد تختلف اتجاهاتنا، لكن لكل رحلة قيمة.»

### Station 2
- name: دالة الجذر التربيعي
- formula: f(x) = √x
- subtitle: جذور النمو
- math: الجذر التربيعي هو العملية العكسية للتربيع، ويحدد العدد الذي إذا ضُرب في نفسه أعطى العدد الأصلي.
- life: وكما تنمو الجذور بهدوء قبل أن تظهر آثارها، فإن تطورنا يبدأ بخطوات صغيرة قد لا نلاحظها، لكنها تصنع فرقًا مع الوقت.
- quote: «مو كل نمو نشوفه من البداية، بعض التغيّرات تحتاج وقت عشان تظهر.»

### Station 3
- name: الدالة الخطية
- formula: f(x) = mx + b
- subtitle: اتجاه نحو المستقبل
- math: تُمثَّل الدالة الخطية بخط مستقيم، ويعبّر ميله عن مقدار تغيّر (y) عندما تتغيّر (x).
- life: وكذلك في حياتنا، كل خطوة نخطوها ممكن تغيّر مسارنا وتقرّبنا من أهدافنا، حتى لو كان التقدّم بسيطًا.
- quote: «مو شرط تكون خطواتنا كبيرة، المهم يكون لكل خطوة اتجاه وهدف.»

### Station 4
- name: الدالة الثابتة
- formula: f(x) = c
- subtitle: أشياء تبقى
- math: تحافظ الدالة الثابتة على القيمة نفسها مهما تغيّرت قيمة المتغير (x)، ويكون رسمها خطًا أفقيًا.
- life: وفي حياتنا، وسط التغيّرات الكثيرة، فيه مبادئ وقيم تبقى جزءًا منا مهما تغيّرت الظروف.
- quote: «مو كل شيء يتغيّر مع الوقت، فيه أشياء تظل ثابتة وتذكّرنا بمن نكون.»

### Station 5
- name: الدالة اللوغاريتمية
- formula: f(x) = logₐ x   (a > 0, a ≠ 1)
- subtitle: لكل سؤال إجابة
- math: تساعدنا الدالة اللوغاريتمية على معرفة الأس الذي نرفع إليه أساسًا معينًا لنحصل على عدد محدد.
- life: وكما نبحث عن قيمة مجهولة في الرياضيات، نبحث في حياتنا عن إجابات تساعدنا على فهم أنفسنا واكتشاف ما يناسبنا.
- quote: «مو كل الإجابات تظهر من أول محاولة، أحيانًا نحتاج نفهم السؤال صح عشان نوصل للإجابة.»

### Station 6
- name: الدالة الأسية
- formula: f(x) = aˣ   (a > 0, a ≠ 1)
- subtitle: أثر يتضاعف
- math: تتميّز الدالة الأسية بأن المتغير يكون في الأس، وقد يزداد منحناها بسرعة كلما زادت قيمة المتغير.
- life: وكذلك في حياتنا، قد تبدأ بعض الأشياء بخطوات بسيطة، ثم يكبر أثرها مع الاستمرار، مثل أثر الكلمة الطيبة أو عادة صغيرة نلتزم بها.
- quote: «لا تستهين بالبدايات الصغيرة، فقد يصنع استمرارك فرقًا أكبر مما تتخيّل.»

### Station 7
- name: الدالة التكعيبية
- formula: f(x) = x³
- subtitle: النمو بعد التغيير
- math: تتميّز الدالة التكعيبية بمنحنى يتغيّر اتجاهه تدريجيًا، وقد ينتقل من الانخفاض إلى الارتفاع أو العكس.
- life: وكذلك في حياتنا، التغيير مو دايم يكون بخط مستقيم، فقد نمر بمراحل صعبة قبل ما نكتشف قدراتنا ونبدأ بالتقدّم.
- quote: «مو كل تغيير يكون سهل، لكن كل مرحلة ممكن تفتح لنا طريقًا جديدًا.»

### Station 8
- name: الدالة الكسرية
- formula: f(x) = 1/x
- subtitle: التوازن والحدود
- math: تتضمن الدالة الكسرية متغيرًا في المقام، وقد لا تكون معرّفة عند بعض القيم التي تجعل المقام يساوي صفرًا.
- life: وكما أن لكل دالة حدودًا رياضية، فإن حياتنا تحتاج إلى توازن وحدود تساعدنا على فهم أنفسنا واتخاذ قراراتنا.
- quote: «مو كل طريق نقدر نسلكه، ومو كل حد يمنعنا من التقدّم؛ أحيانًا معرفة حدودنا هي بداية اختيار الطريق الصحيح.»

### Station 9
- name: الدالة التربيعية
- formula: f(x) = ax² + bx + c
- subtitle: منحنيات الحياة
- math: تُمثَّل الدالة التربيعية بمنحنى يُسمّى القطع المكافئ، وقد يتجه إلى الأعلى أو الأسفل حسب معامل (x²).
- life: وكما يرتفع المنحنى وينخفض، تمر حياتنا بلحظات من التحدي والنجاح، وكل مرحلة تترك فينا أثرًا وتمنحنا فرصة للتعلّم والنمو.
- quote: «مو كل انخفاض نهاية، ولا كل ارتفاع يدوم، لكن كل مرحلة تعلّمنا كيف نكمل.»

### Station 10
- name: الدالة الدرجية
- formula: f(x) = [x]
- subtitle: خطوات نحو التغيير
- math: تتكوّن الدالة الدرجية من مقاطع أفقية متتابعة، ينتقل بينها المنحنى على شكل درجات.
- life: وكما نصعد الدرج خطوةً بخطوة، نصل في حياتنا إلى مراحل جديدة بالتدريج، حتى لو ما لاحظنا التغيير من البداية.
- quote: «مو لازم توصل لكل شيء دفعة وحدة، أحيانًا كل خطوة صغيرة تقرّبك من المكان اللي تطمح له.»

### UI strings (Arabic)
- Start button: ابدأ الرحلة
- Next / previous station: المحطة التالية / المحطة السابقة
- Stations menu: المحطات
- Listen: استمع
- Visited count: زرت ٣ من ١٠ محطات (use Arabic-Indic digits in Arabic UI text)
- Enter VR: دخول الواقع الافتراضي
- Movement hints:
  - Desktop: استخدم W A S D أو الأسهم للمشي، واسحب بالفأرة للنظر حولك
  - Phone: استخدم عصا التحكم للمشي، وحرّك الهاتف أو اسحب بإصبعك للنظر حولك
  - VR: استخدم عصا اليد اليسرى للمشي، واليمنى للالتفاف أو الانتقال

---

## 6. Controls (every device)

- **Desktop:** WASD and arrow keys to walk, mouse drag to look (click the canvas for pointer lock;
  Esc to release), Shift to walk faster, click 3D buttons with the mouse.
- **Phone:** an **on-screen joystick** (bottom-left, semi-transparent) to walk. Look around by
  dragging on the screen and by tilting the phone (gyroscope). iOS needs a permission tap: do it from
  the "ابدأ الرحلة" button. Tap 3D buttons directly.
- **VR headset:** left thumbstick for smooth walking, right thumbstick for snap turning (30°), and
  **teleport** with the right trigger or a thumbstick push as the comfortable option. A laser ray on
  the controllers clicks 3D buttons. Movement follows the head direction.
- **On all devices** the player's height follows `terrainHeight(x, z)` smoothly, and the player
  cannot walk off the cliff edge or through the rational-function asymptote wall (simple invisible
  boundaries are fine; no physics engine).
- **Accessibility shortcut:** a **stations menu (المحطات)** in the HUD lists all stations; tapping one
  glides the player there. Also add "next station / previous station" buttons. Someone who can't use
  a joystick can still go through the whole experience with taps only.

### HUD (2D overlay, hidden in immersive VR)
- Top: project title (small) and visited counter.
- Corner buttons: المحطات (menu), mute/unmute, enter VR (only if `navigator.xr` supports
  immersive-vr), fullscreen.
- The parameter − / + of the nearest station is also mirrored in the HUD on phones, because small 3D
  buttons are hard to tap.
- In VR, the same menu is available as a small panel attached to the left controller (press the menu
  / X button).

---

## 7. Performance budget

- Target 60 fps on desktop, 30+ fps on a mid-range Android, 72 fps on Quest.
- Low-poly geometry and flat shading. One directional light (the sun) plus a hemisphere light. No
  real-time shadows, or one cheap baked-looking shadow.
- Instance repeated decoration. Only make panels and sculptures near the player fully active.
  Far-away stations can be simplified.
- Rebuild curve geometry only when a parameter changes, never every frame.
- Show a loading screen with the title and a progress bar while the font and scene load.

---

## 8. Closing area — أنشطة ختامية

After station 10, the trail reaches a lookout point on the cliff edge with a closing activity:

1. **"أي دالة هذه؟" (Which function is this?):** a glowing curve appears in the sky. The visitor
   picks one of 3 answer stones in front of them. Right answer: the stone glows and a chime plays.
   Wrong answer: a gentle shake and the right one highlights. Run 5 random rounds from the 10
   functions.
2. **"صِل الدالة بالشعور" (Match the function to its feeling):** pick one of 3 subtitles (for
   example مرونة الطريق, أثر يتضاعف, التوازن والحدود) for the shown function. 5 rounds.
3. **End screen:** score, the line «شكرًا لرحلتكم معنا»
   and the author credit «إعداد: رحمة محمد أحمد المهدي», plus a "ابدأ من جديد" (restart) button.

---

## 9. Project structure (suggested)

```
/assets            (font now; images/audio later — already exists)
/src
  main.js          (boot, loading screen, device detection)
  content.js       (all Arabic content from section 5)
  functions.js     (math: f(x) for each station, parameter ranges)
  terrain.js       (terrainHeight(x,z), terrain mesh, trail, decoration)
  components/      (A-Frame components: arabic-text, station, curve-sculpture,
                    param-control, player-movement, touch-joystick, teleport, hud-bridge, quiz)
  styles.css       (HUD and loading screen)
index.html
vite.config.js
CLAUDE.md          (you create this: short notes for future sessions — how to run, structure, decisions)
.github/workflows/deploy.yml
```

---

## 10. How we will work

### Step 0 — Planning only (no code)
1. Read this whole brief.
2. Ask me any questions about anything that is unclear.
3. Write a file **`PLAN.md`** that breaks the project into **phases** (use the rough phases below as a
   starting point), and each phase into **small steps**. Each step should:
   - do one clear thing (for example "terrain height function and plateau mesh", not "the whole world")
   - be small enough to finish and test in one sitting
   - end with something I can see or test in the browser
   - have a checkbox `- [ ]` and a one-line "how to test" note
4. Stop and wait for me to review and approve PLAN.md. Don't install anything or write code yet.

### After the plan is approved
- Work on **one step at a time**, in order, only when I say which step to start.
- At the end of each step: tick its checkbox in PLAN.md, give me a short summary of what changed,
  and tell me how to test it on laptop / phone / VR emulator (whichever apply). Then **stop and wait**.
- Don't jump ahead or start "while you're at it" work from later steps. If you see something that
  should change in the plan, suggest it and update PLAN.md only after I agree.
- Keep CLAUDE.md updated with how to run the project and the key decisions, so a new session can
  continue from where we stopped.

### Rough phases (the starting point for PLAN.md)

**Phase 1 — Foundation.** Set up Vite and A-Frame with the HTTPS dev server. Build the sky, the
sunset, the Tuwaiq plateau with the cliff edge, and the trail. Add player movement on desktop and
phone (joystick and gyro) with terrain-following. Build the `arabic-text` component and prove Arabic
renders correctly. Build the start screen, the title, the author credit, and the two intro panels.
Write CLAUDE.md.
→ By the end of this phase I can open it on my laptop and phone and walk around.

**Phase 2 — First two stations, end to end.** Build the generic station system from `content.js`
and `functions.js`. Fully finish **station 1 (absolute value)** and **station 3 (linear)**: terrain
landmark, curve sculpture, panel, live parameter control, visited state. These are the template for
the rest.
→ I review the look and feel before the pattern is copied to other stations.

**Phase 3 — The remaining 8 stations** with their special landmarks (roots, staircase, asymptote
walls, flipping parabola, and so on).

**Phase 4 — Navigation, HUD and VR.** Stations menu, next/previous, glide-to-station, visited
counter, mute, fullscreen, enter VR, controller locomotion, snap turn, teleport, laser clicking, the
VR wrist menu, and optional audio hooks.

**Phase 5 — Closing activities and end screen** (section 8).

**Phase 6 — Polish, performance and deploy.** Test the performance budget, add the loading screen,
and fix anything that looks off on a phone. Set up the GitHub Actions workflow that builds and deploys
to GitHub Pages on every push to `main`. Then tell me exactly which repo settings to change (Pages →
Source → GitHub Actions) and how to make a QR code for the final link.

### Rules while working
- Don't change the Arabic content text. If you think something is a typo, ask me.
- Keep every dependency version pinned exactly in package.json.
- After each step, give a short list of what to test on **laptop**, **phone** and (when relevant)
  **VR emulator** (the "Immersive Web Emulator" Chrome extension).
- If something in this brief turns out to be impractical, say so and suggest the closest alternative
  instead of silently dropping it.
