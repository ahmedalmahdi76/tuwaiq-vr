// Touch devices:
//   - joystick bottom-left to walk (feeds player-move's analog input: x = right, y = forward, −1…1)
//   - swipe-to-look: one finger dragging anywhere else turns the view (≈180° per screen width) and
//     tilts it up/down (pitch limited to ±60°), with light smoothing. Works with or without the
//     gyroscope: the swipe turns the base direction and A-Frame adds the phone's tilt on top.
//   - turn buttons ↺ ↻ (bottom-right): 30° per tap, a short smooth turn.
// Each finger is tracked by its identifier, so walking and looking work at the same time.
// A-Frame's own touch-look (yaw only, single finger) is switched off on the camera.

const RADIUS = 52; // px: how far the joystick knob can move from the centre
const PITCH_LIMIT = (60 * Math.PI) / 180;
const SMOOTH = 0.35; // share of the pending turn applied per frame
const TURN_STEP = (30 * Math.PI) / 180;

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function lookControls() {
  return document.querySelector('[camera]')?.components['look-controls'];
}

// Pending rotation, applied a little each frame (smoothing for swipes, easing for the buttons)
const pending = { yaw: 0, pitch: 0 };

function applyPending() {
  const lc = lookControls();
  if (lc && (Math.abs(pending.yaw) > 1e-5 || Math.abs(pending.pitch) > 1e-5)) {
    const dy = pending.yaw * SMOOTH;
    const dp = pending.pitch * SMOOTH;
    pending.yaw -= dy;
    pending.pitch -= dp;
    lc.yawObject.rotation.y += dy;
    const p = lc.pitchObject.rotation.x + dp;
    lc.pitchObject.rotation.x = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p));
  }
  requestAnimationFrame(applyPending);
}

function setupJoystick(rig) {
  const base = document.createElement('div');
  base.className = 'joystick';
  base.innerHTML = '<div class="joystick-knob"></div>';
  document.body.appendChild(base);
  const knob = base.firstElementChild;

  let id = null;
  let cx = 0;
  let cy = 0;
  const set = (dx, dy) => {
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const mover = rig.components['player-move'];
    if (mover) mover.analog = { x: dx / RADIUS, y: -dy / RADIUS };
  };

  base.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (id !== null) return;
    const t = e.changedTouches[0];
    id = t.identifier;
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    set(t.clientX - cx, t.clientY - cy);
  }, { passive: false });
  // Listen on window: the finger may slide off the joystick while walking
  window.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === id) set(t.clientX - cx, t.clientY - cy);
  }, { passive: true });
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === id) {
        id = null;
        set(0, 0);
      }
    }
  };
  window.addEventListener('touchend', end);
  window.addEventListener('touchcancel', end);
}

function setupSwipeLook(canvas) {
  let id = null;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (id !== null) return;
    const t = e.changedTouches[0];
    id = t.identifier;
    lastX = t.clientX;
    lastY = t.clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== id) continue;
      e.preventDefault(); // no page scrolling / bounce on iOS
      const perPx = Math.PI / window.innerWidth; // 180° for a full screen-width swipe
      pending.yaw += (t.clientX - lastX) * perPx; // drag the world: finger right → look left
      pending.pitch += (t.clientY - lastY) * perPx;
      lastX = t.clientX;
      lastY = t.clientY;
    }
  }, { passive: false });
  const end = (e) => {
    for (const t of e.changedTouches) if (t.identifier === id) id = null;
  };
  canvas.addEventListener('touchend', end);
  canvas.addEventListener('touchcancel', end);
}

function setupTurnButtons() {
  const bar = document.createElement('div');
  bar.className = 'turn-buttons';
  bar.dir = 'ltr';
  for (const [symbol, dir, label] of [['↺', 1, 'left'], ['↻', -1, 'right']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = symbol;
    b.dataset.dir = label;
    b.addEventListener('click', () => {
      pending.yaw += dir * TURN_STEP;
    });
    bar.appendChild(b);
  }
  document.body.appendChild(bar);
}

export function setupTouchControls() {
  if (!isTouchDevice()) return;
  const scene = document.querySelector('a-scene');
  const rig = document.querySelector('#rig');
  // Replace A-Frame's single-finger, yaw-only touch-look with ours
  document.querySelector('[camera]').setAttribute('look-controls', 'touchEnabled', false);
  setupJoystick(rig);
  setupTurnButtons();
  const withCanvas = () => setupSwipeLook(scene.canvas);
  if (scene.canvas) withCanvas();
  else scene.addEventListener('renderstart', withCanvas, { once: true });
  requestAnimationFrame(applyPending);
}
