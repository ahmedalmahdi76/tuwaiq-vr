// npm run check:layout — trail and station layout: spacing, rim clearance, and what is visible from
// each standing spot in a laptop view (16:9, 80° vertical → ±56° horizontal).
import { STATIONS_ON_TRAIL, TRAIL_START, LOOKOUT, TRAIL_LENGTH, TRAIL } from '../src/trail.js';
import { edgeZ } from '../src/terrain.js';

// Station-local layout (keep in sync with src/components/station.js)
const VIEW = { x: 0, z: 4 };
const CURVE = { x: -1.4, z: -0.5, half: 1.35 };
const PANEL_ANGLE = (22 * Math.PI) / 180;
const PANEL = { x: Math.sin(PANEL_ANGLE) * 3, z: VIEW.z - Math.cos(PANEL_ANGLE) * 3, half: 0.9 };
const HALF_FOV = 56;
const VISIBLE = HALF_FOV - 4; // a small margin

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`✘ ${msg}`);
};

const toWorld = (st, lx, lz) => {
  const c = Math.cos(st.faceYaw);
  const s = Math.sin(st.faceYaw);
  return { x: st.x + lx * c + lz * s, z: st.z - lx * s + lz * c };
};

function rimDistance(x, z) {
  let best = Infinity;
  for (let rx = x - 25; rx <= x + 25; rx += 0.25) best = Math.min(best, Math.hypot(x - rx, z - edgeZ(rx)));
  return z < edgeZ(x) ? -best : best;
}

/** Horizontal angle (degrees, + = right) of world point q seen from p looking along yaw. */
function angleFrom(p, yaw, q) {
  const lookX = -Math.sin(yaw);
  const lookZ = -Math.cos(yaw);
  const dx = q.x - p.x;
  const dz = q.z - p.z;
  const fwd = dx * lookX + dz * lookZ;
  const right = dx * -lookZ + dz * lookX; // right of look = (−lookZ, lookX)
  return (Math.atan2(right, fwd) * 180) / Math.PI;
}

function stationParts(st) {
  return {
    curveL: toWorld(st, CURVE.x - CURVE.half, CURVE.z),
    curveR: toWorld(st, CURVE.x + CURVE.half, CURVE.z),
    panelL: toWorld(st, PANEL.x - PANEL.half * Math.cos(PANEL_ANGLE), PANEL.z - PANEL.half * Math.sin(PANEL_ANGLE)),
    panelR: toWorld(st, PANEL.x + PANEL.half * Math.cos(PANEL_ANGLE), PANEL.z + PANEL.half * Math.sin(PANEL_ANGLE)),
  };
}

console.log(`trail ${TRAIL_LENGTH.toFixed(0)} m (x ${TRAIL[0].x.toFixed(0)} → ${TRAIL.at(-1).x.toFixed(0)}), spawn s=${TRAIL_START.s}, lookout s=${LOOKOUT.s.toFixed(0)}`);
console.log('\n st side   s    rim(min) | own curve°    own panel°   | next curve°   next panel°');
STATIONS_ON_TRAIL.forEach((st, i) => {
  const parts = stationParts(st);
  // Rim clearance: station parts and its 10 × 10 m landmark area centred on the station point
  const box = [];
  for (let a = -5; a <= 5; a += 2.5) for (let b = -5; b <= 5; b += 2.5) box.push(toWorld(st, a, b));
  const rim = Math.min(...[st, ...Object.values(parts), ...box].map((q) => rimDistance(q.x, q.z)));
  if (rim < 3) fail(`station ${st.number}: ${rim.toFixed(1)} m from the rim`);

  const eye = st.trail;
  const own = Object.fromEntries(Object.entries(parts).map(([k, q]) => [k, angleFrom(eye, st.lookYaw, q)]));
  for (const [k, a] of Object.entries(own)) if (Math.abs(a) > VISIBLE) fail(`station ${st.number}: own ${k} at ${a.toFixed(0)}° (outside the view)`);
  // Composition centred: the curve's left edge and the panel's right edge balance around the centre
  const balance = own.curveL + own.panelR;
  if (Math.abs(balance) > 12) fail(`station ${st.number}: composition off-centre by ${(balance / 2).toFixed(0)}°`);

  let nextTxt = '      —';
  const next = STATIONS_ON_TRAIL[i + 1];
  if (next) {
    const np = stationParts(next);
    const nc = [np.curveL, np.curveR].map((q) => angleFrom(eye, st.lookYaw, q));
    const npn = [np.panelL, np.panelR].map((q) => angleFrom(eye, st.lookYaw, q));
    // Visible = at least part of the curve or the panel is inside the view
    const seen = [...nc, ...npn].some((a) => Math.abs(a) < VISIBLE);
    if (!seen) fail(`station ${st.number}: station ${next.number} not visible (curve ${nc.map((a) => a.toFixed(0))}°, panel ${npn.map((a) => a.toFixed(0))}°)`);
    nextTxt = `${nc.map((a) => a.toFixed(0).padStart(4)).join('…')}   ${npn.map((a) => a.toFixed(0).padStart(4)).join('…')}`;
  }
  console.log(
    `${String(st.number).padStart(3)}  ${st.side > 0 ? 'R' : 'L'}  ${st.s.toFixed(0).padStart(4)}  ${rim.toFixed(1).padStart(6)}  | ` +
      `${own.curveL.toFixed(0).padStart(4)}…${own.curveR.toFixed(0).padStart(4)}   ${own.panelL.toFixed(0).padStart(4)}…${own.panelR.toFixed(0).padStart(4)}   | ${nextTxt}`,
  );
});

// From the spawn: station 1 ahead on the right, station 2 further ahead on the left
const s1 = stationParts(STATIONS_ON_TRAIL[0]);
const s2 = stationParts(STATIONS_ON_TRAIL[1]);
const a1 = [s1.curveL, s1.panelR].map((q) => angleFrom(TRAIL_START, TRAIL_START.lookYaw, q));
const a2 = [s2.curveL, s2.panelR].map((q) => angleFrom(TRAIL_START, TRAIL_START.lookYaw, q));
console.log(`\nfrom the spawn: station 1 at ${a1.map((a) => a.toFixed(0)).join('…')}°, station 2 at ${a2.map((a) => a.toFixed(0)).join('…')}°`);
if (!a1.some((a) => a > 0 && a < VISIBLE)) fail('station 1 not ahead-right of the spawn');
if (!a2.some((a) => Math.abs(a) < VISIBLE)) fail('station 2 not visible from the spawn');
if (rimDistance(LOOKOUT.x, LOOKOUT.z) < 3) fail('lookout too close to the rim');

if (failures) {
  console.error(`\n${failures} layout check(s) failed.`);
  process.exit(1);
}
console.log('\n✔ layout checks passed');
