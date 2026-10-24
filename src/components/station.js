// <a-entity station-list> builds the 10 stations from content.js + functions.js + trail.js.
// <a-entity station="number: N"> is one station: the diorama plinth (Phase N) with the parameter
// controls on its front face, the light curve above it, and the info panel to the right.
// Layout constants live in station-layout.js.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { STATIONS_ON_TRAIL } from '../trail.js';
import { functionFor, defaultParams, Y_WINDOW, stepParam, clampParam } from '../functions.js';
import { LightCurve } from '../light-curve.js';
import { dayFactor } from '../label-style.js';
import { markVisited } from '../visited.js';
import { playChime, userHasInteracted } from '../sound.js';
import { stationTheme } from './trail-path.js';
import { VIEW_SPOT, CURVE, PLINTH, FACE, PANEL_SLOT, curveToLocal } from '../station-layout.js';

export { VIEW_SPOT, CURVE, PLINTH, FACE, PANEL_SLOT, curveToLocal };

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
    this.curve.setDay(dayFactor());
    this.lastDay = dayFactor();
    this.onTime = () => {
      const day = dayFactor();
      if (Math.abs(day - this.lastDay) < 0.02) return;
      this.lastDay = day;
      this.curve.setDay(day);
    };
    this.el.sceneEl.addEventListener('timeofday', this.onTime);
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

    // Diorama plinth (Phase N): its top is the bottom of the curve window; the parameter controls
    // sit in the strip at the top of its front face
    this.plinthEl = el('a-entity', {
      position: `${CURVE.x} ${CURVE.bottom} ${CURVE.z}`,
      'diorama-plinth': `number: ${n}`,
    }, this.el);
    this.controlsEl = el('a-entity', {
      position: `${FACE.controls.x} ${FACE.strip.y} ${FACE.z + 0.01}`,
    }, this.plinthEl);
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
    // The visited moment: once per station per page load. Not before the first key / click / tap:
    // a ?station= link starts inside the radius, and the chime could not play yet. If the visitor is
    // still here when they first interact, the full moment plays then.
    if (this.distance < VISIT_RADIUS && userHasInteracted() && markVisited(this.data.number)) {
      playChime(this.data.number - 1);
      this.glowT = 0;
    }
  },

  updateFormula() {
    this.formula.setAttribute('math-text', {
      value: this.def.label(this.params),
      fontSize: 0.15,
      color: '#FFF4E6',
      adaptiveOutline: this.theme.curve,
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
    this.el.sceneEl.removeEventListener('timeofday', this.onTime);
    this.el.removeObject3D('curve');
    this.curve.dispose();
  },
});

AFRAME.registerComponent('station-list', {
  init() {
    for (const stop of STATIONS_ON_TRAIL) el('a-entity', { station: `number: ${stop.number}` }, this.el);
  },
});
