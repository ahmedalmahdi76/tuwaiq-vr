// <a-entity station-list> builds the 10 stations from content.js + functions.js + trail.js.
// <a-entity station="number: N"> is one station: the diorama plinth (Phase N) with the parameter
// controls on its front face, the light curve above it, and the info panel to the right.
// Layout constants live in station-layout.js.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { STATIONS_ON_TRAIL } from '../trail.js';
import { functionFor, defaultParams, yWindowOf, stepParam, clampParam } from '../functions.js';
import { LightCurve } from '../light-curve.js';
import { dayFactor } from '../label-style.js';
import { markVisited } from '../visited.js';
import { playChime, userHasInteracted } from '../sound.js';
import { stationTheme } from './trail-path.js';
import { VIEW_SPOT, CURVE, PLINTH, FACE, PANEL_SLOT, curveToLocal, originYOf } from '../station-layout.js';
import { Traveller } from '../traveller.js';
import { RESTING } from '../nature-scenes.js';
import { loadProps } from '../props.js';
import { createScene, RIBBON_TINT } from '../scenes/scenes.js';

export { VIEW_SPOT, CURVE, PLINTH, FACE, PANEL_SLOT, curveToLocal };

const LABELS_WITHIN = 40;
const ANIMATE_WITHIN = 30; // only nearby stations animate the traveller and the scene
const SCENE_CREATE_AT = 45; // the diorama scene loads with the panel…
const SCENE_FREE_AT = 55; // …and is freed with it
const RIBBON_TOP = 0.024; // she sits / stands on the top edge of the light ribbon
const TRAVELLER_FRONT = 0.03; // a little in front of the ribbon plane
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
      position: `${CURVE.x} ${originYOf(this.def) + yWindowOf(this.def)[1] * CURVE.scale + 0.32} ${CURVE.z}`,
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

    // The traveller (Phase N): resting pose at the station's resting spot
    this.resting = RESTING[n];
    this.traveller = new Traveller({ seed: n });
    this.traveller.setPose(this.resting.pose, { instant: true });
    this.traveller.object.rotation.y = THREE.MathUtils.degToRad(this.resting.yaw || 0);
    this.el.object3D.add(this.traveller.object);
    this.placeTraveller(this.params);
    this.traveller.update(0);

    // The diorama scene (Phase N, §5): built when the player is near (see tick), anchored to the curve
    this.scene = null;
    this.sceneCtx = {
      def: this.def,
      X: (x) => curveToLocal(this.def, x, 0, new THREE.Vector3()).x,
      Y: (y) => originYOf(this.def) + y * CURVE.scale,
      base: CURVE.bottom,
      z: CURVE.z,
      window: yWindowOf(this.def),
      f: (x, p) => this.def.f(x, p),
    };
    this.propsReady = false;
    loadProps().then(() => {
      this.propsReady = true;
    });
    this.curve.setTint(RIBBON_TINT[n] || 0);

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
      this.scene?.update(this.shown);
      this.placeTraveller(this.shown);
      if (m.t >= 1) this.morph = null;
    }
    if (this.distance !== undefined && this.distance < ANIMATE_WITHIN) {
      const dt = Math.min(delta, 100) / 1000;
      this.traveller.update(dt);
      this.scene?.tick(dt);
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
    if (!this.scene && this.propsReady && this.distance < SCENE_CREATE_AT) this.buildScene();
    else if (this.scene && this.distance > SCENE_FREE_AT) this.freeScene();
    // The visited moment: once per station per page load. Not before the first key / click / tap:
    // a ?station= link starts inside the radius, and the chime could not play yet. If the visitor is
    // still here when they first interact, the full moment plays then.
    if (this.distance < VISIT_RADIUS && userHasInteracted() && markVisited(this.data.number)) {
      playChime(this.data.number - 1);
      this.glowT = 0;
      this.waveAtPlayer(camPos);
    }
  },

  /** The traveller turns her head toward the player and gives a small wave. */
  waveAtPlayer(playerWorld) {
    const local = this.traveller.object.worldToLocal(playerWorld.clone());
    this.traveller.wave(Math.atan2(local.x, local.z));
  },

  buildScene() {
    this.scene = createScene(this.data.number, this.sceneCtx);
    if (!this.scene) return;
    this.scene.update(this.shown);
    this.el.object3D.add(this.scene.group);
    this.placeTraveller(this.shown);
  },

  freeScene() {
    this.el.object3D.remove(this.scene.group);
    this.scene.dispose();
    this.scene = null;
  },

  /**
   * Put the traveller at her resting spot. With a scene, the scene decides (it knows where its rocks
   * and seats are); otherwise RESTING: on the ribbon at (x, f(x)), or on the plinth top.
   */
  placeTraveller(params) {
    const r = this.scene?.resting(params) || this.restingFallback(params);
    const o = this.traveller.object.position;
    if (r.pose !== this.traveller.pose) this.traveller.setPose(r.pose);
    this.traveller.object.rotation.y = THREE.MathUtils.degToRad(r.yaw || 0);
    if (r.localY !== undefined) {
      curveToLocal(this.def, r.x, 0, o);
      o.y = r.localY;
      o.z = CURVE.z + (r.z ?? 0.12);
      return;
    }
    curveToLocal(this.def, r.x, r.y, o);
    o.y += RIBBON_TOP;
    o.z += TRAVELLER_FRONT;
  },

  restingFallback(params) {
    const r = this.resting;
    if (r.on === 'plinth') return { ...r, localY: CURVE.bottom + (r.seat?.height || 0) };
    const [y0, y1] = yWindowOf(this.def);
    return { ...r, y: THREE.MathUtils.clamp(this.def.f(r.x, params), y0, y1) };
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
    this.traveller.dispose();
    if (this.scene) this.freeScene();
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
