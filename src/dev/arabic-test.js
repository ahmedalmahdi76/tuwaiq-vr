// Dev test scene (steps 1.2–1.3b): real content from content.js as 3D text next to a plain HTML
// reference, a math-text sample, a three.js instance check and live text-texture memory.
// Removed when the real start area is built (step 1.11).
import AFRAME from 'aframe';
import * as THREE from 'three';
import { Text } from 'troika-three-text';
import { INTRO, STATIONS, UI, TITLE, WELCOME, AUTHOR_CREDIT, MOVE_HINTS } from '../content.js';
import { arabicFontsReady } from '../fonts.js';
import { measureTextBlock, textTextureStats } from '../text-canvas.js';

// Every word in the content that carries a mark (tanween, shadda, fatha, damma, kasra, sukun),
// in order of first appearance.
const MARKS = /[ً-ْ]/;
function markedWords() {
  const all = [
    TITLE, WELCOME, AUTHOR_CREDIT, INTRO.tuwaiq.text, INTRO.functions.text,
    ...STATIONS.flatMap((s) => [s.name, s.subtitle, s.math, s.life, s.quote]),
    ...Object.values(UI), ...Object.values(MOVE_HINTS),
  ].join(' ');
  const words = all.split(/\s+/).map((w) => w.replace(/[«»،.؛:()؟]/g, '')).filter((w) => MARKS.test(w));
  return [...new Set(words)];
}

const BOARDS = [
  {
    id: 'tuwaiq',
    position: '2.7 1.6 -2.2',
    rotation: '0 -40 0',
    lines: [
      { value: INTRO.tuwaiq.title, fontSize: 0.16, weight: 'bold' },
      { value: INTRO.tuwaiq.text, fontSize: 0.1 },
    ],
  },
  {
    id: 'marks',
    position: '0 1.6 -3',
    rotation: '0 0 0',
    lines: [
      { value: 'كلمات فيها تنوين وشدّة وحركات', fontSize: 0.1, weight: 'bold' },
      { value: markedWords().join('   '), fontSize: 0.12 },
    ],
    math: STATIONS[5].formula, // station 6 (aˣ); Fira Sans has no subscript ₐ for station 5, see CLAUDE.md
  },
  {
    id: 'functions',
    position: '-2.7 1.6 -2.2',
    rotation: '0 40 0',
    lines: [
      { value: INTRO.functions.title, fontSize: 0.16, weight: 'bold' },
      { value: INTRO.functions.text, fontSize: 0.09 },
    ],
  },
];
const BOARD_W = 2.4;
const BOARD_H = 1.9;
const PAD = 0.12;

// Rough station panel layout (the real one is designed in step 2.3), only for the memory estimate.
const PANEL_ESTIMATE = { maxWidth: 1.3, name: 0.12, subtitle: 0.08, body: 0.055, quote: 0.06 };

function threeCheck() {
  const sameModule = AFRAME.THREE.Mesh === THREE.Mesh;
  const troikaIsAframeMesh = new Text() instanceof AFRAME.THREE.Mesh;
  return {
    ok: sameModule && troikaIsAframeMesh,
    detail: `three r${THREE.REVISION} · A-Frame r${AFRAME.THREE.REVISION} · troika Text instanceof AFRAME.THREE.Mesh: ${troikaIsAframeMesh}`,
  };
}

function build3D(scene) {
  for (const board of BOARDS) {
    const root = document.createElement('a-entity');
    root.setAttribute('position', board.position);
    root.setAttribute('rotation', board.rotation);

    const plane = document.createElement('a-plane');
    plane.setAttribute('width', BOARD_W);
    plane.setAttribute('height', BOARD_H);
    plane.setAttribute('color', '#F6E3EA');
    plane.setAttribute('position', '0 0 -0.01');
    root.appendChild(plane);

    let y = BOARD_H / 2 - PAD;
    board.lines.forEach((line, i) => {
      const el = document.createElement('a-entity');
      el.setAttribute('position', `${BOARD_W / 2 - PAD} ${y} 0`);
      el.setAttribute('arabic-text', { ...line, maxWidth: BOARD_W - 2 * PAD, anchorX: 'right', anchorY: 'top' });
      y -= i === 0 ? line.fontSize * 1.8 : 0;
      el.addEventListener('textsync', (e) => {
        console.info(`[dev] ${board.id} line ${i + 1} ready (${e.detail.width.toFixed(2)} × ${e.detail.height.toFixed(2)} m)`);
      });
      root.appendChild(el);
    });

    if (board.math) {
      const el = document.createElement('a-entity');
      el.setAttribute('position', `0 ${-BOARD_H / 2 - 0.08} 0`);
      el.setAttribute('math-text', { value: board.math, fontSize: 0.1, anchorY: 'top' });
      root.appendChild(el);
    }
    scene.appendChild(root);
  }
}

const MB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

function stationPanelEstimate() {
  const e = PANEL_ESTIMATE;
  const base = { color: '#3B1F2B', maxWidth: e.maxWidth, align: 'right', direction: 'rtl', lineHeight: 1.5, weight: 'regular' };
  const perStation = STATIONS.map((s) =>
    [
      { ...base, value: s.name, fontSize: e.name, weight: 'bold' },
      { ...base, value: s.subtitle, fontSize: e.subtitle },
      { ...base, value: s.math, fontSize: e.body },
      { ...base, value: s.life, fontSize: e.body },
      { ...base, value: s.quote, fontSize: e.quote },
    ].reduce((sum, p) => sum + measureTextBlock(p).bytes, 0),
  );
  const all = perStation.reduce((a, b) => a + b, 0);
  return { all, max: Math.max(...perStation) };
}

function buildHtmlReference(check) {
  const box = document.createElement('div');
  box.className = 'dev-reference';
  box.innerHTML = `<h2>مرجع HTML</h2>`;
  for (const board of BOARDS) {
    for (const line of board.lines) {
      const p = document.createElement('p');
      p.textContent = line.value;
      p.style.whiteSpace = 'pre-line';
      if (line.weight === 'bold') p.style.fontWeight = '700';
      box.appendChild(p);
    }
    box.appendChild(document.createElement('hr'));
  }
  const status = document.createElement('p');
  status.className = check.ok ? 'dev-ok' : 'dev-fail';
  status.dir = 'ltr';
  status.textContent = `${check.ok ? '✔ one three.js' : '✘ two three.js copies'} — ${check.detail}`;
  box.appendChild(status);

  const mem = document.createElement('p');
  mem.className = 'dev-ok';
  mem.dir = 'ltr';
  box.appendChild(mem);
  arabicFontsReady().then(() => {
    const est = stationPanelEstimate();
    const update = () => {
      const s = textTextureStats();
      mem.textContent =
        `Arabic text textures now: ${s.count} · ${MB(s.bytes)} MB | ` +
        `est. station panels: all 10 = ${MB(est.all)} MB, largest one = ${MB(est.max)} MB`;
    };
    update();
    setInterval(update, 1000);
  });
  document.body.appendChild(box);
}

export function runArabicTest() {
  const scene = document.querySelector('a-scene');
  build3D(scene);
  const check = threeCheck();
  console.info('[dev]', check.detail);
  buildHtmlReference(check);
}
