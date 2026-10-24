# NATURE SCENES — «رحلة على المنحنى»

> Claude Code: this is the creative spec for the next phase (Phase N). It adds to PROJECT_BRIEF.md
> and wins over it where they differ. Build it in the steps from section 9, one prompt at a time.
> All Arabic text in this file is approved by the project owner: copy it exactly.

---

## 1. The idea

The team made physical diorama models (see `reference/diorama-*.jpg` if present). Each one is a
**pastel box (plinth)** with the x-axis along its top edge, a **graph rising from it**, and a
**small faceless girl living on the curve**. She sits sad among grey rocks under a rain cloud where
the curve is low, sits thoughtfully at the turning point, and climbs stone stairs up a green,
flowery hill to reach a glowing sun where the curve is high. Small sign cards name the feeling at
each part of the curve.

We bring that into the 3D world: **every station becomes a living diorama**, and the website can do
what the physical models can't:
- **She walks along the curve**, and her mood follows the slope (sad going down, calm when flat,
  hopeful climbing up).
- **The landscape follows the math.** When the visitor presses − / +, the hill, stairs, trees and
  her path move with the curve.
- **It reacts to the time of day.** At night the sun in each diorama becomes a moon, her lantern
  glows, the flowers close, and fireflies appear.

Mood: soft clay / toy look, matte pastel, rounded shapes, like the photos. Cute and warm, never
childish or cluttered.

---

## 2. The diorama plinth (all 10 stations)

- A floating pastel box under each curve: pink for odd stations, lilac for even, with the shared
  paper-grain texture. **No backboard**: the real Tuwaiq sunset is the backdrop.
- **Size:** as wide as the curve window plus 0.15 m margin on each side, 0.9 m deep, front face
  0.6 m tall. The **top surface sits exactly at the bottom of that station's curve window**, so
  nothing ever goes below it. The existing axes and curve stay where they are.
- **Top surface:** a faint light grid (like the photos) and a small grass rim at the back edge.
- **Floating:** it hovers above the ground with a soft glowing underside edge and a blob shadow on
  the ground. It does not bob.
- **Front face, top to bottom:**
  1. **Control strip:** the existing − / + parameter rows move here (out of the air below the
     curve), plus the new journey button **«▶ رحلة على المنحنى»** on the right side.
  2. **Properties row:** the «خواص الدالة» mini-cards (section 6).
  3. **Name band:** a paper label with small leaf ornaments in its corners showing the function
     name (bold) and the station subtitle under it, like the bottom labels in the photos.
- All front-face text is unlit canvas text (readability rules A13). Size it so it reads from the
  station's standing spot: name 0.11 m, subtitle 0.07 m, card text at least 0.055 m.

---

## 3. The traveller (the girl)

One character, the same at every station: the visitor's companion through the journey.

**Look** (built in code from soft primitives, no external model):
- Chibi proportions: a big round head, a small body, about **0.45 m tall** (1 curve unit).
- **Faceless**: a smooth skin-tone face with no features, exactly like the photos.
- Long, wavy dark-brown hair falling down her back. Build it from a few overlapping soft shapes so
  it has volume, not a flat cap.
- A lilac long-sleeve top, light-blue jeans, white sneakers.
- Matte clay material, lit by the scene, with a very slight rim light so she stays readable at night.
- **Skeleton:** a simple joint hierarchy (hips, spine, head, upper and lower arms, upper and lower
  legs) so poses are joint rotations.

**Poses** (blend between them over 0.4 s):
| Pose | Use |
|---|---|
| `sitHug` | sitting with knees up, arms around them, head down (sad) |
| `sitCalm` | sitting, hands on knees, head slightly up, looking at the view (calm / thinking) |
| `stand` | idle with gentle breathing |
| `walkSad` | slow walk, shoulders down, head low |
| `walk` | normal walk cycle |
| `climb` | bigger knee lift, leaning forward, arms swinging (stairs and steep parts) |
| `reachUp` | standing on tiptoe, one arm reaching up to the sun |
| `cheer` | both arms up, a small hop |
| `kneel` | kneeling (watering a seed, planting) |
| `hold` | standing and holding a prop (lantern, flag) in front of her |

