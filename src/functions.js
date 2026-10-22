// The 10 station functions: the math, the parameters the visitor can change, the display window
// for the curve, and the live formula label. Pure JS (no three.js); `npm run check:functions` tests it.
//
// Display window (all stations): x from −3 to 3, y from −3 to 4. √ and log are shown for x in 0…6,
// centred in the same window. Parts of a curve outside the y window are cut (never clamped flat),
// so nothing shoots off. Breaks: 1/x stops 0.05 before its asymptote on both sides; the floor
// function is drawn as one separate piece per step.

export const Y_WINDOW = [-3, 4];
const WINDOW = [-3, 3];
const WINDOW_POSITIVE = [0, 6]; // shown shifted: x = 3 sits at the centre

// ---------- number formatting for labels ----------

/** 2 → '2', 0.5 → '0.5', -1.5 → '−1.5' (true minus sign). */
export function fmt(v) {
  const s = String(Math.round(v * 100) / 100);
  return s.startsWith('-') ? `−${s.slice(1)}` : s;
}

/** Coefficient in front of a term: 1 → '', −1 → '−', 2 → '2' (or '2·' before |x| and [x]). */
function coef(v, dot = false) {
  if (v === 1) return '';
  if (v === -1) return '−';
  return dot ? `${fmt(v)}·` : fmt(v);
}

/** ' + 2', ' − 2', '' for 0. */
function signed(v, term = '') {
  if (v === 0) return '';
  const body = Math.abs(v) === 1 && term ? term : `${fmt(Math.abs(v))}${term}`;
  return v > 0 ? ` + ${body}` : ` − ${body}`;
}

// ---------- the 10 functions ----------
// params: name, min, max, step, default, skip (values not allowed), kind ('number' | 'sign')
// label(p): live formula; a subscript is written as _{…} (station 5), handled by the renderer.
// breaks(p): x positions where the curve must be split; gap = how far to stop before/after them.

export const FUNCTIONS = [
  {
    number: 1,
    params: [{ name: 'a', min: 0.5, max: 3, step: 0.5, default: 1 }],
    window: WINDOW,
    f: (x, p) => p.a * Math.abs(x),
    label: (p) => `f(x) = ${coef(p.a, true)}|x|`,
  },
  {
    number: 2,
    params: [{ name: 'a', min: 0.5, max: 3, step: 0.5, default: 1 }],
    window: WINDOW_POSITIVE,
    domain: (x) => x >= 0,
    f: (x, p) => p.a * Math.sqrt(x),
    label: (p) => `f(x) = ${coef(p.a)}√x`,
  },
  {
    number: 3,
    params: [
      { name: 'm', min: -1, max: 2, step: 0.5, default: 1 },
      { name: 'b', min: 0, max: 3, step: 0.5, default: 0 },
    ],
    window: WINDOW,
    f: (x, p) => p.m * x + p.b,
    label: (p) => {
      if (p.m === 0) return `f(x) = ${fmt(p.b)}`;
      return `f(x) = ${coef(p.m)}x${signed(p.b)}`;
    },
  },
  {
    number: 4,
    params: [{ name: 'c', min: 0, max: 4, step: 0.5, default: 2 }],
    window: WINDOW,
    f: (x, p) => p.c,
    label: (p) => `f(x) = ${fmt(p.c)}`,
  },
  {
    number: 5,
    params: [{ name: 'a', min: 1.5, max: 10, step: 0.5, default: 2 }],
    window: WINDOW_POSITIVE,
    domain: (x) => x > 0,
    f: (x, p) => Math.log(x) / Math.log(p.a),
    label: (p) => `f(x) = log_{${fmt(p.a)}} x`,
  },
  {
    number: 6,
    params: [{ name: 'a', min: 1.2, max: 3, step: 0.2, default: 2 }],
    window: WINDOW,
    f: (x, p) => p.a ** x,
    label: (p) => `f(x) = ${fmt(p.a)}ˣ`,
  },
  {
    number: 7,
    params: [
      { name: 'a', min: 0.2, max: 2, step: 0.2, default: 1 },
      { name: 's', kind: 'sign', min: -1, max: 1, step: 2, default: 1 },
    ],
    window: WINDOW,
    f: (x, p) => p.s * p.a * x ** 3,
    label: (p) => `f(x) = ${coef(p.s * p.a)}x³`,
  },
  {
    number: 8,
    params: [{ name: 'a', min: 0.5, max: 3, step: 0.5, default: 1 }],
    window: WINDOW,
    domain: (x) => x !== 0,
    breaks: () => [0],
    gap: 0.05,
    f: (x, p) => p.a / x,
    label: (p) => `f(x) = ${fmt(p.a)}/x`,
  },
  {
    number: 9,
    params: [
      { name: 'a', min: -2, max: 2, step: 0.5, default: 1, skip: [0] },
      { name: 'b', min: -2, max: 2, step: 0.5, default: 0 },
      { name: 'c', min: -2, max: 2, step: 0.5, default: 0 },
    ],
    window: WINDOW,
    f: (x, p) => p.a * x * x + p.b * x + p.c,
    label: (p) => `f(x) = ${coef(p.a)}x²${signed(p.b, 'x')}${signed(p.c)}`,
  },
  {
    number: 10,
    params: [{ name: 'h', min: 0.3, max: 1, step: 0.1, default: 1 }],
    window: WINDOW,
    // Steps at every integer; each step is drawn on its own (closed on the left)
    breaks: () => [-2, -1, 0, 1, 2],
    gap: 1e-4,
    f: (x, p) => p.h * Math.floor(x),
    label: (p) => (p.h === 1 ? 'f(x) = [x]' : `f(x) = ${fmt(p.h)}·[x]`),
  },
];

