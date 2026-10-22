// <a-entity trail-path> — the visible path along the cliff (a lighter sandy ribbon draped on the
// terrain) and the closing-lookout marker (a ring, until D.1). Stations are built by station.js.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { TRAIL, LOOKOUT } from '../trail.js';
import { terrainHeight } from '../terrain.js';
import { UI } from '../content.js';

const WIDTH = 1.8;
const LIFT = 0.07; // above the terrain, to stay clear of the flat-shaded triangles

export const STATION_COLORS = {
  pink: { curve: '#E0457B', tint: '#F6E3EA', frame: '#C07A9A' },
  purple: { curve: '#7B3FE4', tint: '#EFE6F7', frame: '#9A86C2' },
};
export const stationTheme = (n) => (n % 2 === 1 ? STATION_COLORS.pink : STATION_COLORS.purple);

/** Soft-edged strip texture: opaque in the middle, fading at both sides. */
function edgeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 4;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.25, 'rgba(255,255,255,1)');
  g.addColorStop(0.75, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 4);
  return new THREE.CanvasTexture(canvas);
}

function trailGeometry() {
  const positions = [];
  const uvs = [];
  const index = [];
  TRAIL.forEach((p, i) => {
    const a = TRAIL[Math.max(0, i - 1)];
    const b = TRAIL[Math.min(TRAIL.length - 1, i + 1)];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    // Three points across (left, centre, right) so the ribbon follows the ground's cross slope
    [-1, 0, 1].forEach((side) => {
      const x = p.x + (nx * WIDTH * side) / 2;
      const z = p.z + (nz * WIDTH * side) / 2;
      positions.push(x, terrainHeight(x, z) + LIFT, z);
      uvs.push((side + 1) / 2, p.s / WIDTH);
    });
    if (i > 0) {
      const r = (i - 1) * 3;
      const c = i * 3;
      index.push(r, r + 1, c, r + 1, c + 1, c, r + 1, r + 2, c + 1, r + 2, c + 2, c + 1);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

function el(tag, attrs, parent) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.appendChild(e);
  return e;
}

AFRAME.registerComponent('trail-path', {
  init() {
    this.texture = edgeTexture();
    this.material = new THREE.MeshStandardMaterial({
      color: '#F1DDC9',
      roughness: 1,
      alphaMap: this.texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.Mesh(trailGeometry(), this.material);
    this.mesh.renderOrder = 1;
    this.el.setObject3D('trail', this.mesh);

    this.addLookoutMarker(LOOKOUT);
  },

  addLookoutMarker(stop) {
    const root = el('a-entity', { position: `${stop.x} ${stop.y} ${stop.z}`, class: 'trail-marker' }, this.el);
    root.dataset.station = 'end';
    el('a-torus', {
      position: '0 1.4 0',
      radius: 0.9,
      'radius-tubular': 0.05,
      'segments-tubular': 32,
      rotation: `0 ${THREE.MathUtils.radToDeg(stop.faceYaw)} 0`,
      material: 'color: #E7B76E; emissive: #E7B76E; emissiveIntensity: 0.4; roughness: 0.6',
    }, root);
    const label = el('a-entity', { position: '0 2.75 0', 'face-player': '' }, root);
    label.setAttribute('arabic-text', {
      value: UI.closingTitle,
      fontSize: 0.3,
      weight: 'bold',
      color: '#FFF4E6',
      align: 'center',
      anchorX: 'center',
    });
  },

  remove() {
    this.el.removeObject3D('trail');
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
  },
});
