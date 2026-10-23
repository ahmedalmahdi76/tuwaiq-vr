// Touch devices: a semi-transparent joystick bottom-left to walk. Looking around is A-Frame's
// look-controls (drag anywhere else on the canvas; tilt when the gyroscope is allowed).
// The joystick feeds player-move's analog input: x = right, y = forward, both −1…1.

const RADIUS = 52; // px: how far the knob can move from the centre

export function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function setupTouchControls() {
  if (!isTouchDevice()) return;
  const rig = document.querySelector('#rig');
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
    const t = e.changedTouches[0];
    id = t.identifier;
    const r = base.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    set(t.clientX - cx, t.clientY - cy);
  }, { passive: false });

  const move = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === id) {
        e.preventDefault();
        set(t.clientX - cx, t.clientY - cy);
      }
    }
  };
  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === id) {
        id = null;
        set(0, 0);
      }
    }
  };
  base.addEventListener('touchmove', move, { passive: false });
  base.addEventListener('touchend', end);
  base.addEventListener('touchcancel', end);
}
