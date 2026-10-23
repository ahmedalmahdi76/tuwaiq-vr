// <a-entity station-list> builds the 10 stations from content.js + functions.js + trail.js.
// <a-entity station="number: N"> is one station. Local frame: +z points at the trail, −z toward the
// cliff; +x is the visitor's right. The visitor's standing spot (?station=N) is VIEW_SPOT, 4 m in front.
// Composed so that from there, in a normal laptop view and without turning:
//   - the curve floats slightly left of centre, 4.5 m away, with the cliff view behind it
//   - the info panel stands slightly right, 3 m away, turned toward the visitor
//   - the parameter controls sit under the curve at hand height, in front of it
import AFRAME from 'aframe';
import * as THREE from 'three';
import { STATIONS_ON_TRAIL } from '../trail.js';
import { functionFor, defaultParams, windowCentre, Y_WINDOW, stepParam, clampParam } from '../functions.js';
import { LightCurve } from '../light-curve.js';
import { markVisited } from '../visited.js';
import { playChime } from '../sound.js';
import { stationTheme } from './trail-path.js';

// Curve layout (metres, station-local). Uniform scale keeps the shapes true (slope 1 = 45°).
export const VIEW_SPOT = { x: 0, z: 4 }; // where the visitor stands (matches ?station=)

export const CURVE = {
  scale: 0.45, // metres per function unit: 6 units wide → 2.7 m
  bottom: 1.3, // y = −3 sits 1.3 m above the ground (top, y = 4, at ≈ 4.45 m)
  x: -1.4, // centre of the curve, left of the view's centre
  z: -0.5, // 4.5 m from VIEW_SPOT
};
CURVE.originY = CURVE.bottom - Y_WINDOW[0] * CURVE.scale; // height of y = 0
CURVE.halfWidth = 3 * CURVE.scale;

// Panel centre: 3 m from VIEW_SPOT, ~22° to the right
const PANEL_ANGLE = THREE.MathUtils.degToRad(22);
export const PANEL_SLOT = {
  x: VIEW_SPOT.x + Math.sin(PANEL_ANGLE) * 3,
  z: VIEW_SPOT.z - Math.cos(PANEL_ANGLE) * 3,
};
// Controls: under the curve, in front of it, turned toward VIEW_SPOT
export const CONTROLS_SLOT = { x: CURVE.x, y: 1.15, z: 0.8 };

/** Function coordinates → station-local position. */
export function curveToLocal(def, x, y, target = new THREE.Vector3()) {
  return target.set(CURVE.x + (x - windowCentre(def)) * CURVE.scale, CURVE.originY + y * CURVE.scale, CURVE.z);
}

const LABELS_WITHIN = 40;
const MORPH_TIME = 0.3; // seconds
const VISIT_RADIUS = 6; // metres from the station point
const GLOW_TIME = 1.5; // seconds of extra glow on the first visit

/** 0 → 1 quickly, hold, then ease back to 0 over GLOW_TIME. */
function glowEnvelope(t) {
  if (t < 0.2) return t / 0.2;
  if (t < 0.5) return 1;
  const k = Math.min(1, (t - 0.5) / (GLOW_TIME - 0.5));
  return 1 - k * k * (3 - 2 * k);
}
const camPos = new THREE.Vector3();
const selfPos = new THREE.Vector3();

function el(tag, attrs, parent) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.appendChild(e);
  return e;
}

