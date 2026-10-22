// A painted overlay for the desert plain (like the Edge of the World photo): branching dry riverbeds
// flowing away from the escarpment, and soft cooler grey-brown patches. Painted once on a canvas
// with seeded randomness, so the world is the same every time.
import * as THREE from 'three';
import { rng } from './noise.js';
import { quality } from './quality.js';

/** World area covered by the overlay (x from, z from, width, depth). The shader fades its borders. */
export const WADI_RECT = { x: -1600, z: -3600, w: 4000, d: 3600 };

let texture = null;

function paint(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = rng(20261022);
  const px = (m) => (m / WADI_RECT.w) * size; // metres → pixels (x and z scales are close enough)
  const toPx = (x, z) => [((x - WADI_RECT.x) / WADI_RECT.w) * size, ((z - WADI_RECT.z) / WADI_RECT.d) * size];

  // Soft patches: cooler grey-brown and warmer rose, like uneven pigment on the plain
  for (let i = 0; i < 40; i++) {
    const [cx, cy] = [random() * size, random() * size];
    const r = px(80 + random() * 260);
    const cool = random() < 0.65;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, cool ? 'rgba(150,140,140,0.32)' : 'rgba(205,160,160,0.22)');
    g.addColorStop(1, 'rgba(150,140,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Riverbeds: start at the foot of the cliff and wander away from it (−z), branching as they go.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const channels = [];
  for (let i = 0; i < 24; i++) {
    const [x0, y0] = toPx(WADI_RECT.x + 300 + random() * (WADI_RECT.w - 600), -60 - random() * 80);
    channels.push({ x: x0, y: y0, angle: -Math.PI / 2 + (random() - 0.5) * 0.6, width: px(24 + random() * 18), steps: 90 + random() * 80, depth: 0 });
  }
  while (channels.length) {
    const c = channels.pop();
    const stepLen = px(14);
    const points = [[c.x, c.y]];
    let { x, y, angle, width } = c;
    for (let s = 0; s < c.steps; s++) {
      angle += (random() - 0.5) * 0.45;
      angle += (-Math.PI / 2 - angle) * 0.04; // keep heading away from the cliff
      x += Math.cos(angle) * stepLen;
      y += Math.sin(angle) * stepLen;
      points.push([x, y]);
      if (c.depth < 3 && random() < 0.06) {
        channels.push({ x, y, angle: angle + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.5), width: width * 0.6, steps: c.steps * 0.45, depth: c.depth + 1 });
      }
      width *= 1.003; // channels widen downstream
      width *= 0.92 + random() * 0.16; // and their width wanders
    }
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (const [px2, py2] of points) ctx.lineTo(px2, py2);
    };
    // Watercolour stroke: a faint darker edge, then the pale sandy bed
    path();
    ctx.strokeStyle = 'rgba(140,115,118,0.22)';
    ctx.lineWidth = width * 1.9;
    ctx.stroke();
    path();
    ctx.strokeStyle = 'rgba(226,206,196,0.5)';
    ctx.lineWidth = width;
    ctx.stroke();
  }
  return canvas;
}

export function wadiTexture() {
  if (!texture) {
    const t0 = performance.now();
    texture = new THREE.CanvasTexture(paint(quality.wadiSize));
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 8;
    console.info(`[wadi] ${quality.wadiSize}² painted in ${Math.round(performance.now() - t0)} ms`);
  }
  return texture;
}
