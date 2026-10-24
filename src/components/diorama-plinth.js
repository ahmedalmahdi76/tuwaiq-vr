// <a-entity diorama-plinth="number: N"> — the floating pastel box under a station's curve (Phase N,
// NATURE_SCENES.md §2). The entity's origin is the CENTRE OF THE TOP SURFACE, which sits exactly at
// the bottom of the curve window (y = −3), so nothing in the diorama goes below it. Local axes as the
// station: +z toward the visitor (front face), +x to the right.
//   body: rounded box, pink (odd) / lilac (even), paper-grain clay, lit by the scene
//   top: faint light grid (half a curve unit), a grass rim along the back edge (Kenney props)
//   floating: soft glow around the underside edge + blob shadow on the ground; it does not bob
//   front face (unlit, readable at any time of day), top to bottom:
//     control strip (the − / + rows, laid out by station.js) + «▶ رحلة على المنحنى»
//     properties row: «خواص الدالة» mini-cards (titles now, live values in N.6)
//     name band: paper label with leaf sprigs: function name (bold) + station subtitle
import AFRAME from 'aframe';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { STATIONS } from '../content.js';
import { JOURNEY_LABEL, PROPERTY_TITLES } from '../nature-content.js';
import { registerClickable } from '../interaction.js';
import { loadProps, createPropInstances, disposePropInstances } from '../props.js';
import { quality } from '../quality.js';
import { rng } from '../noise.js';
import { terrainHeight } from '../terrain.js';
import { CURVE, PLINTH, FACE } from '../station-layout.js';
import { stationTheme } from './trail-path.js';

const TEXT_DISTANCE = 55; // front-face text textures exist only within this distance (memory)
const PLUM = '#3B1F2B';
const PAPER = '#FFF8F3';
const PILLS = ['#EDB8CF', '#CDB9EE', '#BFE2D0', '#C2D6F0', '#F5D2B8'];

// Body / top colours per theme
const COLORS = {
  pink: { body: '#F0C3D4', top: '#F8DDE7', glow: '#FFC9DC', sprig: '#C77DA0' },
  lilac: { body: '#D6C3EE', top: '#EADFF7', glow: '#DCCBFF', sprig: '#9C82CC' },
};

// ---------- shared textures (made once) ----------

const textures = {};

