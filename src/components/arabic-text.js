// <a-entity arabic-text="..."> — Arabic (RTL, joined letters, correct harakat) text in 3D.
// Drawn on a 2D canvas so the browser does the shaping (troika misplaces some marks), then shown
// on a plane sized to the text block. Textures are cached and shared (see text-canvas.js).
//
// Set the value from JS with an object: el.setAttribute('arabic-text', { value: text }),
// because A-Frame's attribute-string syntax treats ":" and ";" as separators.
// Emits 'textsync' with { width, height, pad } (metres; height includes the padding) once ready.
//
// activeDistance > 0: the texture only exists while the camera is within that distance
// (with 20% hysteresis), to keep GPU memory low on phones.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { arabicFontsReady } from '../fonts.js';
import { acquire, release, textKey } from '../text-canvas.js';

const PLANE = new THREE.PlaneGeometry(1, 1);
const HYSTERESIS = 1.2;
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

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
    activeDistance: { type: 'number', default: 0 },
  },

  init() {
    this.material = new THREE.MeshBasicMaterial({
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(PLANE, this.material);
    this.mesh.visible = false;
    this.el.setObject3D('text', this.mesh);
    this.key = null;
    this.entry = null;
    this.version = 0;
    this.active = false;
    this.tick = AFRAME.utils.throttleTick(this.tick, 500, this);
  },

  update() {
    this.active = this.data.activeDistance <= 0 || this.isNear(1);
    this.refresh();
  },

  tick() {
    if (this.data.activeDistance <= 0) return;
    const near = this.isNear(this.active ? HYSTERESIS : 1);
    if (near !== this.active) {
      this.active = near;
      this.refresh();
    }
  },

  remove() {
    this.version++;
    this.releaseEntry();
    this.material.dispose();
    this.el.removeObject3D('text');
  },

  isNear(factor) {
    const camera = this.el.sceneEl.camera;
    if (!camera) return false; // the next tick checks again
    camera.getWorldPosition(tmpA);
    this.el.object3D.getWorldPosition(tmpB);
    return tmpA.distanceTo(tmpB) < this.data.activeDistance * factor;
  },

  async refresh() {
    const token = ++this.version;
    if (!this.active || !this.data.value) {
      this.releaseEntry();
      return;
    }
    const key = textKey(this.data);
    if (key === this.key && this.entry) {
      this.place(); // only anchors changed: no redraw
      return;
    }
    await arabicFontsReady();
    if (token !== this.version) return; // a newer update or removal happened while waiting

    const entry = acquire(this.data, key, this.anisotropy());
    this.releaseEntry();
    this.entry = entry;
    this.key = key;
    this.material.map = entry.texture;
    this.material.needsUpdate = true;
    this.place();
    this.mesh.visible = true;
    this.el.emit('textsync', { width: entry.width, height: entry.height, pad: entry.pad });
  },

  releaseEntry() {
    if (this.key) release(this.key);
    this.key = null;
    this.entry = null;
    this.material.map = null;
    this.mesh.visible = false;
  },

  // Position the plane so the text edge (not the padding) sits on the anchor point.
  place() {
    const { width: w, height: h, pad } = this.entry;
    const { anchorX, anchorY } = this.data;
    this.mesh.scale.set(w, h, 1);
    this.mesh.position.x = anchorX === 'right' ? -w / 2 + pad : anchorX === 'left' ? w / 2 - pad : 0;
    this.mesh.position.y = anchorY === 'top' ? -h / 2 + pad : anchorY === 'bottom' ? h / 2 - pad : 0;
  },

  anisotropy() {
    const renderer = this.el.sceneEl.renderer;
    return renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 4;
  },
});
