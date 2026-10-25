// Scene kit for the dioramas (NATURE_SCENES.md §5): the reusable pieces the 10 scenes are built from.
// Everything is in station-local metres (see station-layout.js). Unit geometries and materials are
// made once and shared by every station; each piece only owns its instance buffers / canvas
// textures, released by dispose(). Pieces are re-anchored with cheap transform updates, so the
// landscape can follow the curve while a parameter changes.
import * as THREE from 'three';
import { rng } from '../noise.js';
import { arabicFontsReady, ARABIC_FAMILY } from '../fonts.js';
import { propParts, clayMaterial } from '../props.js';
import { quality } from '../quality.js';

/** Above this height (m) a rise becomes a small Tuwaiq-style mesa instead of a plain mound. */
export const MESA_FROM = 1.2;

const shared = {};
const mat = (key, make) => (shared[key] ??= make());
const clay = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, flatShading: true, ...opts });

function vertexColored(geometry, colorAt) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    // one colour per triangle (flat, painterly)
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    colorAt(cx, cy, cz, c, i / 3);
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.deleteAttribute('uv');
  g.computeVertexNormals();
  return g;
}

// ---------- Rise: a green hill (≤ MESA_FROM) or a Tuwaiq mesa (taller) ----------

const GREENS = ['#8CBF72', '#7DB467', '#97C77C', '#83B86D'].map((h) => new THREE.Color(h));

function hillGeometry() {
  return (shared.hillGeo ??= (() => {
    const random = rng(31);
    const g = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    // gentle lumps, base stays flat
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const k = 1 + 0.07 * Math.sin(p.getX(i) * 7 + p.getZ(i) * 5) * Math.min(1, y * 3);
      p.setXYZ(i, p.getX(i) * k, y, p.getZ(i) * k);
    }
    return vertexColored(g, (x, y, z, c) => c.copy(GREENS[Math.floor(random() * GREENS.length)]));
  })());
}

// Tuwaiq strata, bottom to top (like the cliff): [height fraction, inset, colour]
const STRATA = [
  [0, 0, '#E0B48F'], [0.15, 0, '#E0B48F'],
  [0.165, -0.07, '#CC9378'], [0.33, 0, '#CC9378'],
  [0.345, -0.06, '#BC826E'], [0.53, 0, '#BC826E'],
  [0.545, -0.06, '#DAAA88'], [0.72, 0, '#DAAA88'],
  [0.735, -0.05, '#C78C7B'], [0.86, 0, '#C78C7B'],
  [0.875, 0.04, '#EBDDC9'], [1, 0.04, '#EBDDC9'], // pale cream cap rock
];

