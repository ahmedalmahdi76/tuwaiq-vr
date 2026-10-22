// Dev only (step 1.5, until movement exists in 1.7): place the fly camera at the spawn or at a
// preset viewpoint. URL: ?cam=spawn|edge|aerial|below. Keys 1–4 switch on desktop.
import { PLAIN_Y, edgeZ, plateauHeight, spawnPoint } from '../terrain.js';

function presets() {
  const s = spawnPoint();
  const hx = 140; // a headland
  return {
    spawn: { pos: [s.x, s.y, s.z], yaw: 0, pitch: -0.05 },
    // On the tip of a headland, looking back along the layered cliff face
    edge: { pos: [hx, plateauHeight(hx, edgeZ(hx) + 2), edgeZ(hx) + 2], yaw: 1.25, pitch: -0.3 },
    // High above the plateau, looking out over the rim and the plain
    aerial: { pos: [120, 90, 220], yaw: 0.2, pitch: -0.35 },
    // Down on the plain, looking up at the escarpment
    below: { pos: [60, PLAIN_Y + 1, -420], yaw: Math.PI, pitch: 0.18 },
  };
}

export function setupCameraPresets() {
  const scene = document.querySelector('a-scene');
  const rig = document.querySelector('#rig');
  const camera = document.querySelector('[camera]');
  const all = presets();

  const go = (name) => {
    const p = all[name];
    if (!p) return;
    rig.object3D.position.set(...p.pos);
    camera.object3D.position.set(0, 1.6, 0);
    const lc = camera.components['look-controls'];
    lc.yawObject.rotation.y = p.yaw;
    lc.pitchObject.rotation.x = p.pitch;
  };

  const start = () => go(new URLSearchParams(location.search).get('cam') || 'spawn');
  if (scene.hasLoaded) start();
  else scene.addEventListener('loaded', start);

  const keys = { Digit1: 'spawn', Digit2: 'edge', Digit3: 'aerial', Digit4: 'below' };
  window.addEventListener('keydown', (e) => keys[e.code] && go(keys[e.code]));
}
