// <a-entity param-controls> — the parameter controls in the control strip on the front of the
// diorama plinth (Phase N): one group per parameter, side by side (RTL: the first on the right):
//   ( − )  a = 2  ( + )        sign parameters (station 7):   ( ± )  +
// Each group sits on an unlit paper plate with dark plum text (readable on the pastel plinth at any
// time of day). Round accent buttons with a hover highlight and a small press animation. The
// keyboard-selected group's plate is tinted with the station accent.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { paramLabel } from '../functions.js';
import { registerClickable } from '../interaction.js';

const R = 0.07;
const GROUP_GAP = 0.72; // centre to centre
const GROUP_W = 0.68;
const GROUP_H = 0.17;
const BUTTON_X = 0.25;
const CREAM = '#FFF4E6';
const PAPER = '#FFF8F3';
const PLUM = '#3B1F2B';

function roundedPlate(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return new THREE.ShapeGeometry(s, 4);
}

/** A round button: accent disc, cream ring, symbol, invisible slightly larger hit area. */
function makeButton(symbol, accent, onClick) {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 32), new THREE.MeshBasicMaterial({ color: accent }));
  const ring = new THREE.Mesh(new THREE.RingGeometry(R * 0.92, R * 1.08, 40), new THREE.MeshBasicMaterial({ color: CREAM, transparent: true, opacity: 0.75 }));
  ring.position.z = 0.002;
  const hit = new THREE.Mesh(
    new THREE.CircleGeometry(R * 1.35, 16),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
  );
  hit.position.z = 0.01;
  group.add(disc, ring, hit);

  const label = document.createElement('a-entity');
  label.setAttribute('math-text', { value: symbol, fontSize: 0.12, color: CREAM });
  label.object3D.position.z = 0.004;

  const state = { hover: false, press: 0 };
  const unregister = registerClickable(hit, {
    onHover(on) {
      state.hover = on;
      ring.material.opacity = on ? 1 : 0.75;
      disc.material.color.set(accent).lerp(new THREE.Color('#FFFFFF'), on ? 0.25 : 0);
    },
    onClick() {
      state.press = 1;
      onClick();
    },
  });
  return {
    group,
    label,
    tick(dt) {
      state.press = Math.max(0, state.press - dt / 0.16);
      const s = (state.hover ? 1.08 : 1) * (1 - 0.15 * Math.sin(state.press * Math.PI));
      group.scale.setScalar(s);
    },
    dispose() {
      unregister();
      for (const m of [disc, ring, hit]) {
        m.geometry.dispose();
        m.material.dispose();
      }
    },
  };
}

AFRAME.registerComponent('param-controls', {
  init() {
    this.stationEl = this.el.closest('[station]');
    this.station = this.stationEl.components.station;
    const { def, theme } = this.station;
    this.rows = [];
    this.buttons = [];

    this.plateGeometry = roundedPlate(GROUP_W, GROUP_H, GROUP_H / 2);
    this.accentTint = new THREE.Color(PAPER).lerp(new THREE.Color(theme.curve), 0.35);
    const count = def.params.length;
    def.params.forEach((param, i) => {
      const row = document.createElement('a-entity');
      // RTL: the first parameter on the right
      row.object3D.position.x = ((count - 1) / 2 - i) * GROUP_GAP;
      this.el.appendChild(row);
      const plate = new THREE.Mesh(this.plateGeometry, new THREE.MeshBasicMaterial({ color: PAPER }));
      plate.position.z = -0.004;
      row.object3D.add(plate);

      const add = (symbol, x, dir) => {
        const b = makeButton(symbol, theme.curve, () => this.station.changeParam(param.name, dir));
        b.group.position.x = x;
        row.object3D.add(b.group);
        b.label.object3D.position.x = x;
        row.appendChild(b.label);
        this.buttons.push(b);
      };
      const value = document.createElement('a-entity');
      row.appendChild(value);
      if (param.kind === 'sign') {
        // ( ± )  then the current sign as the label
        add('±', -BUTTON_X, 0);
        value.object3D.position.x = 0.06;
      } else {
        add('−', -BUTTON_X, -1);
        add('+', BUTTON_X, 1);
      }
      this.rows.push({ param, row, value, plate });
    });
    this.refresh();
    this.onChange = () => this.refresh();
    this.stationEl.addEventListener('paramchange', this.onChange);
  },

  refresh() {
    const { params } = this.station;
    for (const r of this.rows) {
      r.value.setAttribute('math-text', {
        value: paramLabel(r.param, params[r.param.name]),
        fontSize: r.param.kind === 'sign' ? 0.12 : 0.085,
        color: PLUM,
      });
    }
  },

  /** Highlight the keyboard-selected group (index), or none (−1). */
  setSelected(index) {
    this.rows.forEach((r, i) => {
      r.plate.material.color.set(i === index && this.rows.length > 1 ? this.accentTint : PAPER);
    });
  },

  tick(time, delta) {
    const dt = Math.min(delta, 100) / 1000;
    for (const b of this.buttons) b.tick(dt);
  },

  remove() {
    this.stationEl?.removeEventListener('paramchange', this.onChange);
    this.buttons.forEach((b) => b.dispose());
    this.rows.forEach((r) => r.plate.material.dispose());
    this.plateGeometry.dispose();
  },
});

// Keyboard for the nearest station within 8 m: Q / E = − / +, Tab = next parameter.
const KEY_RANGE = 8;
const camPos = new THREE.Vector3();
const stPos = new THREE.Vector3();

AFRAME.registerComponent('param-keys', {
  init() {
    this.selected = new Map(); // station number → selected parameter index
    this.active = null;
    this.onKey = (e) => {
      const st = this.active;
      if (!st || e.repeat && e.code === 'Tab') return;
      const params = st.def.params;
      let index = this.selected.get(st.data.number) ?? 0;
      if (e.code === 'Tab') {
        e.preventDefault();
        index = (index + 1) % params.length;
        this.selected.set(st.data.number, index);
        this.showSelection();
        return;
      }
      const dir = e.code === 'KeyE' ? 1 : e.code === 'KeyQ' ? -1 : 0;
      if (!dir) return;
      const p = params[index];
      st.changeParam(p.name, p.kind === 'sign' ? 0 : dir);
    };
    window.addEventListener('keydown', this.onKey);
    this.tick = AFRAME.utils.throttleTick(this.tick, 200, this);
  },

  tick() {
    const camera = this.el.camera;
    if (!camera) return;
    camera.getWorldPosition(camPos);
    let best = null;
    let bestD = KEY_RANGE;
    for (const el of this.el.querySelectorAll('[station]')) {
      el.object3D.getWorldPosition(stPos);
      const d = Math.hypot(camPos.x - stPos.x, camPos.z - stPos.z);
      if (d < bestD) {
        bestD = d;
        best = el.components.station;
      }
    }
    if (best === this.active) return;
    this.active?.controlsEl.components['param-controls']?.setSelected(-1);
    this.active = best;
    this.showSelection();
  },

  showSelection() {
    const st = this.active;
    if (!st) return;
    st.controlsEl.components['param-controls']?.setSelected(this.selected.get(st.data.number) ?? 0);
  },

  remove() {
    window.removeEventListener('keydown', this.onKey);
  },
});
