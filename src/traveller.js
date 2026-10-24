// The traveller (NATURE_SCENES.md §3): a small faceless chibi girl, ≈0.45 m tall, built in code from
// soft primitives. Every part is rigidly bound to one joint of a simple skeleton, and all parts are
// merged into ONE skinned mesh with vertex colours: 1 draw call, ≈2.5k triangles. The geometry and
// material are shared by every station; each Traveller only owns its skeleton.
//
//   const t = new Traveller();  station.add(t.object);  t.setPose('sitCalm');  t.update(dt, time)
//
// Local frame: she faces +z, feet at y = 0 (for seated poses, y = 0 is the seat).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const COLORS = {
  skin: '#F6DECF',
  hair: '#7A5038', // warm dark brown
  top: '#C9B6EE', // lilac long-sleeve top
  jeans: '#B7CFEE', // light-blue jeans
  shoe: '#FFFFFF', // white sneakers
};

// Joints: name, parent, bind position relative to the parent (metres). Limbs point down (−y).
const BONES = [
  ['hips', null, [0, 0.165, 0]],
  ['spine', 'hips', [0, 0.012, 0]],
  ['chest', 'spine', [0, 0.06, 0]],
  ['neck', 'chest', [0, 0.042, 0]],
  ['head', 'neck', [0, 0.016, 0]],
  ['upperArmL', 'chest', [0.06, 0.032, 0]],
  ['lowerArmL', 'upperArmL', [0, -0.066, 0]],
  ['upperArmR', 'chest', [-0.06, 0.032, 0]],
  ['lowerArmR', 'upperArmR', [0, -0.066, 0]],
  ['upperLegL', 'hips', [0.03, -0.012, 0]],
  ['lowerLegL', 'upperLegL', [0, -0.072, 0]],
  ['upperLegR', 'hips', [-0.03, -0.012, 0]],
  ['lowerLegR', 'upperLegR', [0, -0.072, 0]],
];
const BONE_INDEX = Object.fromEntries(BONES.map(([name], i) => [name, i]));
const HIPS_Y = BONES[0][2][1];

/** Parts: [bone, geometry factory, colour, offset, rotation (rad), scale]. */
function partList() {
  const sphere = (r, w = 14, h = 10) => () => new THREE.SphereGeometry(r, w, h);
  const capsule = (r, len, cap = 3, radial = 10) => () => new THREE.CapsuleGeometry(r, len, cap, radial);
  const parts = [
    ['hips', sphere(0.048, 12, 8), 'jeans', [0, 0.004, 0], [0, 0, 0], [1, 0.78, 0.82]],
    ['spine', capsule(0.044, 0.05, 4, 12), 'top', [0, 0.035, 0], [0, 0, 0], [1.05, 1, 0.8]],
    ['chest', sphere(0.05, 12, 8), 'top', [0, 0.012, 0], [0, 0, 0], [1.15, 0.72, 0.82]],
    ['neck', () => new THREE.CylinderGeometry(0.016, 0.018, 0.03, 8), 'skin', [0, 0.004, 0], [0, 0, 0], [1, 1, 1]],
    // Head: a smooth face with no features
    ['head', sphere(0.085, 20, 14), 'skin', [0, 0.07, 0], [0, 0, 0], [1, 0.96, 0.97]],
    // Hair: a cap over the top (fringe line above the face), a shell around the sides and back,
    // two side locks, and long waves down the back (on the chest joint, so they follow the body)
    ['head', () => new THREE.SphereGeometry(0.093, 20, 10, 0, Math.PI * 2, 0, 1.18), 'hair', [0, 0.072, -0.004], [0, 0, 0], [1, 1, 1]],
    ['head', () => new THREE.SphereGeometry(0.094, 16, 12, Math.PI / 2 + 0.75, Math.PI * 2 - 1.5, 0.9, 1.7), 'hair', [0, 0.07, -0.006], [0, 0, 0], [1, 1, 1]],
    ['head', capsule(0.021, 0.075, 3, 8), 'hair', [0.079, 0.018, 0.008], [0.1, 0, 0.14], [1, 1, 0.9]],
    ['head', capsule(0.021, 0.075, 3, 8), 'hair', [-0.079, 0.018, 0.008], [0.1, 0, -0.14], [1, 1, 0.9]],
    ['chest', capsule(0.04, 0.13, 4, 12), 'hair', [0, 0.02, -0.058], [0.14, 0, 0], [1.35, 1, 0.75]],
    ['chest', capsule(0.03, 0.12, 4, 10), 'hair', [0.055, 0.02, -0.045], [0.1, 0, 0.13], [1, 1, 0.85]],
    ['chest', capsule(0.03, 0.12, 4, 10), 'hair', [-0.055, 0.02, -0.045], [0.1, 0, -0.13], [1, 1, 0.85]],
    ['chest', capsule(0.022, 0.09, 3, 8), 'hair', [0.07, 0.03, -0.012], [0.05, 0, 0.18], [1, 1, 0.9]],
    ['chest', capsule(0.022, 0.09, 3, 8), 'hair', [-0.07, 0.03, -0.012], [0.05, 0, -0.18], [1, 1, 0.9]],
  ];
  for (const side of ['L', 'R']) {
    parts.push(
      [`upperArm${side}`, capsule(0.019, 0.045, 3, 8), 'top', [0, -0.033, 0], [0, 0, 0], [1, 1, 1]],
      [`lowerArm${side}`, capsule(0.017, 0.04, 3, 8), 'top', [0, -0.027, 0], [0, 0, 0], [1, 1, 1]],
      [`lowerArm${side}`, sphere(0.019, 8, 6), 'skin', [0, -0.062, 0], [0, 0, 0], [1, 1.1, 0.9]],
      [`upperLeg${side}`, capsule(0.025, 0.045, 3, 8), 'jeans', [0, -0.036, 0], [0, 0, 0], [1, 1, 1]],
      [`lowerLeg${side}`, capsule(0.022, 0.046, 3, 8), 'jeans', [0, -0.034, 0], [0, 0, 0], [1, 1, 1]],
      [`lowerLeg${side}`, () => new RoundedBoxGeometry(0.038, 0.026, 0.062, 2, 0.011), 'shoe', [0, -0.069, 0.011], [0, 0, 0], [1, 1, 1]],
    );
  }
  return parts;
}

