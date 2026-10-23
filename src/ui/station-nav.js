// «المحطة السابقة» / «المحطة التالية» (all devices): glide the player along the trail to the previous
// / next station's standing spot. Someone who never touches the joystick can visit every station.
import { UI } from '../content.js';
import { STATIONS_ON_TRAIL, nearestS } from '../trail.js';

export function setupStationNav() {
  const rig = document.querySelector('#rig');
  const bar = document.createElement('div');
  bar.className = 'station-nav';
  // RTL: «السابقة» sits on the right, «التالية» on the left
  const prev = document.createElement('button');
  const next = document.createElement('button');
  prev.type = next.type = 'button';
  prev.textContent = UI.prevStation;
  next.textContent = UI.nextStation;
  bar.append(prev, next);
  document.body.appendChild(bar);

  const target = (dir) => {
    const p = rig.object3D.position;
    const s = nearestS(p.x, p.z);
    const stations = dir > 0 ? STATIONS_ON_TRAIL : [...STATIONS_ON_TRAIL].reverse();
    return stations.find((st) => (dir > 0 ? st.s > s + 1.5 : st.s < s - 1.5)) || null;
  };

  const go = (dir) => {
    const st = target(dir);
    if (st) rig.components['player-move']?.glideTo(st.trail.x, st.trail.z, st.lookYaw);
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));

  // Dim a button when there is nowhere to go
  setInterval(() => {
    prev.disabled = !target(-1);
    next.disabled = !target(1);
  }, 400);
}