function mesaGeometry() {
  return (shared.mesaGeo ??= (() => {
    const random = rng(57);
    const sides = 11;
    const radii = Array.from({ length: sides }, () => 0.86 + random() * 0.18);
    const pos = [];
    const col = [];
    const c = new THREE.Color();
    const ring = (k, j) => {
      const [h, inset] = STRATA[k];
      const a = (j / sides) * Math.PI * 2;
      const r = radii[j % sides] * (1 + inset) * (1 + 0.04 * Math.sin(h * 40 + j));
      return [Math.cos(a) * r, h, Math.sin(a) * r];
    };
    for (let k = 0; k < STRATA.length - 1; k++) {
      c.set(STRATA[k + 1][2]);
      for (let j = 0; j < sides; j++) {
        const a0 = ring(k, j);
        const a1 = ring(k, j + 1);
        const b0 = ring(k + 1, j);
        const b1 = ring(k + 1, j + 1);
        pos.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1);
        for (let v = 0; v < 6; v++) col.push(c.r, c.g, c.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  })());
}

function capGeometry() {
  return (shared.capGeo ??= (() => {
    const random = rng(77);
    return vertexColored(new THREE.SphereGeometry(1, 14, 4, 0, Math.PI * 2, 0, 1.0), (x, y, z, c) =>
      c.copy(GREENS[Math.floor(random() * GREENS.length)]));
  })());
}

const vcMat = () => mat('vc', () => clay({ vertexColors: true }));
const stepMat = () => mat('step', () => clay({ color: '#D8C4AA' }));
const unitBox = () => (shared.box ??= new THREE.BoxGeometry(1, 1, 1));

/** Instanced Kenney model: one InstancedMesh per material part, `count` slots. */
class KenneyInstances {
  constructor(name, count) {
    this.group = new THREE.Group();
    this.meshes = propParts(name).map((p) => {
      const m = new THREE.InstancedMesh(p.geometry, p.material, count);
      m.count = 0;
      this.group.add(m);
      return m;
    });
  }

  set(list) {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    for (const mesh of this.meshes) {
      mesh.count = Math.min(list.length, mesh.instanceMatrix.count);
      list.slice(0, mesh.count).forEach((p, i) => {
        q.setFromAxisAngle(Y_AXIS, p.rotY ?? 0);
        mesh.setMatrixAt(i, m4.compose(V.set(p.x, p.y, p.z), q, S.setScalar(p.scale ?? 1)));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }

  dispose() {
    this.meshes.forEach((m) => m.dispose());
  }
}
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const V = new THREE.Vector3();
const S = new THREE.Vector3();

export class Rise {
  /**
   * @param seed        for flower placement
   * @param radius      footprint radius (m)
   * @param stairs      add a stone stair up the front
   * @param flowerCount flowers on top / slopes (scaled by quality)
   */
  constructor({ seed = 1, radius = 0.42, stairs = false, flowerCount = 8 } = {}) {
    this.seed = seed;
    this.r = radius;
    this.group = new THREE.Group();
    this.hill = new THREE.Mesh(hillGeometry(), vcMat());
    this.mesa = new THREE.Group();
    this.mesaBody = new THREE.Mesh(mesaGeometry(), vcMat());
    this.mesaCap = new THREE.Mesh(capGeometry(), vcMat());
    this.mesa.add(this.mesaBody, this.mesaCap);
    this.group.add(this.hill, this.mesa);
    this.stairs = stairs ? new THREE.InstancedMesh(unitBox(), stepMat(), 26) : null;
    if (this.stairs) this.group.add(this.stairs);
    const n = Math.round(flowerCount * (quality.level === 'low' ? 0.5 : quality.level === 'high' ? 1.5 : 1));
    this.flowersPink = new KenneyInstances('flower_redA', n);
    this.flowersWhite = new KenneyInstances('flower_yellowA', n);
    this.bushes = new KenneyInstances('plant_bush', 4);
    this.group.add(this.flowersPink.group, this.flowersWhite.group, this.bushes.group);
    this.nFlowers = n;
    this.last = null;
  }

  /**
   * Place the rise so its top is at `topY` above (x, z), standing on the plinth at `baseY`.
   * `stairSide` = −1: the stair climbs from the left, +1: from the right.
   */
  place(x, z, baseY, topY, stairSide = -1) {
    const h = Math.max(0.08, topY - baseY);
    const key = `${x.toFixed(3)} ${z.toFixed(3)} ${baseY.toFixed(3)} ${h.toFixed(3)} ${stairSide}`;
    if (key === this.last) return;
    this.last = key;
    this.height = h;
    const isMesa = h > MESA_FROM;
    const r = isMesa ? Math.max(this.r, 0.5) : Math.min(0.72, Math.max(this.r, h * 0.85));
    this.rNow = r;
    this.hill.visible = !isMesa;
    this.mesa.visible = isMesa;
    this.group.position.set(x, baseY, z);
    if (isMesa) {
      const rm = r * 0.85;
      this.mesaBody.scale.set(rm, h - 0.06, rm * 0.8);
      this.mesaCap.scale.set(rm * 1.06, 0.1, rm * 0.85);
      this.mesaCap.position.y = h - 0.08;
    } else {
      this.hill.scale.set(r, h, r * 0.8);
    }
    this.placeFlowers(isMesa, h);
    if (this.stairs) this.placeStairs(isMesa, h, stairSide);
  }

  placeFlowers(isMesa, h) {
    const random = rng(this.seed * 13 + 1);
    const r = this.rNow;
    const pink = [];
    const white = [];
    const bush = [];
    for (let i = 0; i < this.nFlowers * 2; i++) {
      let px;
      let pz;
      let py;
      if (isMesa) {
        // on the grassy top
        const a = random() * Math.PI * 2;
        const d = Math.sqrt(random()) * 0.75;
        px = Math.cos(a) * d * r * 0.85;
        pz = Math.sin(a) * d * r * 0.68;
        py = h + 0.02 - 0.06 * d * d;
      } else {
        // over the dome, mostly on the side facing the visitor
        const u = random() * 1.6 - 0.8;
        const v = random() * 0.9 - 0.1;
        const s = 1 - u * u - v * v;
        if (s <= 0.05) continue;
        px = u * r;
        pz = v * r * 0.8;
        py = h * Math.sqrt(s);
      }
      (i % 2 ? white : pink).push({ x: px, y: py, z: pz, scale: 0.5 + random() * 0.25, rotY: random() * 6.28 });
    }
    for (let i = 0; i < 3; i++) {
      const a = 0.4 + i * 1.1 + random();
      bush.push({ x: Math.cos(a) * r * 0.95, y: 0, z: Math.abs(Math.sin(a)) * r * 0.55, scale: 0.55 + random() * 0.3, rotY: random() * 6 });
    }
    this.flowersPink.set(pink);
    this.flowersWhite.set(white);
    this.bushes.set(bush);
  }

  /** Stone steps: a straight flight up the hill's front, or an arc carved across a mesa's front. */
  placeStairs(isMesa, h, side) {
    const n = Math.max(3, Math.min(26, Math.round(h / (isMesa ? 0.1 : 0.085))));
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const r = this.rNow;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const top = ((i + 1) / n) * h;
      let x;
      let z;
      let yaw;
      if (isMesa) {
        // around the front of the mesa, from the `side` toward the other side
        const a0 = side < 0 ? Math.PI * 0.95 : Math.PI * 0.05;
        const a1 = side < 0 ? Math.PI * 0.35 : Math.PI * 0.65;
        const a = a0 + (a1 - a0) * t;
        x = Math.cos(a) * r * 0.86;
        z = Math.sin(a) * r * 0.86 * 0.8 + 0.04;
        yaw = -a + Math.PI / 2;
        S.set(0.17, 0.05, 0.12);
        V.set(x, top - 0.025, z);
      } else {
        // straight up the front slope from the foot (side) to just below the top
        x = side * r * (1 - t * 0.85);
        z = r * 0.55 * (1 - t) + 0.08;
        yaw = 0;
        S.set(0.12, top, 0.16);
        V.set(x, top / 2, z);
      }
      q.setFromAxisAngle(Y_AXIS, yaw);
      this.stairs.setMatrixAt(i, m4.compose(V, q, S));
    }
    this.stairs.count = n;
    this.stairs.instanceMatrix.needsUpdate = true;
    this.stairs.computeBoundingSphere();
  }

  dispose() {
    this.stairs?.dispose();
    this.flowersPink.dispose();
    this.flowersWhite.dispose();
    this.bushes.dispose();
  }
}

// ---------- Rock pile: grey boulders stacked up to a given height ----------

function rockGeometry() {
  return (shared.rockGeo ??= (() => {
    const random = rng(11);
    const parts = [];
    // a base of 4 big boulders and a few smaller ones on top, normalised to height 1, radius 1
    const spots = [[-0.45, 0.25, 0.1, 0.5], [0.4, 0.22, -0.15, 0.48], [0, 0.25, 0.35, 0.42], [0.05, 0.3, -0.35, 0.45], [-0.15, 0.62, 0, 0.42], [0.3, 0.6, 0.1, 0.32], [0, 0.85, 0, 0.22]];
    for (const [x, y, z, r] of spots) {
      const g = new THREE.IcosahedronGeometry(r, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.85 + random() * 0.3), p.getY(i) * (0.75 + random() * 0.3), p.getZ(i) * (0.85 + random() * 0.3));
      g.translate(x, y, z);
      parts.push(g.toNonIndexed());
    }
    const merged = mergeAll(parts);
    const greys = ['#A49D99', '#9A938F', '#B0A9A4', '#8F8986'].map((h) => new THREE.Color(h));
    const geo = vertexColored(merged, (x, y, z, c, f) => c.copy(greys[f % greys.length]));
    geo.computeBoundingBox();
    const top = geo.boundingBox.max.y;
    geo.scale(1, 1 / top, 1);
    return geo;
  })());
}

function mergeAll(geos) {
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o);
    o += g.attributes.position.array.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return out;
}

export class RockPile {
  constructor({ radius = 0.3, seed = 1 } = {}) {
    this.r = radius;
    this.group = new THREE.Group();
    this.mesh = new THREE.Mesh(rockGeometry(), vcMat());
    this.group.add(this.mesh);
    this.plants = new KenneyInstances('grass_leafs', 4);
    this.group.add(this.plants.group);
    const random = rng(seed);
    this.plantSpots = Array.from({ length: 4 }, (_, i) => ({ a: i * 1.6 + random(), s: 0.5 + random() * 0.3 }));
  }

  /** Top of the pile at topY (the traveller can sit there); never lower than a small cluster. */
  place(x, z, baseY, topY, { flip = 1 } = {}) {
    const h = Math.max(0.12, topY - baseY);
    const r = Math.min(0.6, Math.max(this.r, h * 0.68));
    this.group.position.set(x, baseY, z);
    this.mesh.scale.set(r * flip, h, r * 0.75);
    this.plants.set(this.plantSpots.map(({ a, s }) => ({ x: Math.cos(a) * r * 1.05, y: 0, z: Math.abs(Math.sin(a)) * r * 0.7, scale: s })));
    this.height = h;
  }

  dispose() {
    this.plants.dispose();
  }
}

// ---------- Sign cards on wooden posts ----------

const SIGN_COLORS = { pink: '#F8D5E3', lilac: '#E5D7F6' };
const postMat = () => mat('post', () => clay({ color: '#C99560' }));
const postGeo = () => (shared.post ??= new THREE.CylinderGeometry(0.012, 0.014, 1, 6));

function signTexture(text, color, w, h) {
  const scale = 1400; // px per metre
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const draw = () => {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const r = 34;
    ctx.beginPath();
    ctx.moveTo(r, 4);
    ctx.arcTo(W - 4, 4, W - 4, H - 4, r);
    ctx.arcTo(W - 4, H - 4, 4, H - 4, r);
    ctx.arcTo(4, H - 4, 4, 4, r);
    ctx.arcTo(4, 4, W - 4, 4, r);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(59,31,43,0.25)';
    ctx.lineWidth = 5;
    ctx.stroke();
    // One line per « · » part, like the photos (the words are unchanged)
    const lines = text.split(' · ');
    let size = Math.min(H / (lines.length * 1.35 + 0.4), 92);
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3B1F2B';
    for (;;) {
      ctx.font = `700 ${size}px ${ARABIC_FAMILY}`;
      if (Math.max(...lines.map((l) => ctx.measureText(l).width)) <= W - 50 || size < 20) break;
      size *= 0.92;
    }
    const lh = size * 1.3;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * lh));
    tex.needsUpdate = true;
  };
  arabicFontsReady().then(draw);
  return tex;
}