/** Bind-pose world matrices of the joints (no rotation in the bind pose). */
function bindMatrices() {
  const world = {};
  for (const [name, parent, pos] of BONES) {
    const m = new THREE.Matrix4().makeTranslation(...pos);
    world[name] = parent ? world[parent].clone().multiply(m) : m;
  }
  return world;
}

let shared = null;

function buildShared() {
  const bind = bindMatrices();
  const color = new THREE.Color();
  const geos = partList().map(([bone, make, colorName, offset, rot, scale]) => {
    let g = make();
    g = g.index ? g.toNonIndexed() : g;
    g.deleteAttribute('uv');
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(...offset),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scale),
    );
    g.applyMatrix4(bind[bone].clone().multiply(local));
    const n = g.attributes.position.count;
    color.set(COLORS[colorName]); // Color.set() already converts the sRGB hex to linear
    const colors = new Float32Array(n * 3);
    const skinIndex = new Uint16Array(n * 4);
    const skinWeight = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      colors.set([color.r, color.g, color.b], i * 3);
      skinIndex[i * 4] = BONE_INDEX[bone];
      skinWeight[i * 4] = 1;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
    return g;
  });
  const geometry = mergeGeometries(geos);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.2, 0), 0.4); // covers every pose

  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  // A very slight rim light so she stays readable at night (matte clay otherwise)
  const rim = { value: 0.35 };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = rim;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRim;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimF = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 3.0);
        totalEmissiveRadiance += vec3(1.0, 0.94, 0.9) * rimF * uRim;
        totalEmissiveRadiance += diffuseColor.rgb * 0.28; // clay fill`,
      );
  };
  shared = { geometry, material, rim, triangles: geometry.attributes.position.count / 3 };
  console.info(`[traveller] ${Math.round(shared.triangles)} triangles, 1 draw call`);
  return shared;
}

// ---------- poses ----------
// Each pose: (time) => { bones: { name: [x, y, z] degrees }, hipsY: metres added to the hips }.
// Conventions (she faces +z): limbs point down, so x < 0 swings a leg / arm forward; spine x > 0
// leans forward; head x > 0 looks down; arm z > 0 lifts the left arm (+x side) outward.

