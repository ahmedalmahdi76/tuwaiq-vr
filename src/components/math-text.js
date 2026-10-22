// <a-entity math-text="value: f(x) = |x|"> — Latin math formulas (Fira Sans) as crisp SDF text via
// troika-three-text. Only for Latin/math text: Arabic goes through arabic-text (canvas), because
// troika misplaces some Arabic marks.
import AFRAME from 'aframe';
import { Text } from 'troika-three-text';
import { FONTS } from '../fonts.js';

AFRAME.registerComponent('math-text', {
  schema: {
    value: { type: 'string', default: '' },
    fontSize: { type: 'number', default: 0.15 },
    color: { type: 'color', default: '#3B1F2B' },
    maxWidth: { type: 'number', default: Infinity },
    align: { type: 'string', default: 'center' },
    anchorX: { type: 'string', default: 'center' },
    anchorY: { type: 'string', default: 'middle' },
  },

  init() {
    this.text = new Text();
    this.text.font = FONTS.math;
    this.text.direction = 'ltr';
    this.el.setObject3D('text', this.text);
  },

  update() {
    const d = this.data;
    const t = this.text;
    t.text = d.value;
    t.fontSize = d.fontSize;
    t.color = d.color;
    t.maxWidth = d.maxWidth;
    t.textAlign = d.align;
    t.anchorX = d.anchorX;
    t.anchorY = d.anchorY;
    t.sync(() => this.el.emit('textsync'));
  },

  remove() {
    this.el.removeObject3D('text');
    this.text.dispose();
  },
});
