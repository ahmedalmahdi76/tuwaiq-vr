// <a-entity id="rig" player-move> — desktop walking on the plateau.
//   WASD / arrows walk (3.5 m/s, Shift 6 m/s) in the direction the camera looks; arrows never turn.
//   Feet follow terrainHeight with smoothing (eye height comes from the camera's 1.6 m offset).
//   The player can't get closer than 2 m to the rim; they slide along it instead of stopping dead.
//   Dev: F toggles a free fly camera (no terrain, no boundaries). ?station=N / ?station=end start
//   in front of a station / the lookout.
// Phone joystick (E.2) and VR thumbsticks (F.12) will feed the same move() later.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { edgeZ, terrainHeight, WORLD } from '../terrain.js';
import { STATIONS_ON_TRAIL, LOOKOUT, TRAIL_START, pointAt } from '../trail.js';

const RIM_MARGIN = 2;
const RIM_SEARCH = 10; // look ±10 m along x for the nearest rim point
const RIM_STEP = 0.5;
const FLY_SPEED = 30;
const FLY_RUN = 90;
const FOLLOW = 12; // how quickly the feet catch up with the ground (1/s)

const KEYS = {
  KeyW: 'f', ArrowUp: 'f',
  KeyS: 'b', ArrowDown: 'b',
  KeyA: 'l', ArrowLeft: 'l',
  KeyD: 'r', ArrowRight: 'r',
};

/** Push (x, z) back onto the plateau, at least RIM_MARGIN from the rim. Returns [x, z]. */
export function clampToCliff(x, z) {
  for (let pass = 0; pass < 2; pass++) {
    let best = Infinity;
    let bx = 0;
    let bz = 0;
    for (let rx = x - RIM_SEARCH; rx <= x + RIM_SEARCH; rx += RIM_STEP) {
      const rz = edgeZ(rx);
      const d = (x - rx) ** 2 + (z - rz) ** 2;
      if (d < best) {
        best = d;
        bx = rx;
        bz = rz;
      }
    }
    const dist = Math.sqrt(best);
    const outside = z < edgeZ(x); // over the drop
    if (!outside && dist >= RIM_MARGIN) break;
    // Direction from the nearest rim point toward the plateau
    let nx = (x - bx) / (dist || 1);
    let nz = (z - bz) / (dist || 1);
    if (outside) {
      nx = -nx;
      nz = -nz;
    }
    if (dist < 1e-3) {
      nx = 0;
      nz = 1;
    }
    x = bx + nx * RIM_MARGIN;
    z = bz + nz * RIM_MARGIN;
  }
  return [x, z];
}

function clampToWorld(x, z) {
  x = THREE.MathUtils.clamp(x, WORLD.xMin + 100, WORLD.xMax - 100);
  z = Math.min(z, edgeZ(x) + 1500);
  return [x, z];
}

/** Where to stand for ?station=N (4 m in front of the station, facing it) or ?station=end. */
export function standingSpot(which) {
  if (which === 'end') {
    const p = pointAt(LOOKOUT.s - 4);
    return { x: p.x, z: p.z, yaw: Math.atan2(-p.tx, -p.tz) };
  }
  const st = STATIONS_ON_TRAIL[Number(which) - 1];
  if (!st) return null;
  return {
    x: st.x + Math.sin(st.faceYaw) * 4,
    z: st.z + Math.cos(st.faceYaw) * 4,
    yaw: st.faceYaw, // camera looks along −z of its yaw: toward the station and the cliff
  };
}

const forward = new THREE.Vector3();
const right = new THREE.Vector3();

