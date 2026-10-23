// Contrast for floating labels and curves across the time of day (fix after B.6):
// by day they need a soft DARK outline to read against the bright sunset sky; by night a soft accent
// GLOW reads better against the indigo sky. `dayFactor` goes 1 (sunset) → 0 (night).
import * as THREE from 'three';
import { journey } from './time-of-day.js';

const PLUM = new THREE.Color('#3B1F2B');

export function dayFactor(t = journey.value) {
  return 1 - THREE.MathUtils.smoothstep(t, 0.3, 0.75);
}

const tmp = new THREE.Color();

/** Troika outline settings for a cream label with this accent, at this day factor. */
export function labelOutline(accent, day = dayFactor()) {
  tmp.set(accent).lerp(PLUM, day);
  return {
    color: `#${tmp.getHexString()}`,
    width: 0.06 + 0.11 * day, // fraction of the font size: a firm outline by day, a soft glow by night
    blur: 0.35 - 0.25 * day,
    opacity: 0.7 + 0.22 * day,
  };
}

/** Apply labelOutline() to a troika Text. */
export function applyOutline(text, accent, day) {
  const o = labelOutline(accent, day);
  text.outlineColor = o.color;
  text.outlineWidth = `${o.width * 100}%`;
  text.outlineBlur = `${o.blur * 100}%`;
  text.outlineOpacity = o.opacity;
}

/** A deeper shade of the accent for the curve's daytime outline. */
export function deepAccent(accent) {
  return new THREE.Color(accent).lerp(PLUM, 0.45);
}
