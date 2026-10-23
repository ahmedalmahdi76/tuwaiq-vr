// HTML start screen: title, credit and «ابدأ الرحلة». The button is the first user gesture, so it
// unlocks sound and, on iPhone/iPad, asks for motion-sensor permission (tilt-to-look). If permission
// is denied or unavailable, touch drag and the joystick still work.
import { TITLE, AUTHOR_CREDIT, UI } from '../content.js';

async function requestMotionPermission(scene) {
  const DOE = window.DeviceOrientationEvent;
  if (!DOE || typeof DOE.requestPermission !== 'function') return; // Android / desktop: nothing to ask
  try {
    const result = await DOE.requestPermission();
    if (result === 'granted') scene.emit('deviceorientationpermissiongranted');
  } catch {
    // denied or unsupported: touch controls still work
  }
}

export function setupStartScreen() {
  const scene = document.querySelector('a-scene');
  const overlay = document.createElement('div');
  overlay.className = 'start-screen';
  overlay.innerHTML = `
    <div class="start-card">
      <h1 class="start-title"></h1>
      <p class="start-credit"></p>
      <button type="button" class="start-button"></button>
    </div>`;
  overlay.querySelector('.start-title').textContent = TITLE;
  overlay.querySelector('.start-credit').textContent = AUTHOR_CREDIT;
  const button = overlay.querySelector('.start-button');
  button.textContent = UI.start;
  document.body.appendChild(overlay);
  document.body.classList.add('not-started');

  button.addEventListener('click', () => {
    // Must run inside the click handler (iOS only allows the permission prompt from a gesture)
    requestMotionPermission(scene);
    overlay.classList.add('start-hidden');
    document.body.classList.remove('not-started');
    setTimeout(() => overlay.remove(), 700);
    scene.emit('journeystart');
  });
}
