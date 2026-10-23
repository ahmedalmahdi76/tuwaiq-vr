// <a-entity math-text="value: f(x) = |x|"> — Latin math formulas (Fira Sans) as crisp SDF text via
// troika-three-text. Only for Latin/math text: Arabic goes through arabic-text (canvas), because
// troika misplaces some Arabic marks.
//
// Subscripts: no font we have contains 'ₐ', so subscripts are drawn as smaller, lowered text.
// Write them as `log_{2} x` or with the Unicode character (`logₐ x`); each piece becomes its own
// troika Text, laid out side by side. Emits 'textsync' with { width, height } (metres).
import AFRAME from 'aframe';
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { FONTS } from '../fonts.js';

const SUBSCRIPT_CHARS = { 'ₐ': 'a', 'ₓ': 'x', '₀': '0', '₁': '1', '₂': '2', '₃': '3' };
const SUB_SCALE = 0.62;
const SUB_DROP = 0.22; // em below the baseline

/** 'log_{2} x' / 'logₐ x' → [{ text: 'log' }, { text: '2', sub: true }, { text: ' x' }] */
export function parseRuns(value) {
  const runs = [];
  const push = (text, sub = false) => {
    if (!text) return;
    const last = runs[runs.length - 1];
    if (last && last.sub === sub) last.text += text;
    else runs.push({ text, sub });
  };
  let i = 0;
  while (i < value.length) {
    if (value.startsWith('_{', i)) {
      const end = value.indexOf('}', i);
      push(value.slice(i + 2, end === -1 ? value.length : end), true);
      i = end === -1 ? value.length : end + 1;
    } else if (SUBSCRIPT_CHARS[value[i]]) {
      push(SUBSCRIPT_CHARS[value[i]], true);
      i++;
    } else {
      push(value[i]);
      i++;
    }
  }
  return runs;
}

AFRAME.registerComponent('math-text', {
  schema: {
    value: { type: 'string', default: '' },
    fontSize: { type: 'number', default: 0.15 },
    color: { type: 'color', default: '#3B1F2B' },
    maxWidth: { type: 'number', default: Infinity },
    align: { type: 'string', default: 'center' },
    anchorX: { type: 'string', default: 'center' },
    anchorY: { type: 'string', default: 'middle' },
    // Soft glow / outline (troika): e.g. outlineColor: '#E0457B'; outlineBlur: 0.3 (em); outlineOpacity: 0.6
    outlineColor: { type: 'string', default: '' },
    outlineWidth: { type: 'number', default: 0 },
    outlineBlur: { type: 'number', default: 0 },
    outlineOpacity: { type: 'number', default: 1 },
  },

  init() {
    this.group = new THREE.Group();
    this.el.setObject3D('text', this.group);
    this.texts = [];
    this.version = 0;
  },

  update() {
    const d = this.data;
    const runs = parseRuns(d.value);
    // Reuse Text objects; add or remove to match the number of runs
    while (this.texts.length < runs.length) {
      const t = new Text();
      t.font = FONTS.math;
      t.direction = 'ltr';
      t.anchorX = 'left';
      t.anchorY = 'bottom-baseline';
      this.group.add(t);
      this.texts.push(t);
    }
    while (this.texts.length > runs.length) {
      const t = this.texts.pop();
      this.group.remove(t);
      t.dispose();
    }
    const token = ++this.version;
    let pending = runs.length;
    if (!pending) return;
    runs.forEach((run, i) => {
      const t = this.texts[i];
      t.text = run.text;
      t.fontSize = d.fontSize * (run.sub ? SUB_SCALE : 1);
      t.color = d.color;
      t.maxWidth = runs.length === 1 ? d.maxWidth : Infinity;
      t.textAlign = d.align;
      if (d.outlineColor) {
        t.outlineColor = d.outlineColor;
        t.outlineWidth = `${d.outlineWidth * 100}%`;
        t.outlineBlur = `${d.outlineBlur * 100}%`;
        t.outlineOpacity = d.outlineOpacity;
      } else {
        t.outlineWidth = 0;
        t.outlineBlur = 0;
      }
      t.position.y = run.sub ? -SUB_DROP * d.fontSize : 0;
      t.sync(() => {
        if (--pending === 0 && token === this.version) this.layout(runs);
      });
    });
  },

  layout(runs) {
    const d = this.data;
    let x = 0;
    let top = 0;
    let bottom = 0;
    runs.forEach((run, i) => {
      const t = this.texts[i];
      const b = t.textRenderInfo.blockBounds; // [minX, minY, maxX, maxY] relative to the baseline
      t.position.x = x;
      x += b[2];
      top = Math.max(top, b[3] + t.position.y);
      bottom = Math.min(bottom, b[1] + t.position.y);
    });
    const width = x;
    const g = this.group.position;
    g.x = d.anchorX === 'left' ? 0 : d.anchorX === 'right' ? -width : -width / 2;
    g.y = d.anchorY === 'top' ? -top : d.anchorY === 'bottom' ? -bottom : -(top + bottom) / 2;
    this.el.emit('textsync', { width, height: top - bottom });
  },

  remove() {
    this.version++;
    this.el.removeObject3D('text');
    this.texts.forEach((t) => t.dispose());
  },
});