**Idle life:** when she isn't walking she breathes softly, and every few seconds turns her head a
little toward the visitor or the view.

---

## 4. The journey: «▶ رحلة على المنحنى»

- Pressing the button (3D button on the plinth, and the HUD mirror on phones near the station) makes
  her **walk along the curve from left to right**, on top of the light ribbon. The walk takes about
  6–8 s, slower on the steep parts.
- **Mood follows the slope:** with s = slope of the curve at her position (in curve units):
  - s < −0.3: `walkSad`, plus a small rain cloud that follows above her (tiny instanced drops).
  - −0.3 ≤ s ≤ 0.3: `walk`, calm.
  - s > 0.3: `walk`, or `climb` when s > 1, plus a few soft sparkles around her.
  - At the curve's lowest point (vertex or turning point): she stops for 1.5 s in `sitCalm`.
  - At the end: the station's own ending (section 5).
- **Mood sound** (synthesised, soft, respects mute): a low minor note while sad, a warm major chord
  when she reaches the happy part, and a short sparkle at the end.
- **Emotion tint on the ribbon** (all stations, subtle): falling parts shift toward a cool blue,
  rising parts toward warm pink, while the station accent stays the main colour. It updates live
  with the parameters.
- **Auto-play:** the journey plays once by itself during the station's first visited moment. After
  that it only plays on the button.
- **Parameter changes during a journey:** she re-snaps smoothly to the new curve and keeps going.
- **Breaks in the curve:** at 1/x she walks only the right branch (section 5). At the step function
  she hops from step to step.
- When no journey is playing, she rests in the station's resting pose at its resting spot.

---

## 5. The 10 scenes

Positions are in curve units (x), using each station's default parameters. **Anchors:** every prop
is anchored to an x-position and either stands on the plinth top, or has its height or top tied to
f(x) at that x. So when the parameters change, the hills, trees and stairs rise and fall with the
curve. If a parameter flips the shape (negative slope, a < 0, sign toggle), the scene mirrors or
moves its zones so that **sad props stay at the low part and happy props at the high part**.

Sign cards: small paper cards on wooden posts, about 0.35 m tall, with soft rounded corners,
alternating pink and lilac cards. Write the words exactly as given.

### 1 — دالة القيمة المطلقة (f = a·|x|)
- **Scene:** two paths meeting at the vertex. Left arm: a dry sandy slope with small stones and dry
  grass tufts. Right arm: a green slope with flowers. Both are good roads, just different. At the
  vertex there's a small flat stone with a sprout next to it. At each arm's top end, a small wooden
  signpost with an arrow pointing outward.
- **Signs:** x = −2 «طريق مختلف» · x = 0 (in front of the vertex) «لكل تجربة قيمة» · x = 2 «نتعلم ونكمل»
- **Resting:** `sitCalm` on the vertex stone.
- **Journey:** starts at the top left, walks down (sad), sits at the vertex for 1.5 s, climbs the
  right arm, ends with `cheer`.

### 2 — دالة الجذر التربيعي (f = a·√x)
- **Scene:** a seed mound at x = 0 with a small watering can. Part of the plinth top near the start
  is a glass window showing glowing roots underground that slowly pulse. Plants grow taller along
  the curve: a sprout at x = 1, a small plant at x = 2.5, a young tree at x = 4, and a blossoming
  tree at x = 5.8 whose top reaches the curve. Tie each plant's height to f(x).
- **Signs:** x = 0.6 «بذرة صغيرة» · x = 3 «نمو هادئ» · x = 5.4 «أثر يظهر»
- **Resting:** `kneel`, watering the seed (small water drops).
- **Journey:** waters the seed, stands, and walks gently up. Each plant gives a little bounce and
  releases a few petals as she passes. Ends under the blossoming tree with `reachUp` to a falling
  petal.

