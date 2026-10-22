// <a-entity arabic-text="..."> — Arabic (RTL, joined letters) 3D text using troika-three-text.
// Set the value from JS with an object: el.setAttribute('arabic-text', { value: text }),
// because A-Frame's attribute-string syntax treats ":" and ";" as separators.
import AFRAME from 'aframe';
import { Text } from 'troika-three-text';
import { FONTS } from '../fonts.js';

AFRAME.registerComponent('arabic-text', {
  schema: {
    value: { type: 'string', default: '' },
    fontSize: { type: 'number', default: 0.2 },
    color: { type: 'color', default: '#3B1F2B' },
    maxWidth: { type: 'number', default: Infinity },
    align: { type: 'string', default: 'right' },
    direction: { type: 'string', default: 'rtl' },
    anchorX: { type: 'string', default: 'center' },
    anchorY: { type: 'string', default: 'middle' },
    weight: { type: 'string', default: 'regular', oneOf: ['regular', 'bold'] },
    lineHeight: { type: 'number', default: 1.5 },
  },

  init() {
    this.text = new Text();
    this.el.setObject3D('text', this.text);
  },

  update() {
    const d = this.data;
    const t = this.text;
    t.text = d.value;
    t.font = FONTS[d.weight];
    t.fontSize = d.fontSize;
    t.color = d.color;
    t.maxWidth = d.maxWidth;
    t.textAlign = d.align;
    t.direction = d.direction;
    t.anchorX = d.anchorX;
    t.anchorY = d.anchorY;
    t.lineHeight = d.lineHeight;
    t.sync(() => this.el.emit('textsync'));
  },

  remove() {
    this.el.removeObject3D('text');
    this.text.dispose();
  },
});
