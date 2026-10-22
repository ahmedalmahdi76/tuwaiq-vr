// The journey clock (brief §11 goal 3). `journey` is one number from 0 (golden sunset at the start)
// to 1 (indigo night at station 10). Everything that changes with the time of day reads
// `sampleTime()`. Whoever drives the journey (dev keys now, the player's progress in step 1.12)
// calls `setJourney()`; the value then eases toward the target so changes are never abrupt.
import * as THREE from 'three';
import { TIME_KEYS } from './world-config.js';

const COLOR_FIELDS = ['horizon', 'mid', 'top', 'glow', 'light', 'hemiSky', 'hemiGround', 'fog', 'haze'];
const NUMBER_FIELDS = ['sunEl', 'glowStrength', 'moonEl', 'stars', 'lightIntensity', 'moonLight', 'hemiIntensity'];

// Pre-convert keyframe colours (hex → linear THREE.Color) once.
const KEYS = TIME_KEYS.map((k) => {
  const key = { ...k };
  for (const f of COLOR_FIELDS) key[f] = new THREE.Color(k[f]);
  return key;
});

export const journey = {
  value: 0,
  target: 0,
  speed: 0.12, // max change per second while easing
};

let jumped = false; // an instant change happened since the last step

export function setJourney(t, { instant = false } = {}) {
  journey.target = THREE.MathUtils.clamp(t, 0, 1);
  if (instant) {
    journey.value = journey.target;
    jumped = true;
  }
}

/** Move `journey.value` toward its target. Returns true if it changed. */
export function stepJourney(dtSeconds) {
  const diff = journey.target - journey.value;
  if (Math.abs(diff) < 1e-4) {
    const changed = diff !== 0 || jumped;
    journey.value = journey.target;
    jumped = false;
    return changed;
  }
  jumped = false;
  // Ease: fast enough to follow, capped so a jump never flashes the sky
  const step = Math.sign(diff) * Math.min(Math.abs(diff), Math.max(0.01, Math.abs(diff) * 2) * dtSeconds, journey.speed * dtSeconds);
  journey.value += step;
  return true;
}

// Result object reused every call (no allocations per frame).
const out = {};
for (const f of COLOR_FIELDS) out[f] = new THREE.Color();

/** All time-of-day values at journey t (default: the current value), smoothly blended. */
export function sampleTime(t = journey.value) {
  let i = 0;
  while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const raw = THREE.MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1);
  const s = raw * raw * (3 - 2 * raw); // smooth between keys
  for (const f of COLOR_FIELDS) out[f].copy(a[f]).lerp(b[f], s);
  for (const f of NUMBER_FIELDS) out[f] = a[f] + (b[f] - a[f]) * s;
  out.t = t;
  return out;
}
