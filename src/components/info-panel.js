// <a-entity info-panel="number: N"> — the station's information card (clean version, B.3).
// Unlit paper card in the station tint with a thin frame and soft rounded corners, 1.6 m wide,
// height fitted to the text, centred at 1.7 m. From top to bottom (right-aligned, RTL):
//   number badge + function name · formula (LTR, centred) · subtitle · math · life · divider · quote
// Turns to face the player (yaw only, ±40° from its base direction).
//
// No pop-in, no stutter: the text is created at CREATE_AT (one block per frame, so the canvas work is
// spread out), the card fades in between FADE_FROM and FADE_TO, and everything is freed past FREE_AT.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { STATIONS, toArabicDigits } from '../content.js';
import { stationTheme } from './trail-path.js';

const CREATE_AT = 35;
const FADE_FROM = 25;
const FADE_TO = 20;
const FREE_AT = 45;

const WIDTH = 1.6;
const PAD = 0.1;
const INNER = WIDTH - 2 * PAD;
const CENTRE_Y = 1.7;
const RADIUS = 0.07;
const FRAME = 0.012;
const BADGE_R = 0.065;
const TEXT_COLOR = '#3B1F2B';

const SIZE = { title: 0.12, formula: 0.075, subtitle: 0.075, body: 0.055, quote: 0.062 };
const GAP = { afterTitle: 0.05, afterFormula: 0.06, afterSubtitle: 0.07, betweenParagraphs: 0.05, divider: 0.08 };

// Draw order inside the panel (all transparent while fading): frame, card, decorations, text
const ORDER = { frame: 1, card: 2, deco: 3, text: 4 };

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 6);
}

const camPos = new THREE.Vector3();
const selfPos = new THREE.Vector3();

