// npm run check:functions — sample values, parameter ranges and curve pieces for all 10 stations.
import { STATIONS } from '../src/content.js';
import {
  FUNCTIONS, Y_WINDOW, allowedValues, clampParam, stepParam, defaultParams, paramLabel, samplePieces,
} from '../src/functions.js';

let failures = 0;
const near = (a, b) => Math.abs(a - b) < 1e-9;
function expect(label, actual, expected) {
  const ok = typeof expected === 'number' ? near(actual, expected) : actual === expected;
  if (!ok) {
    failures++;
    console.error(`✘ ${label}: got ${actual}, expected ${expected}`);
  }
}

// Known values (from the maths)
const at = (n, x, p = {}) => FUNCTIONS[n - 1].f(x, { ...defaultParams(FUNCTIONS[n - 1]), ...p });
expect('|−2|', at(1, -2), 2);
expect('2·|−1.5|', at(1, -1.5, { a: 2 }), 3);
expect('√9', at(2, 9), 3);
expect('3x + 1 at 2', at(3, 2, { m: 3, b: 1 }), 7);
expect('c = 2', at(4, 99), 2);
expect('log₂ 8', at(5, 8), 3);
expect('log₁₀ 100', at(5, 100, { a: 10 }), 2);
expect('2³', at(6, 3), 8);
expect('−x³ at 2', at(7, 2, { s: -1 }), -8);
expect('1/x at 4', at(8, 4), 0.25);
expect('x² − 2x + 1 at 1', at(9, 1, { b: -2, c: 1 }), 0);
expect('[2.7]', at(10, 2.7), 2);
expect('[−0.5]', at(10, -0.5), -1);
expect('0.5·[3.2]', at(10, 3.2, { h: 0.5 }), 1.5);

// Parameters: ranges, steps, skip, clamping
const p9a = FUNCTIONS[8].params[0];
expect('station 9: a never 0', allowedValues(p9a).includes(0), false);
expect('station 9: a step up from −0.5 skips 0', stepParam(p9a, -0.5, 1), 0.5);
expect('station 9: clamp 0 → nearest allowed', Math.abs(clampParam(p9a, 0)), 0.5);
expect('station 1: clamp 99 → 3', clampParam(FUNCTIONS[0].params[0], 99), 3);
expect('station 1: clamp −5 → 0.5', clampParam(FUNCTIONS[0].params[0], -5), 0.5);
expect('station 1: step up at max stays', stepParam(FUNCTIONS[0].params[0], 3, 1), 3);
expect('station 6: 1.2 + step = 1.4', stepParam(FUNCTIONS[5].params[0], 1.2, 1), 1.4);
expect('station 10: values 0.3…1', allowedValues(FUNCTIONS[9].params[0]).join(','), '0.3,0.4,0.5,0.6,0.7,0.8,0.9,1');
expect('station 7: sign values', allowedValues(FUNCTIONS[6].params[1]).join(','), '-1,1');

// Every station: defaults are allowed, no NaN where defined, pieces stay inside the y window
console.log('\nstation  label (defaults)              params                         pieces  points');
for (const def of FUNCTIONS) {
  const p = defaultParams(def);
  for (const param of def.params) {
    if (!allowedValues(param).includes(param.default)) {
      failures++;
      console.error(`✘ station ${def.number}: default ${param.name}=${param.default} is not an allowed value`);
    }
  }
  if (!STATIONS[def.number - 1]) {
    failures++;
    console.error(`✘ station ${def.number}: no content`);
  }
  // Check every combination of parameter extremes and defaults
  const combos = [p];
  for (const param of def.params) {
    const vals = allowedValues(param);
    for (const v of [vals[0], vals[vals.length - 1]]) combos.push({ ...p, [param.name]: v });
  }
  for (const combo of combos) {
    const pieces = samplePieces(def, combo);
    if (!pieces.length) {
      failures++;
      console.error(`✘ station ${def.number}: empty curve for ${JSON.stringify(combo)}`);
    }
    for (const piece of pieces) {
      for (const pt of piece) {
        if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y) || pt.y < Y_WINDOW[0] - 1e-9 || pt.y > Y_WINDOW[1] + 1e-9) {
          failures++;
          console.error(`✘ station ${def.number}: bad point ${JSON.stringify(pt)} for ${JSON.stringify(combo)}`);
          break;
        }
      }
    }
  }
  const pieces = samplePieces(def, p);
  const params = def.params.map((q) => `${paramLabel(q, q.default)} [${allowedValues(q).length}]`).join(', ');
  console.log(
    `${String(def.number).padStart(4)}     ${def.label(p).padEnd(28)} ${params.padEnd(30)} ${String(pieces.length).padStart(4)}  ${pieces.reduce((n, q) => n + q.length, 0)}`,
  );
}

// Specific shapes
const rational = samplePieces(FUNCTIONS[7], defaultParams(FUNCTIONS[7]));
expect('1/x: two branches', rational.length, 2);
const nearest = Math.min(...rational.flat().map((q) => Math.abs(q.x)));
expect('1/x: stops ≥ 0.05 before the asymptote (and cut at |y| ≤ 4)', nearest >= 0.05 - 1e-9, true);
expect('floor: 6 separate steps in −3…3', samplePieces(FUNCTIONS[9], defaultParams(FUNCTIONS[9])).length, 6);

// Labels at a few settings
console.log('\nlabels:');
for (const [n, p] of [[1, { a: 2 }], [3, { m: -0.5, b: 2 }], [3, { m: 0, b: 1 }], [5, { a: 10 }], [7, { a: 0.4, s: -1 }], [9, { a: -1, b: 2, c: -1.5 }], [10, { h: 0.5 }]]) {
  const def = FUNCTIONS[n - 1];
  console.log(`  ${n}: ${def.label({ ...defaultParams(def), ...p })}`);
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\n✔ all function checks passed');
