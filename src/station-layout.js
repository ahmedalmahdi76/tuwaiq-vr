// Station layout (metres, station-local). Local frame: +z points at the trail, −z toward the cliff;
// +x is the visitor's right. The visitor's standing spot (?station=N) is VIEW_SPOT, 4 m in front.
// Composed so that from there, in a normal laptop view and without turning:
//   - the diorama (plinth + curve) floats slightly left of centre, 4.5 m away, cliff view behind
//   - the info panel stands slightly right, 3 m away, turned toward the visitor
import * as THREE from 'three';
import { windowCentre, yWindowOf } from './functions.js';

export const VIEW_SPOT = { x: 0, z: 4 };

// Uniform scale keeps the shapes true (slope 1 = 45°)
export const CURVE = {
  scale: 0.45, // metres per function unit: 6 units wide → 2.7 m
  bottom: 1.3, // the window bottom (= plinth top) sits 1.3 m above the station point, at every station
  x: -1.4, // centre of the curve, left of the view's centre
  z: -0.5, // 4.5 m from VIEW_SPOT
};
CURVE.halfWidth = 3 * CURVE.scale;

// The diorama plinth (NATURE_SCENES.md §2): top surface exactly at the bottom of the curve window,
// as wide as the window + 0.15 m each side, 0.9 m deep (centred on the curve plane), 0.6 m tall.
export const PLINTH = {
  width: 2 * CURVE.halfWidth + 0.3,
  depth: 0.9,
  height: 0.6,
};

// Front-face layout (plinth-local: y = 0 is the top surface, z = front face)
export const FACE = {
  z: PLINTH.depth / 2 + 0.004,
  strip: { y: -0.105, height: 0.2 },
  journey: { w: 0.66, h: 0.15 },
  cards: { y: -0.29, h: 0.16 },
  band: { y: -0.49, w: 2.3, h: 0.2 },
};
FACE.journey.x = PLINTH.width / 2 - 0.06 - FACE.journey.w / 2;
// The control rows share the rest of the strip, left of the journey button
FACE.controls = { x: (-PLINTH.width / 2 + 0.05 + (FACE.journey.x - FACE.journey.w / 2 - 0.06)) / 2 };
FACE.controls.width = FACE.journey.x - FACE.journey.w / 2 - 0.06 - (-PLINTH.width / 2 + 0.05);

// Panel centre: 3 m from VIEW_SPOT, ~22° to the right
const PANEL_ANGLE = THREE.MathUtils.degToRad(22);
export const PANEL_SLOT = {
  x: VIEW_SPOT.x + Math.sin(PANEL_ANGLE) * 3,
  z: VIEW_SPOT.z - Math.cos(PANEL_ANGLE) * 3,
};

/** Height (station-local) of y = 0 for this station's window: its bottom sits on the plinth top. */
export const originYOf = (def) => CURVE.bottom - yWindowOf(def)[0] * CURVE.scale;

/** Function coordinates → station-local position. */
export function curveToLocal(def, x, y, target = new THREE.Vector3()) {
  return target.set(CURVE.x + (x - windowCentre(def)) * CURVE.scale, originYOf(def) + y * CURVE.scale, CURVE.z);
}