export class Sign {
  /** A paper card (width w, height h, m) on a wooden post; postHeight = 0 for a hanging card. */
  constructor({ text, theme = 'pink', w = 0.36, h = 0.24, postHeight = 0.26, hanging = false }) {
    this.group = new THREE.Group();
    this.texture = signTexture(text, SIGN_COLORS[theme], w, h);
    this.card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.texture, transparent: true }));
    this.back = new THREE.Mesh(this.card.geometry, new THREE.MeshBasicMaterial({ color: SIGN_COLORS[theme], side: THREE.BackSide }));
    this.card.position.y = postHeight + h / 2;
    this.back.position.copy(this.card.position);
    this.back.position.z -= 0.002;
    this.group.add(this.card, this.back);
    if (postHeight > 0) {
      const post = new THREE.Mesh(postGeo(), postMat());
      post.scale.y = postHeight + h * 0.6;
      post.position.set(0, post.scale.y / 2, -0.01);
      this.group.add(post);
    }
    if (hanging) {
      // a thin string up to whatever it hangs from (set by place: string length)
      this.string = new THREE.Mesh(postGeo(), postMat());
      this.string.scale.set(0.25, 0.1, 0.25);
      this.group.add(this.string);
    }
    this.h = h;
  }

  place(x, y, z, { yaw = 0, stringLength = 0 } = {}) {
    this.group.position.set(x, y, z);
    this.group.rotation.y = yaw;
    if (this.string) {
      this.string.scale.y = Math.max(0.01, stringLength);
      this.string.position.y = this.h + stringLength / 2;
    }
  }

  dispose() {
    this.texture.dispose();
    this.card.geometry.dispose();
    this.card.material.dispose();
    this.back.material.dispose();
  }
}

