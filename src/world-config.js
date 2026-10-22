// Look of the world over the journey: sky, sun, moon, stars, fog, haze and lights.
// One place to tune the mood. `journey` goes from 0 (start: golden sunset) to 1 (station 10: night).
import * as THREE from 'three';

// Azimuth: 0 = straight ahead from the spawn (−z), positive = to the right (+x).
export const SUN = {
  azimuthDeg: 15,
  discColor: '#FFF8E8',
  discSizeDeg: 4, // apparent diameter (the real sun is ~0.5°; bigger reads better on a phone)
};

export const MOON = {
  azimuthDeg: -35, // ahead-left of the spawn, over the plain
  color: '#F6EEDC',
  sizeDeg: 3,
};

// Linear fog distances (the colour changes with the time of day).
export const FOG = { near: 150, far: 2600 };

// How strongly low ground gathers extra haze with distance (0–1). The haze colour is per keyframe.
export const HAZE = { lowExtra: 0.5 };

// three.js (r155+) uses physical light units: intensity π (≈3.14) ≈ the old "1.0".
// One directional light: the sun, handing over to the moon (`moonLight` 0 → 1). Never add or remove
// lights at runtime (shader recompiles). The night stays a soft painted indigo, never black: the
// violet sky light keeps the ground mid-tone so the cliff always reads against the darker sky.
export const TIME_KEYS = [
  {
    t: 0, // golden sunset
    horizon: '#F7C98B', mid: '#E9A9B8', top: '#B59AB8',
    sunEl: 5, glow: '#FFC98F', glowStrength: 1,
    moonEl: -10, stars: 0,
    light: '#FFD2A0', lightIntensity: 4.2, moonLight: 0,
    hemiSky: '#E6D0E4', hemiGround: '#B08A80', hemiIntensity: 3.2,
    fog: '#F7C98B', haze: '#CDB0C2',
  },
  {
    t: 0.35, // deeper rose, sun touching the horizon
    horizon: '#F4AC92', mid: '#DE8FAE', top: '#9D7FB0',
    sunEl: 1.2, glow: '#FFB08A', glowStrength: 0.9,
    moonEl: -2, stars: 0,
    light: '#FFB89A', lightIntensity: 3.4, moonLight: 0,
    hemiSky: '#DDB8D8', hemiGround: '#A07C80', hemiIntensity: 2.9,
    fog: '#F0AE9C', haze: '#C79DBA',
  },
  {
    t: 0.65, // purple dusk, pink afterglow, first stars
    horizon: '#D98FA8', mid: '#A879B0', top: '#5E4B8C',
    sunEl: -3, glow: '#F59AA0', glowStrength: 0.55,
    moonEl: 9, stars: 0.3,
    light: '#E3A6C0', lightIntensity: 2.0, moonLight: 0.45,
    hemiSky: '#B9A0D6', hemiGround: '#6E5470', hemiIntensity: 2.7,
    fog: '#C690AE', haze: '#9E80AE',
  },
  {
    t: 1, // soft indigo night, moon and stars
    horizon: '#7E6AA6', mid: '#4D3F80', top: '#241D47',
    sunEl: -12, glow: '#B57FB3', glowStrength: 0.15,
    moonEl: 26, stars: 1,
    light: '#CFC8F2', lightIntensity: 1.9, moonLight: 1,
    hemiSky: '#9488CE', hemiGround: '#4A3D63', hemiIntensity: 2.5,
    fog: '#6F5E99', haze: '#5E4E86',
  },
];

/** Unit vector toward a point in the sky (azimuth/elevation in degrees). */
export function skyDirection(azimuthDeg, elevationDeg, target = new THREE.Vector3()) {
  const az = THREE.MathUtils.degToRad(azimuthDeg);
  const el = THREE.MathUtils.degToRad(elevationDeg);
  return target.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}
