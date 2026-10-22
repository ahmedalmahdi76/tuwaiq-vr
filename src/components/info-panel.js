// <a-entity info-panel="number: N"> — placeholder card (B.2). The full panel comes in B.3.
import AFRAME from 'aframe';
import { stationTheme } from './trail-path.js';

AFRAME.registerComponent('info-panel', {
  schema: { number: { type: 'int', default: 1 } },
  init() {
    const theme = stationTheme(this.data.number);
    const card = document.createElement('a-plane');
    card.setAttribute('width', 1.6);
    card.setAttribute('height', 1.4);
    card.setAttribute('position', '0 1.7 0');
    card.setAttribute('material', `shader: flat; color: ${theme.tint}`);
    this.el.appendChild(card);
  },
});