// ---------- Rain cloud ----------

function cloudGeometry() {
  return (shared.cloudGeo ??= (() => {
    const random = rng(5);
    const blobs = [[0, 0, 0, 0.16], [0.15, 0.03, 0.02, 0.13], [-0.15, 0.02, 0, 0.12], [0.05, 0.1, -0.02, 0.12], [-0.06, 0.08, 0.04, 0.1], [0.24, -0.02, 0, 0.09], [-0.24, -0.02, 0.01, 0.08]];
    const geos = blobs.map(([x, y, z, r]) => {
      const g = new THREE.IcosahedronGeometry(r, 1);
      g.scale(1, 0.78, 0.8);
      g.translate(x, y, z);
      return g.toNonIndexed();
    });
    const shades = ['#8E8898', '#9993A3', '#84808F'].map((h) => new THREE.Color(h));
    return vertexColored(mergeAll(geos), (x, y, z, c) => c.copy(shades[Math.floor(random() * 3)]).offsetHSL(0, 0, y * 0.25));
  })());
}

export class RainCloud {
  constructor({ seed = 1, scale = 1 } = {}) {
    this.group = new THREE.Group();
    this.cloud = new THREE.Mesh(cloudGeometry(), vcMat());
    this.cloud.scale.setScalar(scale);
    this.group.add(this.cloud);
    const count = quality.level === 'low' ? 0 : quality.level === 'high' ? 18 : 11;
    this.drops = null;
    if (count) {
      const geo = (shared.drop ??= new THREE.CapsuleGeometry(0.006, 0.03, 2, 4));
      this.drops = new THREE.InstancedMesh(geo, mat('drop', () => new THREE.MeshBasicMaterial({ color: '#7FB5F3' })), count);
      this.group.add(this.drops);
      const random = rng(seed);
      this.dropState = Array.from({ length: count }, () => ({ x: (random() - 0.5) * 0.4 * scale, z: (random() - 0.5) * 0.15, t: random() }));
      this.fall = 0.55;
      this.tick(0);
    }
    this.raining = 1;
  }