export const functionFor = (n) => FUNCTIONS[n - 1];

// ---------- parameters ----------

/** Every allowed value of a parameter, in order. */
export function allowedValues(param) {
  if (param.kind === 'sign') return [-1, 1];
  const values = [];
  const count = Math.round((param.max - param.min) / param.step);
  for (let i = 0; i <= count; i++) {
    const v = Math.round((param.min + i * param.step) * 100) / 100;
    if (!(param.skip || []).includes(v)) values.push(v);
  }
  return values;
}

/** Snap a value to the nearest allowed value (in range, on the step grid, not skipped). */
export function clampParam(param, value) {
  const values = allowedValues(param);
  return values.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best), values[0]);
}

/** The next value up (dir = +1) or down (dir = −1); stays put at the ends. */
export function stepParam(param, value, dir) {
  const values = allowedValues(param);
  const i = values.indexOf(clampParam(param, value));
  return values[Math.min(values.length - 1, Math.max(0, i + dir))];
}

export function defaultParams(def) {
  return Object.fromEntries(def.params.map((p) => [p.name, p.default]));
}

/** 'a = 2', 'm = −0.5', sign → '+' / '−'. */
export function paramLabel(param, value) {
  if (param.kind === 'sign') return value > 0 ? '+' : '−';
  return `${param.name} = ${fmt(value)}`;
}

// ---------- sampling the curve ----------

/**
 * Points of the curve inside the display window, split into pieces wherever the curve breaks,
 * leaves its domain, or leaves the y window. Returns [[{x, y}, …], …] in function units.
 */
export function samplePieces(def, params, samples = 240) {
  const [x0, x1] = def.window;
  const [yMin, yMax] = Y_WINDOW;
  const gap = def.gap ?? 0;
  // Split the window at the break points
  const cuts = (def.breaks ? def.breaks(params) : []).filter((b) => b > x0 && b < x1);
  const spans = [];
  let from = x0;
  for (const b of cuts) {
    spans.push([from, b - gap]);
    from = b + gap;
  }
  spans.push([from, x1]);

  const pieces = [];
  for (const [a, b] of spans) {
    const n = Math.max(2, Math.ceil(((b - a) / (x1 - x0)) * samples));
    let current = [];
    let prev = null;
    for (let i = 0; i <= n; i++) {
      const x = a + ((b - a) * i) / n;
      const ok = !def.domain || def.domain(x);
      const y = ok ? def.f(x, params) : NaN;
      const inside = Number.isFinite(y) && y >= yMin && y <= yMax;
      if (inside) {
        // Entering the window: start exactly on its edge
        if (!current.length && prev && Number.isFinite(prev.y)) current.push(edgePoint(prev, { x, y }));
        current.push({ x, y });
      } else if (current.length) {
        // Leaving the window: end exactly on its edge
        if (Number.isFinite(y)) current.push(edgePoint(current[current.length - 1], { x, y }));
        pieces.push(current);
        current = [];
      }
      prev = { x, y };
    }
    if (current.length > 1) pieces.push(current);
  }
  return pieces.filter((p) => p.length > 1);
}

/** Point where the segment a→b crosses the y window's edge (a inside, b outside, or reverse). */
function edgePoint(a, b) {
  const [yMin, yMax] = Y_WINDOW;
  const outside = b.y > yMax || b.y < yMin ? b : a;
  const edge = outside.y > yMax ? yMax : yMin;
  const t = (edge - a.y) / (b.y - a.y);
  return { x: a.x + (b.x - a.x) * t, y: edge };
}

/** x of the display window's centre (0 for most, 3 for √ and log). */
export const windowCentre = (def) => (def.window[0] + def.window[1]) / 2;
