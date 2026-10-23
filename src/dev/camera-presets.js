// Dev only: jump to preset viewpoints. URL ?cam=edge|aerial|below|trail, keys 1–5.
// Key 1 / spawn = walking at the start of the trail; the others switch to the fly camera
// (F toggles back to walking). The normal start position is handled by player-move.
import { PLAIN_Y, edgeZ, plateauHeight } from '../terrain.js';
import { TRAIL_START } from '../trail.js';
import { DEV } from './dev-mode.js';

function presets() {
  const hx = 140; // a headland
  return {
    // Spawn on the trail, looking along it toward station 1
    spawn: { walk: true, pos: [TRAIL_START.x, 0, TRAIL_START.z], yaw: TRAIL_START.lookYaw, pitch: -0.05 },
    // On the tip of a headland, looking back along the layered cliff face
    edge: { pos: [hx, plateauHeight(hx, edgeZ(hx) + 2), edgeZ(hx) + 2], yaw: 1.25, pitch: -0.3 },
    // High above the plateau, looking out over the rim and the plain
    aerial: { pos: [120, 90, 220], yaw: 0.2, pitch: -0.35 },
    // Down on the plain, looking up at the escarpment
    below: { pos: [60, PLAIN_Y + 1, -420], yaw: Math.PI, pitch: 0.18 },
    // High above the start, looking along the whole trail toward the lookout
    trail: { pos: [-100, 55, 90], yaw: -1.3, pitch: -0.42 },
  };
}

export function setupCameraPresets() {
  const scene = document.querySelector('a-scene');
  const rig = document.querySelector('#rig');
  const all = presets();

  const go = (name) => {
    const p = all[name];
    const mover = rig.components['player-move'];
    if (!p || !mover) return;
    if (p.walk) {
      mover.teleport(p.pos[0], p.pos[2], p.yaw);
    } else {
      mover.setMode('fly');
      rig.object3D.position.set(...p.pos);
      mover.look(p.yaw, p.pitch);
    }
  };

  const cam = new URLSearchParams(location.search).get('cam');
  if (cam) {
    // after player-move has placed the player
    const start = () => setTimeout(() => go(cam), 0);
    if (scene.hasLoaded) start();
    else scene.addEventListener('loaded', start, { once: true });
  }

  const keys = { Digit1: 'spawn', Digit2: 'edge', Digit3: 'aerial', Digit4: 'below', Digit5: 'trail' };
  if (DEV) window.addEventListener('keydown', (e) => keys[e.code] && go(keys[e.code]));
}
