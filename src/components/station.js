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
import { functionFor, defaultParams, samplePieces, windowCentre, Y_WINDOW, paramLabel } from '../functions.js';
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
    const controlsYaw = Math.atan2(VIEW_SPOT.x - CONTROLS_SLOT.x, VIEW_SPOT.z - CONTROLS_SLOT.z);
    this.controls = el('a-entity', {
      position: `${CONTROLS_SLOT.x} ${CONTROLS_SLOT.y} ${CONTROLS_SLOT.z}`,
      rotation: `0 ${THREE.MathUtils.radToDeg(controlsYaw)} 0`,
    }, this.el);
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
