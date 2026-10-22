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

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