const sin = Math.sin;
const cos = Math.cos;

function walkCycle(t, { speed = 7, leg = 28, knee = 35, arm = 20, spine = 4, head = 0, lift = 0, lean = 0, shoulders = 6 }) {
  const p = t * speed;
  return {
    hipsY: 0.006 * Math.abs(cos(p)) + lift * Math.max(0, sin(p)),
    bones: {
      spine: [spine + lean, 0, 0],
      head: [head, 0, 0],
      upperLegL: [-leg * sin(p) - lift * 120 * Math.max(0, sin(p)), 0, 0],
      lowerLegL: [knee * Math.max(0, -cos(p)) + lift * 150 * Math.max(0, sin(p)), 0, 0],
      upperLegR: [leg * sin(p) - lift * 120 * Math.max(0, -sin(p)), 0, 0],
      lowerLegR: [knee * Math.max(0, cos(p)) + lift * 150 * Math.max(0, -sin(p)), 0, 0],
      upperArmL: [arm * sin(p), 0, shoulders],
      lowerArmL: [-20, 0, 0],
      upperArmR: [-arm * sin(p), 0, -shoulders],
      lowerArmR: [-20, 0, 0],
    },
  };
}

export const POSES = {
  stand: () => ({
    hipsY: 0,
    bones: { upperArmL: [0, 0, 6], upperArmR: [0, 0, -6], lowerArmL: [-8, 0, 0], lowerArmR: [-8, 0, 0] },
  }),
  sitCalm: () => ({
    hipsY: -0.13,
    bones: {
      spine: [6, 0, 0],
      head: [-8, 0, 0],
      upperLegL: [-88, 0, 3], lowerLegL: [70, 0, 0],
      upperLegR: [-88, 0, -3], lowerLegR: [70, 0, 0],
      upperArmL: [-35, 0, 4], lowerArmL: [-35, 0, 0],
      upperArmR: [-35, 0, -4], lowerArmR: [-35, 0, 0],
    },
  }),
  sitHug: () => ({
    hipsY: -0.13,
    bones: {
      spine: [28, 0, 0], chest: [10, 0, 0],
      head: [34, 0, 0],
      upperLegL: [-125, 0, 2], lowerLegL: [135, 0, 0],
      upperLegR: [-125, 0, -2], lowerLegR: [135, 0, 0],
      upperArmL: [-58, 0, 14], lowerArmL: [-55, 0, -38],
      upperArmR: [-58, 0, -14], lowerArmR: [-55, 0, 38],
    },
  }),
  walk: (t) => walkCycle(t, {}),
  walkSad: (t) => walkCycle(t, { speed: 4.5, leg: 17, knee: 22, arm: 8, spine: 16, head: 30, shoulders: 1 }),
  climb: (t) => walkCycle(t, { speed: 6, leg: 40, knee: 55, arm: 30, spine: 18, head: -5, lean: 4 }),
  reachUp: (t) => ({
    hipsY: 0.012,
    bones: {
      spine: [-8, 0, 0], head: [-30, 0, 0],
      upperArmR: [-165 + 4 * sin(t * 3), 0, -10], lowerArmR: [-10, 0, 0],
      upperArmL: [-20, 0, 15], lowerArmL: [-15, 0, 0],
    },
  }),
  cheer: (t) => ({
    hipsY: 0.025 * Math.max(0, sin(t * 9)),
    bones: {
      head: [-15, 0, 0],
      upperArmL: [-160, 0, 28], lowerArmL: [-15, 0, 0],
      upperArmR: [-160, 0, -28], lowerArmR: [-15, 0, 0],
      upperLegL: [-12 * Math.max(0, sin(t * 9)), 0, 0], lowerLegL: [20 * Math.max(0, sin(t * 9)), 0, 0],
      upperLegR: [-12 * Math.max(0, sin(t * 9)), 0, 0], lowerLegR: [20 * Math.max(0, sin(t * 9)), 0, 0],
    },
  }),
  kneel: () => ({
    hipsY: -0.075,
    bones: {
      spine: [18, 0, 0], head: [25, 0, 0],
      upperLegL: [-90, 0, 4], lowerLegL: [90, 0, 0],
      upperLegR: [5, 0, -2], lowerLegR: [95, 0, 0],
      upperArmL: [-55, 0, 6], lowerArmL: [-30, 0, 0],
      upperArmR: [-55, 0, -6], lowerArmR: [-30, 0, 0],
    },
  }),
  hold: () => ({
    hipsY: 0,
    bones: {
      head: [8, 0, 0],
      upperArmL: [-45, 0, -8], lowerArmL: [-55, 0, 0],
      upperArmR: [-45, 0, 8], lowerArmR: [-55, 0, 0],
    },
  }),
};

