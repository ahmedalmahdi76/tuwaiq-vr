// Look of the world: sky, sun, fog and lights. One place to tune the mood.
import * as THREE from 'three';

export const SKY = {
  horizon: '#F7C98B', // warm gold
  mid: '#E9A9B8', // pink
  top: '#B59AB8', // dusty mauve
};

// Azimuth: 0 = straight ahead from the spawn (−z), positive = to the right (+x).
// Elevation: degrees above the horizon (a low sunset sun).
export const SUN = {
  azimuthDeg: 15,
  elevationDeg: 5,
  discColor: '#FFF8E8',
  glowColor: '#FFC98F',
  discSizeDeg: 4, // apparent diameter (the real sun is ~0.5°; bigger reads better on a phone)
};

// Linear fog in the horizon colour, so the far desert melts into the sky.
export const FOG = {
  color: SKY.horizon,
  near: 60,
  far: 650,
};

// The sun is only 5° up, so it barely lights flat ground; the warm sky light does most of the work
// on the ground and the sun gives the glowing side faces.
// three.js (r155+) uses physical light units: intensity π (≈3.14) ≈ the old "1.0".
export const LIGHTS = {
  sun: { color: '#FFD6A8', intensity: 4.5 },
  hemisphere: { sky: '#F2D6CC', ground: '#B98A72', intensity: 3.6 },
};

/** Unit vector pointing from the world toward the sun. */
export function sunDirection(target = new THREE.Vector3()) {
  const az = THREE.MathUtils.degToRad(SUN.azimuthDeg);
  const el = THREE.MathUtils.degToRad(SUN.elevationDeg);
  return target.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}