AFRAME.registerComponent('station', {
  schema: { number: { type: 'int', default: 1 } },

  init() {
    const n = this.data.number;
    this.stop = STATIONS_ON_TRAIL[n - 1];
    this.def = functionFor(n);
    this.theme = stationTheme(n);
    this.params = defaultParams(this.def);

    const o = this.el.object3D;
    o.position.set(this.stop.x, this.stop.y, this.stop.z);
    o.rotation.y = this.stop.faceYaw;
    this.el.dataset.station = n;

    // The curve as light (B.4) and its live formula label floating above it
    this.curve = new LightCurve(this.def, this.theme, (x, y, t) => curveToLocal(this.def, x, y, t));
    this.curve.update(this.params);
    this.el.setObject3D('curve', this.curve.group);
    this.formula = el('a-entity', {
      position: `${CURVE.x} ${CURVE.originY + Y_WINDOW[1] * CURVE.scale + 0.32} ${CURVE.z}`,
    }, this.el);
    this.updateFormula();

    // Info panel (B.3), angled toward the viewing spot
    const panelYaw = Math.atan2(VIEW_SPOT.x - PANEL_SLOT.x, VIEW_SPOT.z - PANEL_SLOT.z);
    this.panel = el('a-entity', {
      position: `${PANEL_SLOT.x} 0 ${PANEL_SLOT.z}`,
      rotation: `0 ${THREE.MathUtils.radToDeg(panelYaw)} 0`,
      'info-panel': `number: ${n}`,
    }, this.el);

    // Parameter controls (B.5): one row per parameter under the curve, turned toward the visitor
    const controlsYaw = Math.atan2(VIEW_SPOT.x - CONTROLS_SLOT.x, VIEW_SPOT.z - CONTROLS_SLOT.z);
    this.controlsEl = el('a-entity', {
      position: `${CONTROLS_SLOT.x} ${CONTROLS_SLOT.y} ${CONTROLS_SLOT.z}`,
      rotation: `0 ${THREE.MathUtils.radToDeg(controlsYaw)} 0`,
    }, this.el);
    this.controlsEl.setAttribute('param-controls', '');

    this.shown = { ...this.params }; // what the curve currently shows (eases toward this.params)
    this.morph = null;
    this.nextCheck = 0;
    this.glowT = null; // seconds into the visited glow, null when idle
  },

  tick(time, delta) {
    if (this.glowT !== null) {
      this.glowT += Math.min(delta, 100) / 1000;
      const g = this.glowT >= GLOW_TIME ? 0 : glowEnvelope(this.glowT);
      this.curve.setBoost(g);
      this.panel.components['info-panel']?.setGlow(g);
      if (this.glowT >= GLOW_TIME) this.glowT = null;
    }
    // Morph: ease the shown parameters to the new values over MORPH_TIME, rebuilding the ribbon
    if (this.morph) {
      const m = this.morph;
      m.t = Math.min(1, m.t + delta / 1000 / MORPH_TIME);
      const k = m.t * m.t * (3 - 2 * m.t);
      for (const name of Object.keys(m.to)) this.shown[name] = m.from[name] + (m.to[name] - m.from[name]) * k;
      this.curve.update(this.shown);
      if (m.t >= 1) this.morph = null;
    }
    if (time < this.nextCheck) return;
    this.nextCheck = time + 150;
    // Hide the small axis numbers when far away (fewer draw calls; unreadable anyway)
    const camera = this.el.sceneEl.camera;
    if (!camera) return;
    camera.getWorldPosition(camPos);
    this.el.object3D.getWorldPosition(selfPos);
    this.distance = Math.hypot(camPos.x - selfPos.x, camPos.z - selfPos.z);
    this.curve.setLabelsVisible(this.distance < LABELS_WITHIN);
    // The visited moment: once per station per page load
    if (this.distance < VISIT_RADIUS && markVisited(this.data.number)) {
      playChime(this.data.number - 1);
      this.glowT = 0;
    }
  },

  updateFormula() {
    this.formula.setAttribute('math-text', {
      value: this.def.label(this.params),
      fontSize: 0.15,
      color: '#FFF4E6',
      outlineColor: this.theme.curve,
      outlineWidth: 0.06,
      outlineBlur: 0.35,
      outlineOpacity: 0.7,
    });
  },

  /** Step a parameter up (dir 1) or down (−1); dir 0 toggles a sign parameter. */
  changeParam(name, dir) {
    const param = this.def.params.find((p) => p.name === name);
    const value = param.kind === 'sign' ? -this.params[name] : stepParam(param, this.params[name], dir);
    if (value !== this.params[name]) this.setParam(name, value);
  },

  /** Set one parameter (clamped to its allowed values); the curve morphs to the new shape. */
  setParam(name, value) {
    const param = this.def.params.find((p) => p.name === name);
    this.params = { ...this.params, [name]: clampParam(param, value) };
    this.morph = { from: { ...this.shown }, to: { ...this.params }, t: 0 };
    this.updateFormula();
    this.el.emit('paramchange', { name, value: this.params[name], params: this.params });
  },

  remove() {
    this.el.removeObject3D('curve');
    this.curve.dispose();
  },
});

AFRAME.registerComponent('station-list', {
  init() {
    for (const stop of STATIONS_ON_TRAIL) el('a-entity', { station: `number: ${stop.number}` }, this.el);
  },
});