  place(x, y, z) {
    this.group.position.set(x, y, z);
  }

  /** 0 = stopped, 1 = raining (the journey stops the rain in N.5). */
  setRain(v) {
    this.raining = v;
    if (this.drops) this.drops.visible = v > 0.01;
  }

  tick(dt) {
    if (!this.drops || !this.drops.visible) return;
    const m4 = new THREE.Matrix4();
    this.dropState.forEach((d, i) => {
      d.t = (d.t + dt * 1.6) % 1;
      m4.makeTranslation(d.x, -0.09 - d.t * this.fall, d.z);
      this.drops.setMatrixAt(i, m4);
    });
    this.drops.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.drops?.dispose();
  }
}

// ---------- Sun sprite ----------

function sunTexture() {
  return (shared.sunTex ??= (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.translate(128, 128);
    ctx.fillStyle = '#FFD45A';
    for (let i = 0; i < 12; i++) {
      ctx.save();
      ctx.rotate((i / 12) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(-9, -66);
      ctx.lineTo(9, -66);
      ctx.lineTo(4, -118);
      ctx.lineTo(-4, -118);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const g = ctx.createRadialGradient(-12, -12, 6, 0, 0, 58);
    g.addColorStop(0, '#FFF3B0');
    g.addColorStop(1, '#FFD04E');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })());
}

function glowTexture() {
  return (shared.glowTex ??= (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,230,160,1)');
    g.addColorStop(0.4, 'rgba(255,214,120,0.45)');
    g.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })());
}

export class Sun {
  constructor({ size = 0.42 } = {}) {
    this.group = new THREE.Group();
    this.glow = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.6, size * 2.6), mat('sunGlow', () =>
      new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    this.disc = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat('sunDisc', () =>
      new THREE.MeshBasicMaterial({ map: sunTexture(), transparent: true, depthWrite: false })));
    this.disc.position.z = 0.01;
    this.group.add(this.glow, this.disc);
    this.time = 0;
    this.flare = 0;
  }

  place(x, y, z) {
    this.group.position.set(x, y, z);
  }

  /** A brighter pulse (the journey's ending, N.5). */
  pulse() {
    this.flare = 1;
  }

  tick(dt) {
    this.time += dt;
    this.flare = Math.max(0, this.flare - dt * 0.6);
    this.disc.rotation.z = this.time * 0.15;
    const s = 1 + 0.06 * Math.sin(this.time * 1.7) + 0.5 * this.flare;
    this.glow.scale.setScalar(s);
  }

  dispose() {
    this.glow.geometry.dispose();
    this.disc.geometry.dispose();
  }
}

// ---------- Small Kenney arrangements ----------