function canvasTexture(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Light paper grain (white with faint specks), multiplied with the body colour. */
function grainTexture() {
  return (textures.grain ??= canvasTexture(128, 128, (ctx, w, h) => {
    const img = ctx.createImageData(w, h);
    const random = rng(99);
    for (let i = 0; i < w * h; i++) {
      const v = 236 + random() * 19;
      img.data.set([v, v, v, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
  }, { repeat: true }));
}

/** One grid cell (half a curve unit) with faint white lines on its edges, over the top colour. */
function gridTexture(theme) {
  return (textures[`grid-${theme}`] ??= canvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = COLORS[theme].top;
    ctx.fillRect(0, 0, w, h);
    const random = rng(7);
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.05 + random() * 0.08})`;
      ctx.fillRect(random() * w, random() * h, 1, 1);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
  }, { repeat: true }));
}

/** Soft rounded-rectangle glow / shadow (white, alpha falls off from the edge). */
function softRectTexture() {
  return (textures.soft ??= canvasTexture(256, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.scale(1, h / w);
    ctx.fillRect(0, 0, w, w);
    ctx.restore();
  }));
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A leaf sprig: curved stem, leaves on both sides, a few small flowers. */
function drawSprig(ctx, x, y, size, color, flip) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip ? -size : size, size);
  ctx.strokeStyle = '#4E7A4A';
  ctx.lineWidth = 0.035;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0.5);
  ctx.quadraticCurveTo(0.12, 0, -0.05, -0.5);
  ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const px = 0.12 * (1 - t) * t * 2 - 0.05 * t * t;
    const py = 0.4 - t * 0.85;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(side * 0.9 - 0.2);
      ctx.fillStyle = i % 2 ? '#6E9B5F' : '#5B8A55';
      ctx.beginPath();
      ctx.ellipse(side * 0.09, 0, 0.1, 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = color;
  for (const [fx, fy] of [[0.06, -0.15], [-0.08, 0.1], [0.02, -0.45]]) {
    ctx.beginPath();
    ctx.arc(fx, fy, 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The name band: cream paper label with a thin outline and a leaf sprig at each end. */
function bandTexture(theme) {
  return (textures[`band-${theme}`] ??= canvasTexture(1024, 96, (ctx, w, h) => {
    roundRectPath(ctx, 4, 4, w - 8, h - 8, 34);
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.strokeStyle = 'rgba(59,31,43,0.55)';
    ctx.lineWidth = 3;
    roundRectPath(ctx, 12, 12, w - 24, h - 24, 28);
    ctx.stroke();
    for (const [x, flip] of [[58, false], [w - 58, true]]) {
      ctx.save();
      ctx.translate(x, h / 2);
      ctx.rotate(flip ? 0.75 : -0.75);
      drawSprig(ctx, 0, 0, 88, COLORS[theme].sprig, flip);
      ctx.restore();
    }
  }));
}

/** A properties card: paper with a coloured title pill at the top. One texture per pill colour. */
function cardTexture(pill) {
  return (textures[`card-${pill}`] ??= canvasTexture(256, 80, (ctx, w, h) => {
    roundRectPath(ctx, 3, 3, w - 6, h - 6, 16);
    ctx.fillStyle = PAPER;
    ctx.fill();
    ctx.strokeStyle = 'rgba(59,31,43,0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();
    roundRectPath(ctx, 18, 6, w - 36, 40, 20);
    ctx.fillStyle = pill;
    ctx.fill();
  }));
}

// ---------- geometry helpers ----------

const geometries = {};
const plane = (w, h) => (geometries[`plane-${w}-${h}`] ??= new THREE.PlaneGeometry(w, h));

function roundedRectGeometry(w, h, r) {
  const key = `rr-${w}-${h}-${r}`;
  if (geometries[key]) return geometries[key];
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
  return (geometries[key] = new THREE.ShapeGeometry(s, 6));
}

AFRAME.registerComponent('diorama-plinth', {
  schema: { number: { type: 'int', default: 1 } },

  init() {
    const n = this.data.number;
    this.themeName = n % 2 === 1 ? 'pink' : 'lilac';
    this.accent = stationTheme(n).curve;
    const colors = COLORS[this.themeName];
    this.owned = []; // per-station materials to dispose
    const group = new THREE.Group();
    this.el.setObject3D('plinth', group);

    // Body
    const bodyMat = this.own(new THREE.MeshStandardMaterial({ color: colors.body, map: grainTexture(), roughness: 0.95 }));
    const body = new THREE.Mesh(
      (geometries.body ??= new RoundedBoxGeometry(PLINTH.width, PLINTH.height, PLINTH.depth, 3, 0.035)),
      bodyMat,
    );
    body.position.y = -PLINTH.height / 2;
    group.add(body);

    // Top: grid, aligned so lines fall on whole and half curve units
    const cell = CURVE.scale / 2;
    const grid = gridTexture(this.themeName).clone();
    grid.needsUpdate = true;
    grid.repeat.set(PLINTH.width / cell, PLINTH.depth / cell);
    grid.offset.set(-((PLINTH.width / 2 / cell) % 1), 0);
    this.ownTexture(grid);
    const top = new THREE.Mesh(
      plane(PLINTH.width - 0.05, PLINTH.depth - 0.05),
      this.own(new THREE.MeshStandardMaterial({ map: grid, roughness: 0.95 })),
    );
    top.rotation.x = -Math.PI / 2;
    top.position.y = 0.002;
    group.add(top);

    // Soft glow around the underside edge (additive, seen around the box from above)
    const glow = new THREE.Mesh(
      plane(PLINTH.width + 0.5, PLINTH.depth + 0.5),
      this.own(new THREE.MeshBasicMaterial({
        color: colors.glow, map: softRectTexture(), transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -PLINTH.height - 0.01;
    group.add(glow);

    this.buildShadow(group);
    this.buildFrontFace(group);

    loadProps().then(() => {
      if (!this.el.parentNode) return; // removed meanwhile
      this.grass = this.buildGrassRim();
      group.add(this.grass);
    });
  },

  own(material) {
    this.owned.push(material);
    return material;
  },

  ownTexture(texture) {
    this.ownedTextures = this.ownedTextures || [];
    this.ownedTextures.push(texture);
  },

  /** Blob shadow on the terrain under the plinth (computed once; the plinth doesn't move). */
  buildShadow(group) {
    const station = this.el.parentEl.object3D;
    const local = new THREE.Vector3(CURVE.x, 0, CURVE.z);
    const c = Math.cos(station.rotation.y);
    const s = Math.sin(station.rotation.y);
    const wx = station.position.x + local.x * c + local.z * s;
    const wz = station.position.z - local.x * s + local.z * c;
    const groundY = terrainHeight(wx, wz) - station.position.y - CURVE.bottom; // in plinth space
    const shadow = new THREE.Mesh(
      plane(PLINTH.width + 0.7, PLINTH.depth + 0.8),
      this.own(new THREE.MeshBasicMaterial({
        color: '#3B1F2B', alphaMap: softRectTexture(), transparent: true, opacity: 0.2,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
      })),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = groundY + 0.06;
    shadow.renderOrder = 1;
    group.add(shadow);
  },

  buildFrontFace(group) {
    const n = this.data.number;
    const content = STATIONS[n - 1];
    const face = new THREE.Group();
    face.position.z = FACE.z;
    group.add(face);
    const unlit = (map) => this.own(new THREE.MeshBasicMaterial({ map, transparent: true }));
    const text = (props, x, y, z = 0.004) => {
      const e = document.createElement('a-entity');
      e.setAttribute('position', `${x} ${y} ${FACE.z + z}`);
      e.setAttribute('arabic-text', { anchorX: 'center', anchorY: 'middle', align: 'center', color: PLUM, activeDistance: TEXT_DISTANCE, ...props });
      this.el.appendChild(e);
      return e;
    };

    // Journey button (the journey itself arrives in N.5)
    const j = FACE.journey;
    const btnMat = this.own(new THREE.MeshBasicMaterial({ color: this.accent }));
    const btn = new THREE.Mesh(roundedRectGeometry(j.w, j.h, j.h / 2), btnMat);
    btn.position.set(j.x, FACE.strip.y, 0.002);
    face.add(btn);
    const hit = new THREE.Mesh(plane(j.w + 0.04, j.h + 0.06), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(j.x, FACE.strip.y, 0.012);
    face.add(hit);
    this.ownHit = hit;
    const label = text({ value: JOURNEY_LABEL, fontSize: 0.07, weight: 'bold', color: '#FFFFFF' }, j.x, FACE.strip.y, 0.008);
    this.journeyPress = 0;
    this.journeyBtn = btn;
    this.journeyLabel = label;
    this.unregister = registerClickable(hit, {
      onHover: (on) => btnMat.color.set(this.accent).lerp(new THREE.Color('#FFFFFF'), on ? 0.22 : 0),
      onClick: () => {
        this.journeyPress = 1;
        this.el.parentEl.emit('journeyrequest', { number: n });
      },
    });

    // Properties row: one card per title, spread across the face
    const titles = PROPERTY_TITLES[n];
    const gap = 0.05;
    const cw = Math.min(0.56, (PLINTH.width - 0.12 - gap * (titles.length - 1)) / titles.length);
    const total = cw * titles.length + gap * (titles.length - 1);
    // RTL: the first card on the right
    titles.forEach((title, i) => {
      const x = total / 2 - cw / 2 - i * (cw + gap);
      const pill = PILLS[i % PILLS.length];
      const card = new THREE.Mesh(plane(cw, FACE.cards.h), unlit(cardTexture(pill)));
      card.position.set(x, FACE.cards.y, 0.001);
      face.add(card);
      // The pill spans canvas rows 6–46 of 80: its centre is 26/80 from the top
      text({ value: title, fontSize: 0.055, weight: 'bold' }, x, FACE.cards.y + FACE.cards.h * (0.5 - 26 / 80));
      text({ value: '…', fontSize: 0.06, color: '#7A5A6A' }, x, FACE.cards.y - FACE.cards.h * 0.22);
    });

    // Name band
    const b = FACE.band;
    const band = new THREE.Mesh(plane(b.w, b.h), unlit(bandTexture(this.themeName)));
    band.position.set(0, b.y, 0.001);
    face.add(band);
    text({ value: content.name, fontSize: 0.11, weight: 'bold' }, 0, b.y + 0.035);
    text({ value: content.subtitle, fontSize: 0.07, color: '#5E3A4C' }, 0, b.y - 0.055);
  },

  buildGrassRim() {
    const random = rng(1000 + this.data.number);
    const count = quality.level === 'low' ? 12 : quality.level === 'medium' ? 22 : 34;
    const kinds = ['grass', 'grass_leafs', 'grass', 'plant_bushSmall', 'grass_large'];
    const placements = [];
    for (let i = 0; i < count; i++) {
      const t = (i + random() * 0.6) / count;
      placements.push({
        name: kinds[Math.floor(random() * kinds.length)],
        x: (t - 0.5) * (PLINTH.width - 0.14),
        y: 0,
        z: -PLINTH.depth / 2 + 0.07 + random() * 0.06,
        scale: 0.35 + random() * 0.25,
        rotY: random() * Math.PI * 2,
      });
    }
    return createPropInstances(placements);
  },

  tick(time, delta) {
    if (this.journeyPress > 0) {
      this.journeyPress = Math.max(0, this.journeyPress - delta / 160);
      const s = 1 - 0.08 * Math.sin(this.journeyPress * Math.PI);
      this.journeyBtn.scale.set(s, s, 1);
      this.journeyLabel.object3D.scale.set(s, s, 1);
    }
  },

  remove() {
    this.unregister?.();
    if (this.grass) disposePropInstances(this.grass);
    this.owned.forEach((m) => m.dispose());
    this.ownedTextures?.forEach((t) => t.dispose());
    this.el.removeObject3D('plinth');
  },
});
