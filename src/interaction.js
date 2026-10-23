// Clicking 3D buttons on desktop and phone, without A-Frame's cursor.
//   - pointer unlocked: the ray follows the mouse
//   - pointer locked: the ray goes through the screen centre, shown by a small dot crosshair
//   - touch: a short tap without dragging clicks what is under the finger
// A mousedown on a button is captured before look-controls sees it, so clicking a button never
// starts pointer lock or a drag. Buttons register a hit mesh with registerClickable().
// (VR controller rays come in F.14 and will call the same onClick.)
import AFRAME from 'aframe';
import * as THREE from 'three';

const clickables = new Set();
const MAX_DISTANCE = 12;

/** mesh.userData: { onClick(), onHover(bool) }. Returns an unregister function. */
export function registerClickable(mesh, handlers) {
  Object.assign(mesh.userData, handlers);
  clickables.add(mesh);
  return () => clickables.delete(mesh);
}

const raycaster = new THREE.Raycaster();
raycaster.far = MAX_DISTANCE;
const ndc = new THREE.Vector2();

AFRAME.registerComponent('click-input', {
  init() {
    this.mouse = null; // last mouse position in NDC (unlocked mode)
    this.hovered = null;
    this.locked = false;

    this.dot = document.createElement('div');
    this.dot.className = 'crosshair';
    this.dot.hidden = true;
    document.body.appendChild(this.dot);

    const canvasReady = () => {
      this.canvas = this.el.canvas;
      this.canvas.addEventListener('mousemove', this.onMouseMove);
      this.canvas.addEventListener('mouseleave', this.onMouseLeave);
      this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: true });
      this.canvas.addEventListener('touchend', this.onTouchEnd);
    };
    this.onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 };
    };
    this.onMouseLeave = () => {
      this.mouse = null;
    };
    // Capture phase on window: runs before look-controls' listener on the canvas
    this.onMouseDown = (e) => {
      if (e.button !== 0 || e.target !== this.canvas || !this.hovered) return;
      e.stopPropagation();
      e.preventDefault();
      this.hovered.userData.onClick?.();
    };
    this.onTouchStart = (e) => {
      const t = e.touches[0];
      this.touch = t ? { x: t.clientX, y: t.clientY, time: performance.now() } : null;
    };
    this.onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      if (!this.touch || !t) return;
      const moved = Math.hypot(t.clientX - this.touch.x, t.clientY - this.touch.y);
      if (moved > 12 || performance.now() - this.touch.time > 500) return;
      const r = this.canvas.getBoundingClientRect();
      const hit = this.pick({ x: ((t.clientX - r.left) / r.width) * 2 - 1, y: -((t.clientY - r.top) / r.height) * 2 + 1 });
      if (hit) {
        e.preventDefault();
        hit.userData.onClick?.();
      }
    };
    this.onLockChange = () => {
      this.locked = document.pointerLockElement === this.canvas;
      this.dot.hidden = !this.locked;
    };

    if (this.el.canvas) canvasReady();
    else this.el.addEventListener('renderstart', canvasReady, { once: true });
    window.addEventListener('mousedown', this.onMouseDown, true);
    document.addEventListener('pointerlockchange', this.onLockChange);
  },

  pick(point) {
    const camera = this.el.camera;
    if (!camera || !clickables.size) return null;
    ndc.set(point.x, point.y);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([...clickables].filter((m) => m.visible && isShown(m)), false);
    return hits.length ? hits[0].object : null;
  },

  tick() {
    const point = this.locked ? { x: 0, y: 0 } : this.mouse;
    const hit = point ? this.pick(point) : null;
    if (hit === this.hovered) return;
    this.hovered?.userData.onHover?.(false);
    hit?.userData.onHover?.(true);
    this.hovered = hit;
    if (this.canvas) this.canvas.style.cursor = hit && !this.locked ? 'pointer' : '';
    this.dot.classList.toggle('crosshair-hot', !!hit);
  },

  remove() {
    window.removeEventListener('mousedown', this.onMouseDown, true);
    document.removeEventListener('pointerlockchange', this.onLockChange);
    this.dot.remove();
  },
});

/** True if the mesh and all its parents are visible. */
function isShown(obj) {
  for (let o = obj; o; o = o.parent) if (!o.visible) return false;
  return true;
}
