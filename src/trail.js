// The trail along the top of Tuwaiq: start → station 1 … 10 → closing lookout.
// Pure data + math (no three.js), used by the trail mesh, the station markers, movement (A.2)
// and the ?station= shortcut.
//
// The path runs a few metres behind the rim. It follows the *most inland* rim point nearby, so it
// never runs out onto a headland; the headlands jut out beside it and keep the view open. At the end
// it turns out onto a headland: the closing lookout.
import { edgeZ, terrainHeight } from './terrain.js';

const TRAIL_BACK = 8; // metres behind the (smoothed) rim
const RIM_WINDOW = 30; // look this far left/right for the most inland rim point
const SAMPLE = 2; // polyline resolution (m)

export const STATION_COUNT = 10;
const FIRST_STATION = 55; // arc length from the start to station 1 (room for the start area)
// Walking speed is ~3.5 m/s (A.2), so 45 m ≈ 13 s between stations
export const STATION_SPACING = 45;
const STATION_SIDE = 3.5; // stations sit this far from the path, toward the cliff (view behind them)

const LOOKOUT_X = 520; // the headland the trail ends on (see HEADLANDS in terrain.js)
const LOOKOUT_BACK = 4; // stop this far behind the headland's rim

/** z of the trail line at x (before the lookout spur). */
function trailZ(x) {
  let rim = -Infinity;
  for (let dx = -RIM_WINDOW; dx <= RIM_WINDOW; dx += 3) rim = Math.max(rim, edgeZ(x + dx));
  return rim + TRAIL_BACK;
}

function buildPath() {
  // Main line along the edge, from just behind the spawn to the lookout headland
  const pts = [];
  for (let x = -12; x <= LOOKOUT_X - 30; x += SAMPLE) pts.push({ x, z: trailZ(x) });
  // Spur: curve out onto the headland tip
  const from = pts[pts.length - 1];
  const tip = { x: LOOKOUT_X, z: edgeZ(LOOKOUT_X) + LOOKOUT_BACK };
  const ctrl = { x: LOOKOUT_X - 6, z: from.z };
  for (let i = 1; i <= 20; i++) {
    const t = i / 20;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    pts.push({ x: a * from.x + b * ctrl.x + c * tip.x, z: a * from.z + b * ctrl.z + c * tip.z });
  }
  // Arc length along the path
  let s = 0;
  pts.forEach((p, i) => {
    if (i > 0) s += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
    p.s = s;
  });
  return pts;
}

/** Trail polyline: [{ x, z, s }] where s = arc length from the start (m). */
export const TRAIL = buildPath();
export const TRAIL_LENGTH = TRAIL[TRAIL.length - 1].s;

/** Point and unit tangent on the trail at arc length s. */
export function pointAt(s) {
  const clamped = Math.min(Math.max(s, 0), TRAIL_LENGTH);
  let i = 1;
  while (i < TRAIL.length - 1 && TRAIL[i].s < clamped) i++;
  const a = TRAIL[i - 1];
  const b = TRAIL[i];
  const t = (clamped - a.s) / (b.s - a.s || 1);
  const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    s: clamped,
    tx: (b.x - a.x) / len,
    tz: (b.z - a.z) / len,
  };
}

function makeStop(kind, number, s, side) {
  const p = pointAt(s);
  // Normal pointing toward the cliff (−z side), perpendicular to the walking direction
  let nx = p.tz;
  let nz = -p.tx;
  if (nz > 0) {
    nx = -nx;
    nz = -nz;
  }
  const x = p.x + nx * side;
  const z = p.z + nz * side;
  return {
    kind,
    number,
    s,
    trail: { x: p.x, z: p.z }, // where the visitor stands on the path
    x,
    z,
    y: terrainHeight(x, z),
    // Yaw (radians, A-Frame convention: 0 faces +z) for something at the stop to face the path
    faceYaw: Math.atan2(p.x - x, p.z - z),
  };
}

/** The 10 stations, in order. */
export const STATIONS_ON_TRAIL = Array.from({ length: STATION_COUNT }, (_, i) =>
  makeStop('station', i + 1, FIRST_STATION + i * STATION_SPACING, STATION_SIDE),
);

/** The closing lookout at the end of the trail (on the headland tip). */
export const LOOKOUT = makeStop('lookout', null, TRAIL_LENGTH, 0);

/** The start of the trail (where the visitor spawns). */
export const TRAIL_START = makeStop('start', null, 6, 0);

if (STATIONS_ON_TRAIL[STATION_COUNT - 1].s > TRAIL_LENGTH - 20) {
  console.warn('[trail] station 10 is too close to the lookout; check spacing');
}