export class PropSet {
  /** A fixed set of Kenney instances: [{ name, x, y, z, scale, rotY }] (re-placeable). */
  constructor(names, perName = 8) {
    this.group = new THREE.Group();
    this.sets = Object.fromEntries(names.map((n) => {
      const k = new KenneyInstances(n, perName);
      this.group.add(k.group);
      return [n, k];
    }));
  }

  set(list) {
    for (const [name, k] of Object.entries(this.sets)) k.set(list.filter((p) => p.name === name));
  }

  dispose() {
    Object.values(this.sets).forEach((k) => k.dispose());
  }
}

/** A tree from Kenney parts: `leaves: false` keeps only the trunk and branches (a bare tree). */
export class KenneyTree {
  constructor(name, { leaves = true, blossoms = 0, seed = 1 } = {}) {
    this.group = new THREE.Group();
    this.native = 0;
    for (const p of propParts(name)) {
      if (!leaves && p.material !== clayMaterial('woodBark')) continue;
      const m = new THREE.Mesh(p.geometry, p.material);
      this.group.add(m);
      this.native = Math.max(this.native, p.geometry.boundingBox.max.y);
      if (!leaves) {
        // a bare tree: a second, turned and slightly smaller set of branches makes it fuller
        const m2 = new THREE.Mesh(p.geometry, p.material);
        m2.rotation.set(0.12, 1.9, -0.1);
        m2.scale.setScalar(0.82);
        this.group.add(m2);
      }
    }
    this.blossoms = blossoms ? new KenneyInstances('flower_redA', blossoms) : null;
    if (this.blossoms) this.group.add(this.blossoms.group);
    this.seed = seed;
  }

  /**
   * Stand at (x, baseY, z) with its top at `height` metres. A tall tree grows taller, not wider:
   * its width stops growing at `maxWidthScale` (a slender trunk lifts the crown).
   */
  place(x, baseY, z, height, maxWidthScale = 0.95) {
    const s = Math.max(0.05, height) / this.native;
    const w = Math.min(s, maxWidthScale);
    this.group.position.set(x, baseY, z);
    this.group.scale.set(w, s, w);
    if (this.blossoms) {
      const random = rng(this.seed);
      const n = this.blossoms.meshes[0].instanceMatrix.count;
      this.blossoms.set(Array.from({ length: n }, () => {
        const a = random() * Math.PI * 2;
        const u = random();
        // on the crown's surface, mostly on the side facing the visitor
        const zSide = Math.abs(Math.sin(a)) * (u < 0.75 ? 1 : -1);
        return { x: Math.cos(a) * 0.3, y: this.native * (0.6 + random() * 0.35), z: zSide * 0.3, scale: 0.6, rotY: a };
      }));
    }
  }

  dispose() {
    this.blossoms?.dispose();
  }
}

// ---------- Drifting petals (station 4) ----------

export class Petals {
  constructor({ count = 14, seed = 3 } = {}) {
    const n = Math.round(count * (quality.level === 'low' ? 0.5 : quality.level === 'high' ? 1.6 : 1));
    this.mesh = new THREE.InstancedMesh(
      (shared.petal ??= new THREE.CircleGeometry(0.016, 5)),
      mat('petal', () => new THREE.MeshBasicMaterial({ color: '#F6B6CB', side: THREE.DoubleSide })),
      n,
    );
    const random = rng(seed);
    this.state = Array.from({ length: n }, () => ({ t: random(), sway: random() * 6.28, dz: (random() - 0.5) * 0.4, speed: 0.06 + random() * 0.05 }));
    this.box = { x0: 0, x1: 1, y0: 0, y1: 1, z: 0 };
    this.time = 0;
  }

  /** Petals drift from (x0, y1) toward (x1, y0), looping. */
  area(x0, x1, y0, y1, z) {
    this.box = { x0, x1, y0, y1, z };
  }

  tick(dt) {
    this.time += dt;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const { x0, x1, y0, y1, z } = this.box;
    this.state.forEach((p, i) => {
      p.t = (p.t + dt * p.speed) % 1;
      const x = x0 + (x1 - x0) * p.t;
      const y = y1 - (y1 - y0) * p.t + 0.04 * Math.sin(this.time * 1.3 + p.sway);
      q.setFromEuler(new THREE.Euler(this.time * 1.1 + p.sway, this.time * 0.7, 0));
      this.mesh.setMatrixAt(i, m4.compose(V.set(x, y, z + p.dz), q, S.setScalar(1)));
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.dispose();
  }
}
