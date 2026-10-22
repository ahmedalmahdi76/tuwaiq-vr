// Dev FPS meter, shown with ?stats. Reads frame times from the scene's own tick, so it keeps working
// in immersive VR (where window.requestAnimationFrame stops). Tap / click it to cycle the quality
// level (reloads the page with ?quality=…).
import AFRAME from 'aframe';
import { quality, LEVELS } from '../quality.js';

AFRAME.registerComponent('fps-meter', {
  init() {
    this.box = document.createElement('div');
    this.box.className = 'dev-fps';
    this.box.dir = 'ltr';
    this.box.title = 'tap to change quality';
    this.box.addEventListener('click', () => {
      const next = LEVELS[(LEVELS.indexOf(quality.level) + 1) % LEVELS.length];
      const params = new URLSearchParams(location.search);
      params.set('quality', next);
      location.search = params.toString();
    });
    document.body.appendChild(this.box);
    this.frames = 0;
    this.worst = 0;
    this.windowStart = performance.now();
  },

  tick(time, delta) {
    this.frames++;
    if (delta > this.worst) this.worst = delta;
    const now = performance.now();
    const elapsed = now - this.windowStart;
    if (elapsed < 500) return;

    const fps = (this.frames * 1000) / elapsed;
    const info = this.el.renderer.info.render;
    const ratio = this.el.renderer.getPixelRatio();
    this.box.textContent =
      `${fps.toFixed(0)} fps · worst ${this.worst.toFixed(0)} ms\n` +
      `${Math.round(info.triangles / 1000)}k tris · ${info.calls} calls · px ${ratio}\n` +
      `quality ${quality.level} (${quality.source}, ${quality.device}) ⟳`;
    this.box.classList.toggle('dev-fps-slow', fps < 30);
    this.frames = 0;
    this.worst = 0;
    this.windowStart = now;
  },

  remove() {
    this.box.remove();
  },
});

export function setupFpsMeter() {
  if (!new URLSearchParams(location.search).has('stats')) return;
  document.querySelector('a-scene').setAttribute('fps-meter', '');
}
