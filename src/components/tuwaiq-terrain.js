// <a-entity tuwaiq-terrain> — the Jebel Tuwaiq landscape, built once from terrain.js:
//   plateau (near band: fine grid that follows the rim; far: coarse grid that hides in the fog),
//   the layered cliff face, and the desert plain below.
// All meshes share one flat-shaded, vertex-coloured material (no textures yet; paper look in V.2).
import AFRAME from 'aframe';
import * as THREE from 'three';
import { fbm, noise2, smoothstep } from '../noise.js';
import { PLAIN_Y, WORLD, edgeZ, rowZ, plateauHeight, plainHeight, wadi } from '../terrain.js';
import { quality } from '../quality.js';
import { createTerrainMaterial } from '../terrain-material.js';

const C = (hex) => new THREE.Color(hex); // converted to linear, as vertex colours expect

// Dusty slide palette: sand and rose with mauve, not saturated orange.
const PALETTE = {
  sand: C('#E4C3A6'),
  pale: C('#EED8C4'),
  rose: C('#D4A09C'),
  terracotta: C('#C3826F'),
  mauve: C('#B48C9C'),
  capRock: C('#EADCC8'), // the pale cream top layer of Tuwaiq
  strata: ['#D6A386', '#BE826E', '#E0B99C', '#B07571', '#CC9886', '#B98A84', '#DAAE94', '#A46E6C'].map(C),
  talus: C('#C29C8E'),
  plain: C('#BF9C9C'),
  plainDark: C('#A48592'),
  plainCool: C('#A2948F'), // cooler grey-brown patches (slide 3)
  plainWadi: C('#D9C2BA'),
  mesa: C('#AE8D98'),
};

// Cliff layers (thickness in metres, top to bottom) down to the scree slope. The first one is the
// cap rock. Thinner layering inside each band is drawn by the shader (terrain-material.js).
const LAYERS = [4, 9, 6, 12, 5, 10, 14, 7, 11, 8];
const CLEFT_DEPTH = 4.5; // narrow deep vertical cracks (m)
const TALUS_SPREAD = 34; // how far the scree slope reaches out at the bottom (m)
const TALUS_ROWS = 7;

/** Column positions along x: fine where people walk, coarse far away (hidden by fog). */
function columns() {
  const xs = [];
  const add = (from, to, step) => {
    for (let x = from; x < to; x += step) xs.push(x);
  };
  add(WORLD.xMin, -600, 60);
  add(-600, -150, 12);
  add(-150, 800, quality.terrainStep);
  add(800, 1300, 12);
  add(1300, WORLD.xMax + 1, 60);
  return xs;
}

function steps(segments) {
  const out = [];
  for (const [from, to, step] of segments) for (let v = from; v < to - 1e-6; v += step) out.push(v);
  out.push(segments[segments.length - 1][1]);
  return out;
}

const tmp = new THREE.Color();

function plateauColor(x, z, target) {
  const broad = fbm(x * 0.01, z * 0.01, 3, 51) * 0.5 + 0.5;
  const blotch = smoothstep(0.15, 0.45, fbm(x * 0.045, z * 0.045, 3, 52));
  const pale = smoothstep(0.2, 0.5, fbm(x * 0.03 + 7, z * 0.03, 2, 53));
  const mauve = smoothstep(0.1, 0.5, fbm(x * 0.006 + 3, z * 0.006, 3, 54));
  target.copy(PALETTE.sand).lerp(PALETTE.rose, broad * 0.7);
  target.lerp(PALETTE.mauve, mauve * 0.35);
  target.lerp(PALETTE.terracotta, blotch * 0.4);
  target.lerp(PALETTE.pale, pale * 0.35);
  return target;
}

function plainColor(x, z, h, target) {
  const tone = fbm(x * 0.0015, z * 0.0015, 3, 61) * 0.5 + 0.5;
  const cool = smoothstep(0.05, 0.4, fbm(x * 0.0009 + 4, z * 0.0009, 3, 62));
  target.copy(PALETTE.plain).lerp(PALETTE.plainDark, tone * 0.6);
  target.lerp(PALETTE.plainCool, cool * 0.6);
  // Fine riverbeds near the cliff come from the painted overlay; this is only for the far plain
  target.lerp(PALETTE.plainWadi, wadi(x, z) * 0.25);
  target.lerp(PALETTE.mesa, smoothstep(PLAIN_Y + 15, PLAIN_Y + 60, h));
  return target;
}

/** Indexed grid geometry: rows × cols vertices from a (i, j) => [x, y, z, color] function. */
function gridGeometry(cols, rows, vertex, upward) {
  const positions = new Float32Array(cols * rows * 3);
  const colors = new Float32Array(cols * rows * 3);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 3;
      const [x, y, z, color] = vertex(i, j);
      positions[k] = x;
      positions[k + 1] = y;
      positions[k + 2] = z;
      colors[k] = color.r;
      colors[k + 1] = color.g;
      colors[k + 2] = color.b;
    }
  }
  const index = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      // upward-facing (plateau, plain) vs outward-facing (cliff) winding
      if (upward) index.push(a, c, b, b, c, d);
      else index.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

