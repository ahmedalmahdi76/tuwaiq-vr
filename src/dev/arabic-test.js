// Step 1.2 test: the same Arabic lines as 3D text (troika) and as plain HTML, side by side,
// plus a check that troika and A-Frame share one three.js. Removed when the real start area exists.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { Text } from 'troika-three-text';

// y = top edge of each block on the test board
const LINES = [
  { value: 'حين تتحدث الدوال بلغة المشاعر', fontSize: 0.2, weight: 'bold', y: 2.5 },
  {
    value: '«مو كل طريق نقدر نسلكه، ومو كل حد يمنعنا من التقدّم؛ أحيانًا معرفة حدودنا هي بداية اختيار الطريق الصحيح.»',
    fontSize: 0.13,
    y: 2.15,
  },
  { value: 'زرت ٣ من ١٠ محطات', fontSize: 0.15, y: 1.45 },
  { value: 'الدالة الخطية: f(x) = mx + b', fontSize: 0.15, y: 1.15 },
];

function threeCheck() {
  const sameModule = AFRAME.THREE.Mesh === THREE.Mesh;
  const troikaIsAframeMesh = new Text() instanceof AFRAME.THREE.Mesh;
  return {
    ok: sameModule && troikaIsAframeMesh,
    detail: `three r${THREE.REVISION} · A-Frame r${AFRAME.THREE.REVISION} · troika Text instanceof AFRAME.THREE.Mesh: ${troikaIsAframeMesh}`,
  };
}

function build3D(scene) {
  const board = document.createElement('a-plane');
  board.setAttribute('position', '0 1.8 -3.05');
  board.setAttribute('width', 3.2);
  board.setAttribute('height', 1.9);
  board.setAttribute('color', '#F6E3EA');
  scene.appendChild(board);

  LINES.forEach(({ y, ...line }, i) => {
    const el = document.createElement('a-entity');
    // anchor at the board's right edge so every line is right-aligned like the HTML reference
    el.setAttribute('position', `1.45 ${y} -3`);
    el.setAttribute('arabic-text', { ...line, maxWidth: 2.9, anchorX: 'right', anchorY: 'top' });
    el.addEventListener('textsync', () => console.info(`[step 1.2] 3D line ${i + 1} ready`));
    scene.appendChild(el);
  });
}

function buildHtmlReference(check) {
  const box = document.createElement('div');
  box.className = 'dev-reference';
  box.innerHTML = `<h2>مرجع HTML</h2>`;
  for (const line of LINES) {
    const p = document.createElement('p');
    p.textContent = line.value;
    if (line.weight === 'bold') p.style.fontWeight = '700';
    box.appendChild(p);
  }
  const status = document.createElement('p');
  status.className = check.ok ? 'dev-ok' : 'dev-fail';
  status.dir = 'ltr';
  status.textContent = `${check.ok ? '✔ one three.js' : '✘ two three.js copies'} — ${check.detail}`;
  box.appendChild(status);
  document.body.appendChild(box);
}

export function runArabicTest() {
  const scene = document.querySelector('a-scene');
  build3D(scene);
  const check = threeCheck();
  console.info('[step 1.2]', check.detail);
  buildHtmlReference(check);
}