AFRAME.registerComponent('player-move', {
  schema: {
    speed: { type: 'number', default: 3.5 },
    run: { type: 'number', default: 6 },
  },

  init() {
    this.pressed = new Set();
    this.shift = false;
    this.mode = 'walk';
    this.onKeyDown = (e) => {
      if (e.code === 'KeyF') {
        this.setMode(this.mode === 'walk' ? 'fly' : 'walk');
        return;
      }
      if (KEYS[e.code]) {
        this.pressed.add(KEYS[e.code]);
        if (e.code.startsWith('Arrow')) e.preventDefault(); // no page scrolling
      }
      this.shift = e.shiftKey;
    };
    this.onKeyUp = (e) => {
      if (KEYS[e.code]) this.pressed.delete(KEYS[e.code]);
      this.shift = e.shiftKey;
    };
    this.onBlur = () => this.pressed.clear();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    const start = () => this.placeAtStart();
    if (this.el.sceneEl.hasLoaded) start();
    else this.el.sceneEl.addEventListener('loaded', start, { once: true });
  },

  remove() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  },

  cameraEl() {
    return this.el.querySelector('[camera]');
  },

  placeAtStart() {
    const param = new URLSearchParams(location.search).get('station');
    const spot = (param && standingSpot(param)) || { x: TRAIL_START.x, z: TRAIL_START.z, yaw: 0 };
    this.teleport(spot.x, spot.z, spot.yaw);
  },

  /** Put the player at (x, z) on the ground, looking toward yaw (0 = −z). */
  teleport(x, z, yaw = null) {
    [x, z] = clampToCliff(...clampToWorld(x, z));
    this.el.object3D.position.set(x, terrainHeight(x, z), z);
    if (yaw !== null) this.look(yaw, 0);
    this.setMode('walk');
  },

  look(yaw, pitch) {
    const lc = this.cameraEl()?.components['look-controls'];
    if (!lc) return;
    lc.yawObject.rotation.y = yaw;
    lc.pitchObject.rotation.x = pitch;
  },

  setMode(mode) {
    this.mode = mode;
    if (mode === 'walk') {
      const p = this.el.object3D.position;
      [p.x, p.z] = clampToCliff(...clampToWorld(p.x, p.z));
      p.y = terrainHeight(p.x, p.z);
    }
    this.el.emit('movemode', { mode });
  },

  tick(time, delta) {
    const dt = Math.min(delta, 100) / 1000;
    const cam = this.cameraEl()?.object3D;
    if (!cam) return;
    const p = this.el.object3D.position;

    let ax = 0;
    let az = 0;
    if (this.pressed.has('f')) az -= 1;
    if (this.pressed.has('b')) az += 1;
    if (this.pressed.has('l')) ax -= 1;
    if (this.pressed.has('r')) ax += 1;

    if (this.mode === 'fly') {
      if (!ax && !az) return;
      cam.getWorldDirection(forward).negate(); // camera looks along −z
      right.crossVectors(forward, cam.up).normalize();
      const speed = this.shift ? FLY_RUN : FLY_SPEED;
      const len = Math.hypot(ax, az);
      p.addScaledVector(forward, (-az / len) * speed * dt).addScaledVector(right, (ax / len) * speed * dt);
      return;
    }

    if (ax || az) {
      const len = Math.hypot(ax, az);
      const yaw = cam.rotation.y;
      const speed = (this.shift ? this.data.run : this.data.speed) * dt;
      // Forward on the ground = (−sin yaw, −cos yaw); right = (cos yaw, −sin yaw)
      const fx = -Math.sin(yaw) * (-az / len) + Math.cos(yaw) * (ax / len);
      const fz = -Math.cos(yaw) * (-az / len) - Math.sin(yaw) * (ax / len);
      let [x, z] = clampToWorld(p.x + fx * speed, p.z + fz * speed);
      [x, z] = clampToCliff(x, z);
      p.x = x;
      p.z = z;
    }
    // Feet follow the ground smoothly (no jitter on small bumps, natural on slopes)
    const ground = terrainHeight(p.x, p.z);
    p.y += (ground - p.y) * (1 - Math.exp(-FOLLOW * dt));
  },
});
