// A station's curve as light (brief §11 goal 2, simple version: no drawing animation yet).
//   ribbon: a bright near-white core with the station accent at its edges (readable on a bright
//           sunset sky) plus a wide, soft additive halo (glows at night). All pieces of the curve are
//           merged, so the curve is always 2 draw calls.
//   axes:   faint cream lines of light at the real x = 0 and y = 0, a tick at every integer, the
//           letters x / y at the ends and a few tick numbers (Fira Sans, troika).
//   extras: open / closed dots at each step end (station 10), dashed glowing asymptotes (station 8).
// update(params) rebuilds only what depends on the parameters (ribbon + dots), once per call.
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { FONTS } from './fonts.js';
import { samplePieces, yWindowOf } from './functions.js';
import { applyOutline, dayFactor, deepAccent } from './label-style.js';

const CORE_WIDTH = 0.05;
const HALO_WIDTH = 0.26;
const OUTLINE_WIDTH = 0.085; // deep-accent edge behind the core, for contrast against a bright sky
const AXIS_WIDTH = 0.012;
const TICK = 0.09;
const CREAM = '#FFF4E6';
const DOT_R = 0.045;

const ribbonVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coreFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform vec3 uCore;
  uniform float uBoost;
  varying vec2 vUv;
  void main() {
    float v = abs(vUv.y * 2.0 - 1.0);
    vec3 col = mix(uCore, uAccent, smoothstep(0.1, 0.75, v));
    col *= 1.0 + 0.5 * uBoost;
    float alpha = 1.0 - smoothstep(0.8, 1.0, v); // soft edge, no jaggies
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

const haloFragment = /* glsl */ `
  uniform vec3 uAccent;
  uniform float uStrength;
  uniform float uBoost;
  varying vec2 vUv;
  void main() {
    float v = abs(vUv.y * 2.0 - 1.0);
    float glow = exp(-v * v * 5.0) * (1.0 - v);
    gl_FragColor = vec4(uAccent * glow * (uStrength + 0.9 * uBoost), 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Ribbon strips along polylines in the local xy plane (z fixed), merged into one geometry.
 * uv.x = distance along, uv.y = 0 / 1 across.
 */
function ribbonGeometry(polylines, width, z) {
  const positions = [];
  const uvs = [];
  const index = [];
  for (const pts of polylines) {
    if (pts.length < 2) continue;
    const base = positions.length / 3;
    let s = 0;
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b.x - a.x;
      let ty = b.y - a.y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      if (i > 0) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      const nx = -ty * (width / 2);
      const ny = tx * (width / 2);
      positions.push(p.x - nx, p.y - ny, z, p.x + nx, p.y + ny, z);
      uvs.push(s, 0, s, 1);
      if (i > 0) {
        const r = base + (i - 1) * 2;
        index.push(r, r + 2, r + 1, r + 1, r + 2, r + 3);
      }
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(index);
  return g;
}

function makeText(value, size, anchorX, anchorY, accent) {
  const t = new Text();
  t.font = FONTS.math;
  t.text = value;
  t.fontSize = size;
  t.color = CREAM;
  t.anchorX = anchorX;
  t.anchorY = anchorY;
  applyOutline(t, accent, dayFactor());
  t.sync();
  return t;
}

export class LightCurve {
  /**
   * @param def    function definition (functions.js)
   * @param theme  station colours ({ curve: accent, ... })
   * @param toLocal (x, y, target) => Vector3 in the station's local frame
   */
  constructor(def, theme, toLocal) {
    this.def = def;
    this.toLocal = toLocal;
    this.group = new THREE.Group();
    this.z = toLocal(0, 0).z;
    const accent = new THREE.Color(theme.curve);

    this.coreMaterial = new THREE.ShaderMaterial({
      vertexShader: ribbonVertex,
      fragmentShader: coreFragment,
      uniforms: { uAccent: { value: accent }, uCore: { value: new THREE.Color('#FFF8F2') }, uBoost: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.haloMaterial = new THREE.ShaderMaterial({
      vertexShader: ribbonVertex,
      fragmentShader: haloFragment,
      uniforms: { uAccent: { value: accent }, uStrength: { value: 0.55 }, uBoost: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.accent = theme.curve;
    // Thin deep-accent edge under the core: gives the curve contrast by day, fades out toward night
    this.outlineMaterial = new THREE.MeshBasicMaterial({ color: deepAccent(theme.curve), transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
    this.axisMaterial = new THREE.MeshBasicMaterial({ color: CREAM, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    this.dashMaterial = new THREE.MeshBasicMaterial({ color: theme.curve, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    this.dotMaterial = new THREE.MeshBasicMaterial({ color: '#FFF8F2', side: THREE.DoubleSide });
    this.ringMaterial = new THREE.MeshBasicMaterial({ color: theme.curve, side: THREE.DoubleSide });

    this.halo = new THREE.Mesh(new THREE.BufferGeometry(), this.haloMaterial);
    this.core = new THREE.Mesh(new THREE.BufferGeometry(), this.coreMaterial);
    this.edge = new THREE.Mesh(new THREE.BufferGeometry(), this.outlineMaterial);
    this.halo.renderOrder = 5;
    this.edge.renderOrder = 6;
    this.core.renderOrder = 7;
    this.dots = new THREE.Group();
    this.labels = new THREE.Group();
    this.group.add(this.halo, this.edge, this.core, this.dots, this.labels);
    this.buildAxes(theme.curve);
  }

  local(x, y) {
    return this.toLocal(x, y, new THREE.Vector3());
  }

  buildAxes(accent) {
    const [x0, x1] = this.def.window;
    const [y0, y1] = yWindowOf(this.def);
    const lines = [
      [this.local(x0, 0), this.local(x1, 0)],
      [this.local(0, y0), this.local(0, y1)],
    ];
    // Ticks at every integer (half above / half below the axis)
    const half = TICK / 2;
    for (let x = Math.ceil(x0); x <= x1; x++) {
      if (x === 0) continue;
      const p = this.local(x, 0);
      lines.push([new THREE.Vector3(p.x, p.y - half, 0), new THREE.Vector3(p.x, p.y + half, 0)]);
    }
    for (let y = Math.ceil(y0); y <= y1; y++) {
      if (y === 0) continue;
      const p = this.local(0, y);
      lines.push([new THREE.Vector3(p.x - half, p.y, 0), new THREE.Vector3(p.x + half, p.y, 0)]);
    }
    this.axes = new THREE.Mesh(ribbonGeometry(lines, AXIS_WIDTH, this.z - 0.002), this.axisMaterial);
    this.axes.renderOrder = 4;
    this.group.add(this.axes);

    // Letters at the axis ends and a few tick numbers
    const end = this.local(x1, 0);
    const top = this.local(0, y1);
    const add = (text) => {
      text.position.z = this.z;
      this.labels.add(text);
    };
    const xLabel = makeText('x', 0.13, 'left', 'middle', accent);
    xLabel.position.set(end.x + 0.07, end.y, 0);
    add(xLabel);
    const yLabel = makeText('y', 0.13, 'center', 'bottom', accent);
    yLabel.position.set(top.x, top.y + 0.06, 0);
    add(yLabel);
    for (let x = Math.ceil(x0); x < x1; x++) {
      if (x === 0 || x % 2 !== 0 || x === x0) continue;
      const p = this.local(x, 0);
      const t = makeText(fmtTick(x), 0.09, 'center', 'top', accent);
      t.position.set(p.x, p.y - 0.07, 0);
      add(t);
    }
    for (const y of [-2, 2, 4].filter((v) => v > y0 && v <= y1)) {
      const p = this.local(0, y);
      const t = makeText(fmtTick(y), 0.09, 'right', 'middle', accent);
      t.position.set(p.x - 0.07, p.y, 0);
      add(t);
    }

    // Station 8: the asymptotes x = 0 and y = 0 as dashed glowing lines
    if (this.def.breaks && this.def.gap >= 0.01) {
      const dashes = [];
      const dashLine = (a, b) => {
        const len = a.distanceTo(b);
        const dir = b.clone().sub(a).normalize();
        for (let s = 0; s < len; s += 0.15) {
          dashes.push([a.clone().addScaledVector(dir, s), a.clone().addScaledVector(dir, Math.min(len, s + 0.08))]);
        }
      };
      dashLine(this.local(0, y0), this.local(0, y1));
      dashLine(this.local(x0, 0), this.local(x1, 0));
      this.asymptotes = new THREE.Mesh(ribbonGeometry(dashes, 0.022, this.z - 0.001), this.dashMaterial);
      this.asymptotes.renderOrder = 6;
      this.group.add(this.asymptotes);
    }
  }

  /** Rebuild the ribbon (and step dots) for new parameters. */
  update(params) {
    const pieces = samplePieces(this.def, params).map((piece) => piece.map((p) => this.local(p.x, p.y)));
    this.core.geometry.dispose();
    this.halo.geometry.dispose();
    this.edge.geometry.dispose();
    this.core.geometry = ribbonGeometry(pieces, CORE_WIDTH, this.z);
    this.edge.geometry = ribbonGeometry(pieces, OUTLINE_WIDTH, this.z - 0.002);
    this.halo.geometry = ribbonGeometry(pieces, HALO_WIDTH, this.z - 0.004);
    this.updateDots(pieces);
  }

  // Step function: a closed dot where each step starts, an open dot where it ends
  // (except where a step is cut by the edge of the window).
  updateDots(pieces) {
    this.dots.children.forEach((m) => m.geometry.dispose());
    this.dots.clear();
    if (this.def.number !== 10) return;
    const rightEdge = this.local(this.def.window[1], 0).x;
    for (const piece of pieces) {
      const last = piece[piece.length - 1];
      this.addDot(piece[0], true);
      if (Math.abs(last.x - rightEdge) > 1e-3) this.addDot(last, false);
    }
  }

  addDot(p, closed) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(DOT_R * 0.55, DOT_R, 20), this.ringMaterial);
    ring.position.set(p.x, p.y, this.z + 0.004);
    ring.renderOrder = 8;
    this.dots.add(ring);
    if (closed) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(DOT_R * 0.6, 16), this.dotMaterial);
      disc.position.set(p.x, p.y, this.z + 0.005);
      disc.renderOrder = 9;
      this.dots.add(disc);
    }
  }

  /** 0 = normal, 1 = extra bright (visited moment). */
  setBoost(v) {
    this.coreMaterial.uniforms.uBoost.value = v;
    this.haloMaterial.uniforms.uBoost.value = v;
  }

  /** Day/night contrast: 1 = sunset (dark edge + dark label outlines), 0 = night (glow). */
  setDay(day) {
    this.outlineMaterial.opacity = day;
    this.edge.visible = day > 0.01;
    for (const t of this.labels.children) {
      applyOutline(t, this.accent, day);
      t.sync();
    }
  }

  setLabelsVisible(visible) {
    this.labels.visible = visible;
  }

  dispose() {
    for (const m of [this.core, this.halo, this.edge, this.axes, this.asymptotes]) m?.geometry.dispose();
    this.dots.children.forEach((m) => m.geometry.dispose());
    this.labels.children.forEach((t) => t.dispose());
    for (const mat of [this.coreMaterial, this.haloMaterial, this.outlineMaterial, this.axisMaterial, this.dashMaterial, this.dotMaterial, this.ringMaterial]) mat.dispose();
  }
}

/** −2 with a true minus sign */
function fmtTick(v) {
  return v < 0 ? `−${-v}` : String(v);
}
