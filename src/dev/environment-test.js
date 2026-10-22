// Dev test (step 1.4): a flat sand ground, pillars at increasing distances to see the fog, and a few
// flat-shaded shapes to see the sun + sky lighting. Removed when the terrain exists (step 1.5).
import { FOG } from '../world-config.js';

const DISTANCES = [15, 40, 80, 150, 250, 400, 600];

function add(scene, tag, attrs) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  scene.appendChild(el);
  return el;
}

export function runEnvironmentTest() {
  const scene = document.querySelector('a-scene');
  const flat = 'flatShading: true; roughness: 1; metalness: 0';

  add(scene, 'a-plane', {
    rotation: '-90 0 0',
    width: 3000,
    height: 3000,
    material: `color: #D9B48F; ${flat}`,
  });

  // Pillars toward the sun (ahead) and to the left, getting further away: they should fade into the fog.
  DISTANCES.forEach((d, i) => {
    const h = 6 + d * 0.04;
    add(scene, 'a-box', {
      position: `${-6 - i * 4} ${h / 2} ${-d}`,
      width: 3, depth: 3, height: h,
      material: `color: #C9767A; ${flat}`,
    });
    add(scene, 'a-box', {
      position: `${-d} ${h / 2} ${-4}`,
      width: 3, depth: 3, height: h,
      material: `color: #A86A5A; ${flat}`,
    });
  });

  // Shapes near the spawn to judge the lighting (lit side toward the sun, soft sky light on the rest)
  add(scene, 'a-dodecahedron', { position: '4 1 -6', radius: 1, material: `color: #E8C6A6; ${flat}` });
  add(scene, 'a-cone', { position: '6.5 1.2 -8', 'radius-bottom': 1.2, 'radius-top': 0, height: 2.4, material: `color: #C9767A; ${flat}` });
  add(scene, 'a-box', { position: '-4 0.75 -7', width: 1.5, height: 1.5, depth: 1.5, rotation: '0 30 0', material: `color: #B08AA8; ${flat}` });

  console.info(`[dev] fog linear ${FOG.near}–${FOG.far} m; pillars at ${DISTANCES.join(', ')} m`);
}
