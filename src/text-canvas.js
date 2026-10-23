// Draws Arabic text blocks on a 2D canvas (the browser does the shaping, so every mark lands
// where it does in HTML) and turns them into textures. Textures are shared through a cache keyed
// by everything that affects the drawing, and freed when the last user releases them.
import * as THREE from 'three';
import { ARABIC_FAMILY } from './fonts.js';
import { quality } from './quality.js';

// Resolution: 1024 px per metre. A Quest-class headset shows ~20 px per degree; at 1 m a metre spans
// ~53°, i.e. ~1060 screen px, so text stays sharp down to about 1 m (closer than normal reading).
// Phones use less (quality.textPxPerM: 640 / 768 / 1024) to keep texture memory low on iPhone Safari.
export const PX_PER_M = quality.textPxPerM;
// Big text (titles) doesn't need 1024 px/m: cap the em size so its textures stay small.
const MAX_EM_PX = 128;
// Largest texture side. Blocks that would be bigger are drawn at a lower px/m.
const MAX_TEX = 2048;
// Padding around the text block, in em, so marks and descenders are never clipped.
const PAD_EM = 0.12;

const cache = new Map(); // key -> entry
let measureCtx = null;

function ctx2d() {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  return measureCtx;
}

function fontCss(weight, px) {
  return `${weight === 'bold' ? 700 : 400} ${px}px ${ARABIC_FAMILY}`;
}

export function textKey(p) {
  return JSON.stringify([p.value, p.fontSize, p.color, p.maxWidth, p.align, p.direction, p.weight, p.lineHeight]);
}

/** Greedy word wrap. Each candidate line is measured whole so shaping across words is respected. */
function wrap(ctx, text, maxPx) {
  const lines = [];
  for (const para of text.split('\n')) {
    if (para.trim() === '') { lines.push(''); continue; }
    let line = '';
    for (const word of para.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxPx) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Line layout and canvas size (in px) for a block at a given px/m scale. */
function layout(p, scale) {
  const ctx = ctx2d();
  const emPx = p.fontSize * scale;
  ctx.font = fontCss(p.weight, emPx);
  ctx.direction = p.direction;
  const maxPx = Number.isFinite(p.maxWidth) ? p.maxWidth * scale : Infinity;
  const lines = wrap(ctx, p.value, maxPx);
  const metrics = lines.map((l) => ctx.measureText(l || ' '));
  const first = metrics[0];
  const last = metrics[metrics.length - 1];
  const ascent = Math.max(first.fontBoundingBoxAscent ?? emPx * 0.9, first.actualBoundingBoxAscent);
  const descent = Math.max(last.fontBoundingBoxDescent ?? emPx * 0.3, last.actualBoundingBoxDescent);
  const advance = p.lineHeight * emPx;
  const pad = Math.ceil(PAD_EM * emPx);
  const textW = Math.max(...metrics.map((m) => m.width));
  return {
    lines,
    emPx,
    ascent,
    advance,
    pad,
    wPx: Math.ceil(textW + 2 * pad),
    hPx: Math.ceil(ascent + advance * (lines.length - 1) + descent + 2 * pad),
    scale,
  };
}

function fitLayout(p) {
  let scale = Math.min(PX_PER_M, MAX_EM_PX / p.fontSize);
  let L = layout(p, scale);
  const over = Math.max(L.wPx, L.hPx) / MAX_TEX;
  if (over > 1) {
    scale = Math.floor((scale / over) * 0.98);
    L = layout(p, scale);
  }
  return L;
}

function bytesFor(wPx, hPx) {
  return wPx * hPx * 4 * (4 / 3); // RGBA8 + full mipmap chain
}

/** Size a block would take, without drawing it (used for memory estimates). */
export function measureTextBlock(p) {
  const L = fitLayout(p);
  return { wPx: L.wPx, hPx: L.hPx, bytes: bytesFor(L.wPx, L.hPx) };
}

function paint(p, L) {
  const canvas = document.createElement('canvas');
  canvas.width = L.wPx;
  canvas.height = L.hPx;
  canvas.dir = p.direction;
  const ctx = canvas.getContext('2d');
  ctx.font = fontCss(p.weight, L.emPx);
  ctx.direction = p.direction;
  ctx.fillStyle = p.color;
  ctx.textBaseline = 'alphabetic';
  const align = p.align === 'left' || p.align === 'center' ? p.align : 'right';
  ctx.textAlign = align;
  const x = align === 'right' ? L.wPx - L.pad : align === 'left' ? L.pad : L.wPx / 2;
  L.lines.forEach((line, i) => {
    if (line) ctx.fillText(line, x, L.pad + L.ascent + i * L.advance);
  });
  return canvas;
}

/**
 * Get (or create) the texture for a block. Each acquire must be paired with release(key).
 * Returns { texture, width, height, pad } with sizes in metres.
 */
export function acquire(p, key, anisotropy) {
  let entry = cache.get(key);
  if (!entry) {
    const L = fitLayout(p);
    const canvas = paint(p, L);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = anisotropy;
    texture.premultiplyAlpha = true; // no dark fringes at glyph edges in the mipmaps
    // Once uploaded to the GPU the canvas pixels aren't needed; shrink it to free CPU memory.
    texture.onUpdate = () => {
      canvas.width = 1;
      canvas.height = 1;
    };
    entry = {
      texture,
      width: L.wPx / L.scale,
      height: L.hPx / L.scale,
      pad: L.pad / L.scale,
      bytes: bytesFor(L.wPx, L.hPx),
      px: [L.wPx, L.hPx],
      refs: 0,
    };
    cache.set(key, entry);
  }
  entry.refs++;
  return entry;
}

export function release(key) {
  const entry = cache.get(key);
  if (!entry) return;
  entry.refs--;
  if (entry.refs <= 0) {
    entry.texture.dispose();
    cache.delete(key);
  }
}

/** Live totals for the dev panel / reports. */
export function textTextureStats() {
  let bytes = 0;
  for (const e of cache.values()) bytes += e.bytes;
  return { count: cache.size, bytes };
}
