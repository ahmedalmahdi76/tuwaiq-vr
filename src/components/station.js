// <a-entity station-list> builds the 10 stations from content.js + functions.js + trail.js.
// <a-entity station="number: N"> is one station. Local frame: +z points at the trail (where the
// visitor stands), −z toward the cliff; +x is the visitor's right. Seen from the trail:
//   - the curve floats in front, a little behind the station point (z −1.2), so the cliff view frames it
//   - the info panel stands to the RIGHT of the curve (Arabic reading starts on the right), angled
//     toward the trail
//   - the parameter controls sit below the curve at hand height (1.1 m)
// The curve is a thin placeholder line until B.4; the controls show their values until B.5.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { STATIONS_ON_TRAIL } from '../trail.js';
import { functionFor, defaultParams, samplePieces, windowCentre, Y_WINDOW, paramLabel } from '../functions.js';
import { stationTheme } from './trail-path.js';

// Curve layout (metres, station-local). Uniform scale keeps the shapes true (slope 1 = 45°).
export const CURVE = {
  scale: 0.55, // metres per function unit: 6 units wide → 3.3 m
  bottom: 1.0, // y = −3 sits 1 m above the ground
  z: -1.2,
};
CURVE.originY = CURVE.bottom - Y_WINDOW[0] * CURVE.scale; // height of y = 0
CURVE.halfWidth = 3 * CURVE.scale;

export const PANEL_SLOT = { x: CURVE.halfWidth + 0.3 + 0.8, z: 1.3 }; // panel centre (1.6 m wide), ~3.8 m from VIEW_SPOT
export const VIEW_SPOT = { x: 0, z: 4 }; // where the visitor stands (matches ?station=)
export const CONTROLS_SLOT = { y: 1.1, z: 0.4 };

/** Function coordinates → station-local position. */
export function curveToLocal(def, x, y, target = new THREE.Vector3()) {
  return target.set((x - windowCentre(def)) * CURVE.scale, CURVE.originY + y * CURVE.scale, CURVE.z);
}

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

    // Curve (placeholder line + faint axes)
    this.curveGroup = new THREE.Group();
    this.el.setObject3D('curve', this.curveGroup);
    this.lineMaterial = new THREE.LineBasicMaterial({ color: this.theme.curve });
    this.axisMaterial = new THREE.LineBasicMaterial({ color: '#FFF4E6', transparent: true, opacity: 0.45 });
    this.buildCurve();

    // Info panel (B.3), angled toward the viewing spot
    const panelYaw = Math.atan2(VIEW_SPOT.x - PANEL_SLOT.x, VIEW_SPOT.z - PANEL_SLOT.z);
    this.panel = el('a-entity', {
      position: `${PANEL_SLOT.x} 0 ${PANEL_SLOT.z}`,
      rotation: `0 ${THREE.MathUtils.radToDeg(panelYaw)} 0`,
      'info-panel': `number: ${n}`,
    }, this.el);

    // Parameter controls slot (B.5). For now: the current values.
    this.controls = el('a-entity', { position: `0 ${CONTROLS_SLOT.y} ${CONTROLS_SLOT.z}` }, this.el);
    this.valueLabel = el('a-entity', {}, this.controls);
    this.updateValueLabel();
  },

  updateValueLabel() {
    const text = this.def.params.map((p) => paramLabel(p, this.params[p.name])).join('     ');
    this.valueLabel.setAttribute('math-text', { value: text, fontSize: 0.09, color: '#FFF4E6' });
  },

  buildCurve() {
    const g = this.curveGroup;
    g.children.forEach((c) => c.geometry.dispose());
    g.clear();
    const v = new THREE.Vector3();
    for (const piece of samplePieces(this.def, this.params)) {
      const pts = piece.map((p) => curveToLocal(this.def, p.x, p.y, v).clone());
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.lineMaterial));
    }
    // Axes: x axis across the window at y = 0, y axis at x = 0 over the y window
    const [x0, x1] = this.def.window;
    const axes = [
      [curveToLocal(this.def, x0, 0), curveToLocal(this.def, x1, 0)],
      [curveToLocal(this.def, 0, Y_WINDOW[0]), curveToLocal(this.def, 0, Y_WINDOW[1])],
    ];
    for (const pts of axes) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.axisMaterial));
  },

  /** Change one parameter (used by the controls in B.5). */
  setParam(name, value) {
    this.params = { ...this.params, [name]: value };
    this.buildCurve();
    this.updateValueLabel();
    this.el.emit('paramchange', { name, value, params: this.params });
  },

  remove() {
    this.curveGroup.children.forEach((c) => c.geometry.dispose());
    this.el.removeObject3D('curve');
    this.lineMaterial.dispose();
    this.axisMaterial.dispose();
  },
});

AFRAME.registerComponent('station-list', {
  init() {
    for (const stop of STATIONS_ON_TRAIL) el('a-entity', { station: `number: ${stop.number}` }, this.el);
  },
});