function buildPlateau(xs, ds, sink = 0) {
  return gridGeometry(xs.length, ds.length, (i, j) => {
    const x = xs[i];
    const z = rowZ(x, ds[j]);
    const y = plateauHeight(x, z) - (j === 0 ? sink : 0);
    return [x, y, z, plateauColor(x, z, tmp)];
  }, true);
}

/** Cliff profile rows shared by every column: depth below the rim, outward offset, colour, shade. */
function cliffProfile() {
  const rows = [{ depth: 0, off: 0, layer: 0, shade: 1 }];
  let top = 0;
  LAYERS.forEach((thickness, k) => {
    const base = k * 0.6; // each layer steps out a little: the stacked look of Tuwaiq
    const cap = k === 0;
    // The cap rock overhangs a little more than the layers below it
    rows.push({ depth: top + 0.6, off: base + (cap ? 1.8 : 1.3), layer: k, shade: 1.06, cap }); // ledge
    rows.push({ depth: top + thickness - 0.5, off: base - 0.5, layer: k, shade: 0.8, cap }); // undercut
    top += thickness;
  });
  return { rows, talusTop: top, talusBase: (LAYERS.length - 1) * 0.7 };
}

function smoothedOutward(x) {
  const e = 14; // smoothed so the scree slope doesn't fold in tight bays
  const slope = (edgeZ(x + e) - edgeZ(x - e)) / (2 * e);
  const len = Math.hypot(slope, 1);
  return [slope / len, -1 / len];
}

function buildCliff(xs) {
  const { rows, talusTop, talusBase } = cliffProfile();
  const totalRows = rows.length + TALUS_ROWS;
  return gridGeometry(xs.length, totalRows, (i, j) => {
    const x = xs[i];
    const rimZ = edgeZ(x);
    const rimY = plateauHeight(x, rimZ);
    const [ox, oz] = smoothedOutward(x);
    const bottom = rimY - (PLAIN_Y - 3); // reach a little below the plain so there is no gap

    let depth;
    let off;
    if (j < rows.length) {
      const r = rows[j];
      depth = r.depth;
      off = r.off;
      tmp.copy(r.cap ? PALETTE.capRock : PALETTE.strata[r.layer % PALETTE.strata.length]).multiplyScalar(r.shade);
    } else {
      const s = (j - rows.length + 1) / TALUS_ROWS;
      depth = talusTop + (bottom - talusTop) * s;
      off = talusBase + TALUS_SPREAD * s ** 1.7;
      tmp.copy(PALETTE.strata[(LAYERS.length - 1) % PALETTE.strata.length]).lerp(PALETTE.talus, Math.min(1, s * 1.6));
      if (s > 0.85) tmp.lerp(PALETTE.plain, (s - 0.85) / 0.15);
    }
    // Rock texture: tall vertical columns (x-driven) + smaller lumps. None at the rim itself.
    const rough = smoothstep(0, 3, depth);
    off += rough * (1.8 * noise2(x * 0.22, depth * 0.03, 41) + 0.7 * noise2(x * 0.09, depth * 0.18, 43));
    // Narrow deep clefts: sharp dips where the noise crosses zero, running down the face
    const cleft = Math.pow(1 - Math.abs(noise2(x * 0.11, depth * 0.004, 45)), 10);
    off -= rough * CLEFT_DEPTH * cleft;
    tmp.multiplyScalar(1 + 0.06 * noise2(x * 0.3, depth * 0.05, 47));

    return [x + ox * off, rimY - depth, rimZ + oz * off, tmp];
  }, false);
}

function buildPlain() {
  const xs = steps([[WORLD.xMin, WORLD.xMax, 60]]);
  const zs = steps([[-WORLD.plainOut, 60, 60]]);
  return gridGeometry(xs.length, zs.length, (i, j) => {
    const x = xs[i];
    const z = zs[j];
    const y = plainHeight(x, z);
    return [x, y, z, plainColor(x, z, y, tmp)];
  }, true);
}

AFRAME.registerComponent('tuwaiq-terrain', {
  init() {
    const t0 = performance.now();
    this.material = createTerrainMaterial();
    this.plainMaterial = createTerrainMaterial({ wadi: true });
    const xs = columns();
    const nearRows = steps([[0, 40, 2], [40, 150, 6]]);
    const farRows = steps([[145, 600, 25], [600, WORLD.inland, 150]]);
    const farXs = steps([[WORLD.xMin, WORLD.xMax, 40]]);

    this.group = new THREE.Group();
    this.meshes = [
      [buildPlateau(xs, nearRows), this.material],
      [buildPlateau(farXs, farRows, 0.4), this.material], // overlaps the near band by 5 m; first row sunk to hide seams
      [buildCliff(xs), this.material],
      [buildPlain(), this.plainMaterial],
    ].map(([geometry, material]) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      return mesh;
    });
    this.el.setObject3D('terrain', this.group);

    const triangles = this.meshes.reduce((n, m) => n + m.geometry.index.count / 3, 0);
    console.info(`[terrain] ${Math.round(triangles / 1000)}k triangles, built in ${Math.round(performance.now() - t0)} ms`);
  },

  remove() {
    this.el.removeObject3D('terrain');
    this.meshes.forEach((m) => m.geometry.dispose());
    this.material.dispose();
    this.plainMaterial.dispose();
  },
});