AFRAME.registerComponent('info-panel', {
  schema: { number: { type: 'int', default: 1 } },

  init() {
    this.content = STATIONS[this.data.number - 1];
    this.theme = stationTheme(this.data.number);
    this.state = 'idle'; // idle → building → ready
    this.fade = 0;
    this.el.setAttribute('face-player', 'speed: 2.5; maxAngle: 40');
  },

  /** The text blocks, in order, created one per frame. */
  blocks() {
    const c = this.content;
    const right = { align: 'right', anchorX: 'right', anchorY: 'top', color: TEXT_COLOR, lineHeight: 1.7 };
    const centred = { align: 'center', anchorX: 'center', anchorY: 'top', lineHeight: 1.7 };
    const titleWidth = INNER - 2 * BADGE_R - 0.06;
    return [
      { id: 'badge', comp: 'arabic-text', props: { value: toArabicDigits(this.data.number), fontSize: 0.075, weight: 'bold', color: '#FFFFFF', align: 'center', anchorX: 'center', anchorY: 'middle' } },
      { id: 'title', comp: 'arabic-text', props: { ...right, value: c.name, fontSize: SIZE.title, weight: 'bold', maxWidth: titleWidth, lineHeight: 1.35 } },
      { id: 'formula', comp: 'math-text', props: { value: c.formula, fontSize: SIZE.formula, color: TEXT_COLOR, anchorX: 'center', anchorY: 'top' } },
      { id: 'subtitle', comp: 'arabic-text', props: { ...right, value: c.subtitle, fontSize: SIZE.subtitle, weight: 'bold', color: this.theme.curve, maxWidth: INNER } },
      { id: 'math', comp: 'arabic-text', props: { ...right, value: c.math, fontSize: SIZE.body, maxWidth: INNER } },
      { id: 'life', comp: 'arabic-text', props: { ...right, value: c.life, fontSize: SIZE.body, maxWidth: INNER } },
      { id: 'quote', comp: 'arabic-text', props: { ...centred, value: c.quote, fontSize: SIZE.quote, color: this.theme.curve, maxWidth: INNER - 0.1 } },
    ];
  },

  tick() {
    const camera = this.el.sceneEl.camera;
    if (!camera) return;
    camera.getWorldPosition(camPos);
    this.el.object3D.getWorldPosition(selfPos);
    const d = Math.hypot(camPos.x - selfPos.x, camPos.z - selfPos.z);

    if (this.state === 'idle' && d < CREATE_AT) this.startBuilding();
    else if (this.state !== 'idle' && d > FREE_AT) this.free();

    if (this.state === 'building') this.buildNext();

    const fade = this.state === 'ready' ? THREE.MathUtils.clamp((FADE_FROM - d) / (FADE_FROM - FADE_TO), 0, 1) : 0;
    if (fade !== this.fade) this.setFade(fade);
  },

  startBuilding() {
    this.state = 'building';
    this.queue = this.blocks();
    this.made = {};
    this.sizes = {};
    this.root = document.createElement('a-entity');
    this.root.object3D.visible = false;
    this.el.appendChild(this.root);
  },

  // One text block per frame: canvas drawing and texture uploads are spread over several frames.
  buildNext() {
    const block = this.queue.shift();
    if (!block) return;
    const e = document.createElement('a-entity');
    e.addEventListener('textsync', (ev) => {
      this.sizes[block.id] = ev.detail;
      if (Object.keys(this.sizes).length === this.blocks().length) this.layout();
    }, { once: true });
    e.setAttribute(block.comp, block.props);
    this.root.appendChild(e);
    this.made[block.id] = e;
  },

  /** Arabic blocks report their height with padding; this is the visible text height. */
  textHeight(id) {
    const s = this.sizes[id];
    return s.height - 2 * (s.pad || 0);
  },

  layout() {
    const m = this.made;
    const right = INNER / 2;
    let y = 0; // going down from the top of the content

    // Title row: badge on the right, name to its left
    const titleH = this.textHeight('title');
    const badgeX = right - BADGE_R;
    const firstLine = SIZE.title * 0.75; // badge centred on the first line of the title
    m.badge.object3D.position.set(badgeX, -firstLine, 0.004);
    m.title.object3D.position.set(right - 2 * BADGE_R - 0.06, y, 0.004);
    y -= Math.max(titleH, 2 * BADGE_R) + GAP.afterTitle;

    m.formula.object3D.position.set(0, y, 0.004);
    y -= this.sizes.formula.height + GAP.afterFormula;

    m.subtitle.object3D.position.set(right, y, 0.004);
    y -= this.textHeight('subtitle') + GAP.afterSubtitle;

    m.math.object3D.position.set(right, y, 0.004);
    y -= this.textHeight('math') + GAP.betweenParagraphs;

    m.life.object3D.position.set(right, y, 0.004);
    y -= this.textHeight('life') + GAP.divider;
    const dividerY = y;
    y -= GAP.divider;

    m.quote.object3D.position.set(0, y, 0.004);
    y -= this.textHeight('quote');

    const contentH = -y;
    const height = contentH + 2 * PAD;
    // Content top in panel coordinates, so that the card is centred at CENTRE_Y
    const top = CENTRE_Y + height / 2 - PAD;
    this.root.object3D.position.set(0, top, 0);

    // Card, frame, badge disc and divider (in root coordinates: y = 0 is the content top)
    this.meshes = [];
    const add = (geometry, color, z, order, yPos = 0, xPos = 0) => {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
      mesh.position.set(xPos, yPos, z);
      mesh.renderOrder = order;
      this.root.object3D.add(mesh);
      this.meshes.push(mesh);
      return mesh;
    };
    const cardY = PAD - height / 2;
    add(roundedRect(WIDTH + 2 * FRAME, height + 2 * FRAME, RADIUS + FRAME), this.theme.frame, -0.003, ORDER.frame, cardY);
    add(roundedRect(WIDTH, height, RADIUS), this.theme.tint, 0, ORDER.card, cardY);
    add(new THREE.CircleGeometry(BADGE_R, 32), this.theme.curve, 0.002, ORDER.deco, -firstLine, badgeX);
    add(new THREE.PlaneGeometry(INNER * 0.7, 0.004), this.theme.frame, 0.002, ORDER.deco, dividerY);

    // Text draws after the card
    this.root.object3D.traverse((o) => {
      if (o.isMesh && !this.meshes.includes(o)) o.renderOrder = ORDER.text;
    });
    this.state = 'ready';
    this.fade = -1; // force the first setFade
  },

  setFade(fade) {
    this.fade = fade;
    if (!this.root) return;
    this.root.object3D.visible = fade > 0;
    this.root.object3D.traverse((o) => {
      if (o.fillOpacity !== undefined) o.fillOpacity = fade; // troika text
      else if (o.material) {
        o.material.transparent = true;
        o.material.opacity = fade;
      }
    });
  },

  free() {
    this.state = 'idle';
    this.queue = [];
    this.meshes?.forEach((mesh) => {
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    this.meshes = null;
    this.root?.remove(); // removing the entities releases their text textures
    this.root = null;
    this.fade = 0;
  },

  remove() {
    this.free();
  },
});
