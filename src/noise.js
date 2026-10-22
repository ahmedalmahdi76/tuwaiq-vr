// Small deterministic 2D value noise + fBm. Same inputs always give the same world.

function hash(ix, iy, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

const fade = (t) => t * t * (3 - 2 * t);

/** Value noise in [-1, 1]. */
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const a = hash(ix, iy, seed);
  const b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed);
  const d = hash(ix + 1, iy + 1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return (top + (bottom - top) * fy) * 2 - 1;
}

/** Fractal noise in roughly [-1, 1]. */
export function fbm(x, y, octaves = 4, seed = 0) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x, y, seed + i * 17);
    norm += amp;
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}

const mod = (a, n) => ((a % n) + n) % n;

/** Value noise that repeats every `period` units in x and y (for seamless tiling textures). */
export function tileNoise2(x, y, period, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const x0 = mod(ix, period);
  const y0 = mod(iy, period);
  const x1 = mod(ix + 1, period);
  const y1 = mod(iy + 1, period);
  const a = hash(x0, y0, seed);
  const b = hash(x1, y0, seed);
  const c = hash(x0, y1, seed);
  const d = hash(x1, y1, seed);
  const top = a + (b - a) * fx;
  const bottom = c + (d - c) * fx;
  return (top + (bottom - top) * fy) * 2 - 1;
}

/** Tileable fBm: x, y in [0, period) repeat seamlessly; each octave doubles the period. */
export function tileFbm(x, y, period, octaves = 4, seed = 0) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * tileNoise2(x, y, period, seed + i * 17);
    norm += amp;
    x *= 2;
    y *= 2;
    period *= 2;
    amp *= 0.5;
  }
  return sum / norm;
}

/** Small seeded random generator (mulberry32): same seed, same sequence. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