// Poses where she is not moving: these get idle life (breathing, head turns)
const IDLE_POSES = new Set(['stand', 'sitCalm', 'sitHug', 'kneel', 'hold', 'reachUp']);
const BLEND_TIME = 0.4;
const D2R = Math.PI / 180;

const euler = new THREE.Euler();
const qTarget = new THREE.Quaternion();

export class Traveller {
  constructor({ seed = 1 } = {}) {
    const { geometry, material } = shared || buildShared();
    this.bones = {};
    const list = BONES.map(([name, , pos]) => {
      const b = new THREE.Bone();
      b.name = name;
      b.position.set(...pos);
      this.bones[name] = b;
      return b;
    });
    BONES.forEach(([name, parent]) => parent && this.bones[parent].add(this.bones[name]));
    this.mesh = new THREE.SkinnedMesh(geometry, material);
    this.mesh.add(this.bones.hips);
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(new THREE.Skeleton(list));
    this.object = new THREE.Group();
    this.object.add(this.mesh);

    this.pose = 'stand';
    this.from = null; // snapshot when blending
    this.blend = 1;
    this.time = seed * 1.7;
    this.headYaw = 0;
    this.headTarget = 0;
    this.nextGlance = 2 + (seed % 3);
    this.apply(POSES.stand(0), 1);
  }

  /** Blend to a pose over 0.4 s (or jump straight to it with { instant: true }). */
  setPose(name, { instant = false } = {}) {
    if (!POSES[name]) return;
    if (instant) {
      this.pose = name;
      this.blend = 1;
      this.from = null;
      return;
    }
    if (name === this.pose) return;
    this.from = {
      quats: Object.fromEntries(Object.entries(this.bones).map(([n, b]) => [n, b.quaternion.clone()])),
      hipsY: this.bones.hips.position.y - HIPS_Y,
    };
    this.pose = name;
    this.blend = 0;
  }

  /** Apply a pose (blended with the snapshot by k = 0…1). */
  apply(p, k) {
    for (const [name, bone] of Object.entries(this.bones)) {
      const r = p.bones[name] || [0, 0, 0];
      qTarget.setFromEuler(euler.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ'));
      if (k < 1 && this.from) bone.quaternion.copy(this.from.quats[name]).slerp(qTarget, k);
      else bone.quaternion.copy(qTarget);
    }
    const hy = k < 1 && this.from ? this.from.hipsY + (p.hipsY - this.from.hipsY) * k : p.hipsY;
    this.bones.hips.position.y = HIPS_Y + hy;
  }

  update(dt) {
    this.time += dt;
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt / BLEND_TIME);
    const k = this.blend * this.blend * (3 - 2 * this.blend);
    this.apply(POSES[this.pose](this.time), k);

    if (IDLE_POSES.has(this.pose)) {
      // Soft breathing
      const b = Math.sin(this.time * 2.3);
      this.bones.chest.rotateX(0.025 * b);
      this.bones.chest.scale.setScalar(1 + 0.012 * b);
      // Every few seconds, a small head turn toward the visitor or the view
      this.nextGlance -= dt;
      if (this.nextGlance <= 0) {
        this.headTarget = (Math.random() * 2 - 1) * 0.45;
        this.nextGlance = 3 + Math.random() * 3;
      }
      this.headYaw += (this.headTarget - this.headYaw) * Math.min(1, dt * 2.5);
      this.bones.head.rotateY(this.headYaw);
    } else {
      this.bones.chest.scale.setScalar(1);
      this.headYaw *= 0.9;
    }
  }

  dispose() {
    this.mesh.skeleton.dispose();
  }
}
