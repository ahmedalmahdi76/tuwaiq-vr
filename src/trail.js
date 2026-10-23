// The trail along the top of Tuwaiq: spawn → station 1 … 10 → closing lookout.
// Pure data + math (no three.js), used by the trail mesh, the stations, movement and ?station=.
//
// The path runs TRAIL_BACK metres behind the rim, following the *most inland* rim point nearby, so it
// never runs out onto a headland; the headlands jut out beside it and keep the view open. At the end
// it turns out onto a headland: the closing lookout.
//
// Stations alternate sides of the path (walking toward +x, the right side is inland, the left side is
// toward the cliff): 1 right, 2 left, 3 right, … Each station's standing spot is ON the path; the
// station stands STAND_DIST beyond it, turned so it faces the path but TURN_DEG toward the visitors
// who are approaching, so it can be seen on the way.
import { edgeZ, terrainHeight } from './terrain.js';

const TRAIL_BACK = 14; // metres behind the (most inland nearby) rim
const RIM_WINDOW = 30; // look this far left/right for the most inland rim point
const SAMPLE = 1; // polyline resolution (m)

export const STATION_COUNT = 10;
export const STATION_SPACING = 18; // along the path, between standing spots
const STAND_DIST = 4; // standing spot → station origin (matches VIEW_SPOT in station.js)
export const TURN_DEG = 45; // stations turned this far from "square to the path" toward approaching visitors
// At the standing spot the camera starts this much further along the path than the station itself,
// so the station fills the view and the next station shows at its edge.
const LOOK_BIAS_DEG = 10;
const SPAWN_BEFORE = 6; // spawn this far (along the path) before station 1's standing spot
const START_ROOM = 14; // free path behind the spawn (room for the intro panels, phase E)
const LOOKOUT_AFTER = 46; // from station 10's standing spot to the lookout (along the path)

const LOOKOUT_X = 140; // the headland the trail ends on (see HEADLANDS in terrain.js)
const LOOKOUT_BACK = 5; // stop this far behind the headland's rim
const SPUR = 30; // the spur onto the headland starts this far (in x) before LOOKOUT_X

/** z of the trail line at x (before the lookout spur). */
function trailZ(x) {
  let rim = -Infinity;
  for (let dx = -RIM_WINDOW; dx <= RIM_WINDOW; dx += 1.5) rim = Math.max(rim, edgeZ(x + dx));
  return rim + TRAIL_BACK;
}

// Arc length the trail needs: start room + spawn + 9 spacings + lookout leg
const NEEDED = START_ROOM + SPAWN_BEFORE + (STATION_COUNT - 1) * STATION_SPACING + LOOKOUT_AFTER;

function withArcLength(pts) {
  let s = 0;
  pts.forEach((p, i) => {
    if (i > 0) s += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
    p.s = s;
  });
  return pts;
}

function spur(from) {
  const tip = { x: LOOKOUT_X, z: edgeZ(LOOKOUT_X) + LOOKOUT_BACK };
  const ctrl = { x: LOOKOUT_X - 4, z: from.z };
  const pts = [];
  for (let i = 1; i <= 24; i++) {
    const t = i / 24;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    pts.push({ x: a * from.x + b * ctrl.x + c * tip.x, z: a * from.z + b * ctrl.z + c * tip.z });
  }
  return pts;
}

/** Build backward from the lookout so the trail is just long enough (≈ NEEDED). */
function buildPath() {
  const endX = LOOKOUT_X - SPUR;
  // Length of the spur alone, to know how much straight trail is needed before it
  const spurLen = withArcLength([{ x: endX, z: trailZ(endX) }, ...spur({ x: endX, z: trailZ(endX) })]).at(-1).s;
  const main = [];
  let len = 0;
  let x = endX;
  main.unshift({ x, z: trailZ(x) });
  while (len < NEEDED - spurLen) {
    x -= SAMPLE;
    const p = { x, z: trailZ(x) };
    len += Math.hypot(main[0].x - p.x, main[0].z - p.z);
    main.unshift(p);
  }
  return withArcLength([...main, ...spur(main.at(-1))]);
}

/** Trail polyline: [{ x, z, s }] where s = arc length from the start (m). */
export const TRAIL = buildPath();
export const TRAIL_LENGTH = TRAIL.at(-1).s;

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

/** Camera yaw (A-Frame: camera looks along −z of its yaw) for looking along direction (dx, dz). */
const yawLooking = (dx, dz) => Math.atan2(-dx, -dz);

function makeStation(number, s) {
  const p = pointAt(s);
  const side = number % 2 === 1 ? 1 : -1; // +1 right (inland), −1 left (cliff side)
  // Right of the walking direction: (−tz, tx)
  const rx = -p.tz;
  const rz = p.tx;
  const turn = (TURN_DEG * Math.PI) / 180;
  const bias = (LOOK_BIAS_DEG * Math.PI) / 180;
  // From the standing spot to the station: to the side, and forward by the turn angle
  const ox = side * rx * Math.cos(turn) + p.tx * Math.sin(turn);
  const oz = side * rz * Math.cos(turn) + p.tz * Math.sin(turn);
  const x = p.x + ox * STAND_DIST;
  const z = p.z + oz * STAND_DIST;
  return {
    kind: 'station',
    number,
    side,
    s,
    trail: { x: p.x, z: p.z }, // the standing spot (on the path)
    x,
    z,
    y: terrainHeight(x, z),
    // Station yaw (A-Frame: local +z faces the visitor at the standing spot)
    faceYaw: Math.atan2(-ox, -oz),
    // Camera yaw at the standing spot: toward the station, biased along the path
    lookYaw: yawLooking(
      side * rx * Math.cos(turn + bias) + p.tx * Math.sin(turn + bias),
      side * rz * Math.cos(turn + bias) + p.tz * Math.sin(turn + bias),
    ),
  };
}

const FIRST = START_ROOM + SPAWN_BEFORE;

/** The 10 stations, in order. */
export const STATIONS_ON_TRAIL = Array.from({ length: STATION_COUNT }, (_, i) =>
  makeStation(i + 1, FIRST + i * STATION_SPACING),
);

function makePoint(kind, s) {
  const p = pointAt(s);
  return { kind, s, x: p.x, z: p.z, y: terrainHeight(p.x, p.z), trail: { x: p.x, z: p.z }, lookYaw: yawLooking(p.tx, p.tz), tx: p.tx, tz: p.tz };
}

/** Spawn: on the path, SPAWN_BEFORE metres before station 1, looking along the path. */
export const TRAIL_START = makePoint('start', START_ROOM);

/** The closing lookout at the end of the trail (on the headland tip). */
export const LOOKOUT = { ...makePoint('lookout', TRAIL_LENGTH), number: null };
// Facing the visitor arriving along the spur
LOOKOUT.faceYaw = Math.atan2(-LOOKOUT.tx, -LOOKOUT.tz);
