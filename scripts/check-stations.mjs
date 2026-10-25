// npm run check:stations — per station, for every combination of parameter extremes (and defaults):
// the curve stays in its window, above the ground, clear of the controls; and the label matches.
import { STATIONS_ON_TRAIL } from '../src/trail.js';
import { terrainHeight } from '../src/terrain.js';
import { FUNCTIONS, allowedValues, defaultParams, samplePieces, windowCentre, yWindowOf } from '../src/functions.js';

// Keep in sync with src/components/station.js
const CURVE = { scale: 0.45, bottom: 1.3, x: -1.4, z: -0.5 };
// The diorama plinth (station-layout.js): top at the window bottom, 0.6 m tall, floating
const PLINTH = { width: 3.0, depth: 0.9, height: 0.6 };
const CLEARANCE = 0.3; // curve at least this far above the ground

let failures = 0;
const rows = [];

function combos(def) {
  const base = defaultParams(def);
  let list = [base];
  for (const p of def.params) {
    const vals = allowedValues(p);
    const next = [];
    for (const c of list) for (const v of new Set([c[p.name], vals[0], vals.at(-1)])) next.push({ ...c, [p.name]: v });
    list = next;
  }
  const seen = new Set();
  return list.filter((c) => !seen.has(JSON.stringify(c)) && seen.add(JSON.stringify(c)));
}

for (const st of STATIONS_ON_TRAIL) {
  const def = FUNCTIONS[st.number - 1];
  const c = Math.cos(st.faceYaw);
  const s = Math.sin(st.faceYaw);
  const world = (lx, lz) => ({ x: st.x + lx * c + lz * s, z: st.z - lx * s + lz * c });
  const problems = [];
  let minClear = Infinity;
  const all = combos(def);
  for (const p of all) {
    const label = def.label(p);
    if (/NaN|undefined|Infinity/.test(label)) problems.push(`bad label "${label}" for ${JSON.stringify(p)}`);
    for (const piece of samplePieces(def, p)) {
      for (const pt of piece) {
        const lx = CURVE.x + (pt.x - windowCentre(def)) * CURVE.scale;
        const ly = CURVE.bottom + (pt.y - yWindowOf(def)[0]) * CURVE.scale; // above the station origin
        const w = world(lx, CURVE.z);
        const clear = st.y + ly - terrainHeight(w.x, w.z);
        minClear = Math.min(minClear, clear);
      }
    }
  }
  if (minClear < CLEARANCE) problems.push(`curve only ${minClear.toFixed(2)} m above the ground`);
  // Plinth: its underside (with the controls on its face) floats clear of the ground everywhere
  const underside = CURVE.bottom - PLINTH.height;
  let plinthClear = Infinity;
  for (const dx of [-0.5, 0, 0.5]) {
    for (const dz of [-0.5, 0, 0.5]) {
      const w = world(CURVE.x + dx * PLINTH.width, CURVE.z + dz * PLINTH.depth);
      plinthClear = Math.min(plinthClear, st.y + underside - terrainHeight(w.x, w.z));
    }
  }
  if (plinthClear < 0.3) problems.push(`plinth only ${plinthClear.toFixed(2)} m above the ground`);
  // Ground under the panel position (the card's bottom is ≈ 0.9 m above its base)
  const pw = world(1.12, 1.22);
  const panelClear = st.y + 0.9 - terrainHeight(pw.x, pw.z);
  if (panelClear < 0.5) problems.push(`panel bottom only ${panelClear.toFixed(2)} m above the ground`);

  failures += problems.length;
  rows.push({ n: st.number, combos: all.length, minClear: minClear.toFixed(2), labels: [def.label(all.at(-1)), def.label(all[1] || all[0])], problems });
}

console.log('st  combos  curve clearance  sample labels (extremes)');
for (const r of rows) {
  console.log(`${String(r.n).padStart(2)}  ${String(r.combos).padStart(6)}  ${r.minClear.padStart(8)} m       ${r.labels.join('   ')}`);
  for (const p of r.problems) console.error(`    ✘ ${p}`);
}
if (failures) {
  console.error(`\n${failures} problem(s).`);
  process.exit(1);
}
console.log('\n✔ station checks passed');