### 3 — الدالة الخطية (f = m·x + b)
- **Scene (like photo 2):** low end: grey rocks, a bare brown tree and a few small plants. High end:
  a rounded green hill whose top meets the curve, stone stairs up the hill, pink and white flowers,
  and a glowing sun sprite just above the curve's high end. In the middle: young grass.
- **Signs:** low end «خطوة أولى» · high end «اتجاه وهدف»
- **Resting:** `sitHug` on the rocks at the low end.
- **Journey:** stands up from the rocks, walks steadily up the line, climbs the stairs, ends with
  `reachUp` toward the sun, and the sun pulses brighter.
- **Parameters:** m < 0 mirrors the scene (the hill moves to the left). m = 0 turns it into a flat
  meadow with flowers on both sides.

### 4 — الدالة الثابتة (f = c)
- **Scene (like photo 1):** a calm flat meadow on the plinth with soft grass and scattered flowers.
  A blossoming tree at x = −2.6 (its crown reaches the line height c), a wooden fence at x = 2.6, a
  grey rock at x = −1.8, and petals drifting slowly in a soft breeze.
- **Signs:** x = −3 «ثبات · استقرار · طمأنينة» · x = 1.5, as a small note card hanging near the
  line, «قيمة ثابتة لا تتغير»
- **Resting:** `sitCalm` on the rock, looking at the sunset.
- **Journey:** walks along the line at an even, unhurried pace, nothing changes, and she sits calmly
  again at the end (`sitCalm` on the fence rail).
- **Parameters:** c moves the line, the tree crown and the note card together.

### 5 — الدالة اللوغاريتمية (f = logₐ x)
- **Scene:** at the steep start (x 0.1 → 1): soft mist and 3 small floating clouds, each with a «؟»
  on it. Along the path: small lantern posts. At the calm end (x 5 → 6): a small still pond and,
  floating above it, a glowing orb, the "answer".
- **Signs:** x = 0.6 «سؤال» · x = 2.6 «بحث» · x = 5.4 «إجابة»
- **Resting:** `hold`, holding a small glowing lantern at the start.
- **Journey:** climbs the steep part holding the lantern. Each «؟» cloud dissolves into sparkles as
  she passes it. At the end the orb floats down into her hands, and the pond glows.

