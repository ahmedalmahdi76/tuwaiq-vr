// The one shared watercolour-paper texture (brief §11), generated once in code, tiles seamlessly.
//   R = fine paper grain (cold-press bumps + a few fibres)
//   G = soft watercolour washes with faint darker "tide lines" where pigment dried at the edges
// Used by the terrain, the sky and (later) the panels.
import * as THREE from 'three';
import { tileFbm, tileNoise2, smoothstep } from './noise.js';
import { quality } from './quality.js';

let texture = null;

// The washes are smooth, so they're computed on a 4× coarser grid and interpolated (much faster).
function washGrid(n) {
  const grid = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) grid[y * n + x] = tileFbm((x / n) * 3, (y / n) * 3, 3, 4, 107);
  }
  return (fx, fy) => {
    // bilinear, wrapping
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const at = (x, y) => grid[((y + n) % n) * n + ((x + n) % n)];
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
    return top + (bottom - top) * ty;
  };
}

function generate(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const coarse = size / 4;
  const washAt = washGrid(coarse);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      // Grain: bumpy cold-press paper plus faint stretched fibres
      const bumps = tileFbm(u * 48, v * 48, 48, 3, 101);
      const fibres = tileNoise2(u * 96, v * 12, 96, 103) * tileNoise2(u * 12, v * 96, 12, 104);
      const grain = 0.5 + 0.38 * bumps + 0.12 * fibres;
      // Washes: large soft areas, with a soft slightly darker rim where a wash ends
      const wash = washAt(x / 4, y / 4);
      const tide = 1 - smoothstep(0, 0.14, Math.abs(wash - 0.08));
      const bloom = 0.55 + 0.35 * wash - 0.1 * tide;
      const k = (y * size + x) * 4;
      d[k] = Math.max(0, Math.min(255, grain * 255));
      d[k + 1] = Math.max(0, Math.min(255, bloom * 255));
      d[k + 2] = 0;
      d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** The shared paper texture (linear data, repeat-wrapped, mipmapped). Created on first use. */
export function paperTexture() {
  if (!texture) {
    const t0 = performance.now();
    texture = new THREE.CanvasTexture(generate(quality.paperSize));
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace; // data, not colour
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.anisotropy = 4;
    console.info(`[paper] ${quality.paperSize}² generated in ${Math.round(performance.now() - t0)} ms`);
  }
  return texture;
}
