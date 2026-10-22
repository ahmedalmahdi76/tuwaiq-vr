// Shape of Jebel Tuwaiq: a plateau whose edge runs roughly along +x, a layered cliff dropping toward
// −z, and a wide desert plain far below. Pure math (no three.js), shared by the meshes, the player's
// feet (step 1.7) and the station landmarks (step 2.6).
import { fbm, noise2, smoothstep } from './noise.js';

/** Height of the desert plain (plateau top is around 0). */
export const PLAIN_Y = -140;

/** Extent of the world along the edge and inland. Large enough that the ends hide in the fog. */
export const WORLD = { xMin: -3000, xMax: 3400, inland: 3000, plainOut: 4500 };

// Rocky promontories jutting out over the plain, like the one in the Edge of the World photo.
const HEADLANDS = [
  { x: -70, amp: 24, w: 17 },
  { x: 140, amp: 30, w: 22 },
  { x: 330, amp: 20, w: 15 },
  { x: 520, amp: 28, w: 20 },
  { x: 760, amp: 34, w: 26 },
  { x: -320, amp: 30, w: 24 },
];

/** z of the cliff rim at a given x. The plain is on the −z side. */
export function edgeZ(x) {
  let z = -12 + 9 * Math.sin(x / 70 + 0.5) + 5 * Math.sin(x / 31 + 2) + 4 * fbm(x * 0.02, 3.7, 3, 5);
  for (const h of HEADLANDS) z -= h.amp * Math.exp(-(((x - h.x) / h.w) ** 2));
  return z;
}

/** The rim line without headlands or small wiggles. Inland rows of the mesh follow this. */
export function smoothEdgeZ(x) {
  return -12 + 9 * Math.sin(x / 70 + 0.5);
}

/**
 * z of a terrain mesh row `d` metres inland. Near the rim the rows hug the real edge (headlands
 * included); further in they relax onto the smooth line, so coarse far grids line up with the near one.
 */
export function rowZ(x, d) {
  const blend = smoothstep(30, 140, d);
  return edgeZ(x) * (1 - blend) + smoothEdgeZ(x) * blend + d;
}

/** Unit vector on the ground (x, z) pointing from the rim out over the plain. */
export function edgeOutward(x) {
  const e = 0.5;
  const slope = (edgeZ(x + e) - edgeZ(x - e)) / (2 * e);
  const len = Math.hypot(slope, 1);
  return { x: slope / len, z: -1 / len };
}

/** Distance behind the rim, measured along z (negative = out over the drop). */
export function inlandDistance(x, z) {
  return z - edgeZ(x);
}

/** Plateau surface without station landmarks. */
export function plateauHeight(x, z) {
  const d = inlandDistance(x, z);
  let h = 2.5 * fbm(x * 0.008, z * 0.008, 4, 11) + 0.6 * fbm(x * 0.05, z * 0.05, 2, 12);
  h += Math.min(Math.max(d, 0), 400) * 0.025; // rises slowly inland
  // Low flat-topped hills far inland
  const mesa = smoothstep(0.25, 0.4, fbm(x * 0.003, z * 0.003, 3, 13));
  h += 30 * mesa * smoothstep(250, 500, d);
  // Rounded lip along the rim, so the drop is visible from a few metres back
  h -= 1.4 * (1 - smoothstep(0, 5, d));
  return h;
}

/** Desert plain below the cliff: gentle swells and distant mesas on the horizon. */
export function plainHeight(x, z) {
  let h = PLAIN_Y + 4 * fbm(x * 0.002, z * 0.002, 3, 21);
  const out = -z; // distance out from the escarpment
  const mesa = smoothstep(0.32, 0.42, fbm(x * 0.0011, z * 0.0011, 3, 23));
  h += 70 * mesa * smoothstep(1400, 2200, out);
  return h;
}

/**
 * Dry riverbeds (wadis) on the plain, 0..1 (1 = in a channel). Used for colour only.
 */
export function wadi(x, z) {
  const n = fbm(x * 0.0022, z * 0.0022 + 0.3 * noise2(x * 0.001, z * 0.001, 31), 3, 29);
  return 1 - smoothstep(0.0, 0.06, Math.abs(n));
}

// Station landmarks add local shapes here (step 2.6). Each modifier: (x, z) => metres to add.
const heightModifiers = [];
export function addHeightModifier(fn) {
  heightModifiers.push(fn);
  return () => heightModifiers.splice(heightModifiers.indexOf(fn), 1);
}

/** Walkable ground height: the plateau plus any station landmark shapes. */
export function terrainHeight(x, z) {
  let h = plateauHeight(x, z);
  for (const fn of heightModifiers) h += fn(x, z);
  return h;
}

/** Spawn point: a few metres back from the rim, facing out over the plain (−z). */
export function spawnPoint() {
  const x = 0;
  const z = edgeZ(x) + 7;
  return { x, y: terrainHeight(x, z), z };
}