### 6 — الدالة الأسية (f = aˣ)
- **Scene:** one single flower at x = −3. The number of flowers doubles at each whole x: 1, 2, 4, 8,
  16, 32 (instanced, clustered around the curve's foot). Fireflies double the same way at night. A
  big blooming flower bush where the curve leaves the window.
- **Signs:** x = −2.5 «بداية صغيرة» · x = 0 «استمرار» · x = 1.8 «أثر يتضاعف»
- **Resting:** `kneel` next to the single flower.
- **Journey:** plants a seed at the start, then walks. Each doubling group of flowers pops up with a
  soft pop as she reaches it. She ends surrounded by flowers, doing a slow happy spin, then `cheer`.

### 7 — الدالة التكعيبية (f = a·x³, with a sign toggle)
- **Scene:** around the low part: a grey storm cloud with gentle rain and dark rocks. At the flat
  turning area around x = 0: a stone to sit on. On the high part: a soft rainbow arc and a green
  hill with flowers.
- **Signs:** low part «مرحلة صعبة» · x = 0 «نقطة التحوّل» · high part «تقدّم»
- **Resting:** `sitCalm` on the turning-point stone.
- **Journey:** walks up through the rain (the cloud follows her), pauses on the stone at the flat
  part. The rain stops, the rainbow fades in, and she climbs the rest happily, ending in `cheer`.
- **Parameters:** the sign toggle mirrors the scene.

### 8 — الدالة الكسرية (f = a / x)
- **Scene:** two separate landscapes divided by a **glowing fence along the vertical asymptote**,
  with a small closed arched gate in it. Left side (low branch): a quiet shaded area with soft
  stones and a small lamp post. Right side (high branch): a bright area with flowers and grass. The
  horizontal asymptote shows as a faint glowing line just above the plinth.
- **Signs:** at the fence «حدود» · left «توازن» · right «اختيار الطريق»
- **Resting:** `stand` at the fence on the right side, one hand touching it (the fence glows
  softly where she touches).
- **Journey:** walks the right branch only, from high next to the fence down to the calm, nearly
  flat part. At the start she touches the fence, it glows and doesn't open, and she turns and
  chooses her way. Ends in `sitCalm`.

### 9 — الدالة التربيعية (f = a·x² + b·x + c)
- **Scene (exactly like photo 3):** left high part: grey rocks, a dark rain cloud with drops, and
  her `sitHug` spot. Vertex: a small stone with a sprout. Right high part: a green hill with stone
  stairs, flowers, and a glowing sun at the top. The ribbon here uses a stronger emotion tint, from
  blue on the left through purple at the vertex to pink on the right, like the LED curve in the photo.
- **Signs:** left «حزن · تراجع» · vertex «نقطة التحوّل · تأمل · إعادة بناء» · right «أمل · نهوض · بداية جديدة»
- **Resting:** `sitHug` on the left rocks under the rain cloud.
- **Journey:** stands up and walks down sadly in the rain. The rain stops at the vertex, where she
  sits in `sitCalm` for 1.5 s. Then she climbs the stairs up the right side and ends with `reachUp`
  to the sun, and the sun flares.
- **Parameters:** when a < 0 the vertex becomes a sunny peak with the hill there and her `cheer`
  spot. Both falling sides get rocks and the rain cloud. The signs keep their words and move with
  their zones: «نقطة التحوّل…» stays at the vertex.

### 10 — الدالة الدرجية (f = h·[x])
- **Scene:** real stone steps on the plinth, one block per step, each top exactly at that step's
  value, with a small flower on each step. A little backpack at the bottom and a small flag on a
  pole at the top step.
- **Signs:** x = −2.5 «خطوة» · x = 0 «خطوة بخطوة» · x = 2.5 «وصول»
- **Resting:** `stand` at the bottom with the backpack.
- **Journey:** hops up step by step (a jump at each integer), a small chime at each step, rising in
  pitch. At the top she takes the flag and plants it, then `cheer`. The flag waves.
- **Parameters:** h changes the step heights and everything on them.

---

## 6. «خواص الدالة» cards (front of each plinth)

A row of small paper cards with a coloured title pill (like photo 2). **Values update live with the
parameters** (use Arabic text, with math in Fira Sans and Latin symbols). Round live values to at
most 2 decimals. Show 4–5 cards per station:

| # | Cards |
|---|---|
| 1 | المجال: ℝ · المدى: [0, ∞) · نقطة الرأس: (0, 0) · السلوك: متناقصة على (−∞, 0] ومتزايدة على [0, ∞) · التماثل: حول محور y |
| 2 | المجال: [0, ∞) · المدى: [0, ∞) · نقطة البداية: (0, 0) · السلوك: متزايدة دائمًا |
| 3 | المجال: ℝ · المدى: ℝ (أو {b} إذا كان m = 0) · المقطع الصادي: (0, b) · الميل: m · السلوك: متزايدة إذا m > 0، متناقصة إذا m < 0، ثابتة إذا m = 0 |
| 4 | المجال: ℝ · المدى: {c} · المقطع الصادي: (0, c) · الميل: 0 · الرسم: خط أفقي |
| 5 | المجال: (0, ∞) · المدى: ℝ · المقطع السيني: (1, 0) · خط التقارب: x = 0 · السلوك: متزايدة (a > 1) |
| 6 | المجال: ℝ · المدى: (0, ∞) · المقطع الصادي: (0, 1) · خط التقارب: y = 0 · السلوك: متزايدة (a > 1) |
| 7 | المجال: ℝ · المدى: ℝ · نقطة الانعطاف: (0, 0) · السلوك: متزايدة إذا a > 0، متناقصة إذا a < 0 · التماثل: حول نقطة الأصل |
| 8 | المجال: ℝ − {0} · المدى: ℝ − {0} · خطا التقارب: x = 0 و y = 0 · السلوك: متناقصة على كل فترة (a > 0) · لا تقطع المحورين |
| 9 | المجال: ℝ · نقطة الرأس: (−b/2a , c − b²/4a) computed live · المدى: [k, ∞) إذا a > 0 أو (−∞, k] إذا a < 0, where k is the vertex y · المقطع الصادي: (0, c) · الفتحة: لأعلى / لأسفل |
| 10 | المجال: ℝ · المدى: {…, −h, 0, h, 2h, …} (show the live h) · المقطع الصادي: (0, 0) · ثابتة على كل فترة [n, n+1) · قفزة عند كل عدد صحيح |

Show live values where a parameter is involved (for example `المقطع الصادي: (0, 1.5)` at station 3),
and the general form where it's a rule. Run every value through the check script (`npm run
check:functions` should also verify the vertex, the intercepts and the ranges shown on the cards).

---

## 7. Time of day

Follow the journey value (V.3):
- The diorama suns become soft glowing crescent moons as night comes (cross-fade).
- Her lantern (station 5) and the fence (station 8) glow more at night.
- The flowers slowly close a little at night (scale or tilt), and a few fireflies hover over each
  diorama at night only (from the shared mote system if possible).
- Rain clouds become moonlit lavender at night.

---

## 8. Assets and performance

**3D models:** use the free **Kenney "Nature Kit"** (CC0 licence) for trees, rocks, flowers, grass,
fences, stumps and similar props: https://kenney.nl/assets/nature-kit
- Download it if you can. If the download is blocked, stop and ask me to download the zip and put it
  in `assets/models/kenney-nature/`.
- Use only the ~20 models we need. Convert them to compact .glb if needed, and keep the total model
  size under 3 MB.
- **Recolour everything to our palette:** soft warm greens, warm grey rocks, pink, white and lilac
  flowers, honey-wood fences. Matte clay look. No Kenney default colours.
- Build in code: the hills, stairs, clouds, sun and moon, signs, the glass root window, the plinth
  and the character.
- Add a `CREDITS.md` listing the asset pack and its licence.

**Phone budget** (the medium quality level is the main target):
- Each diorama: at most ~8k triangles and ~12 draw calls. Merge the static props of a station by
  material. Instance the repeated ones (flowers, grass, stones, raindrops).
- Character: at most ~3k triangles, 1–2 draw calls, the same geometry reused at every station.
- Load each diorama with its panel (create at 45 m, fade in, free beyond 55 m). Only the nearest
  station runs animations.
- Quality levels: low has fewer flowers, no rain drops and no fireflies. High gets denser grass and
  more petals.
- Keep iPhone Safari memory safe: share textures and geometry across stations, and dispose them on
  unload.

---

## 9. Build steps (Phase N)

- **N.1** Plinths for all 10 stations, with the front face: move the − / + controls there, add the
  name band and a placeholder properties row. Asset pipeline: download, select, recolour and load
  the Kenney props with a shared material set.
- **N.2** The traveller: model, joints, all poses with blending, and idle life. Show her at every
  station in its resting pose and resting spot.
- **N.3** Full scenes for stations 9, 3 and 4 (the three closest to the photos), with signs and
  parameter-following anchors. → Review the look before the rest.
- **N.4** Scenes for stations 1, 2, 5, 6, 7, 8 and 10.
- **N.5** The journey: the button and HUD mirror, slope-driven moods, rain cloud and sparkles, mood
  sounds, the emotion tint, every station's special ending, and auto-play on the first visit.
- **N.6** «خواص الدالة» cards with live values, plus checks.
- **N.7** Time-of-day reactions, a performance pass on the medium level, an iPhone memory check,
  then commit, push, and confirm the live site.

Commit after every step (`Step N.x: …`), and push to GitHub at the end of each prompt so the live
site updates.
