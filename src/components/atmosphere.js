// <a-scene atmosphere> — the calm magic in the air (brief §11 goal 6), following the journey clock:
//   motes:  golden dust in the sunlight at sunset → softly pulsing fireflies at night.
//           One THREE.Points, animated entirely in the vertex shader (no per-particle JS). The field
//           wraps around the player, and motes fade out near the eyes so they never cover a panel.
//   clouds: a few soft watercolour clouds far away, coloured by the sky (gold/pink at sunset,
//           moonlit lavender at night). Painted once on a canvas, all merged into one draw call.
// Counts come from quality.js. Only uniforms change over time.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { rng } from '../noise.js';
import { quality } from '../quality.js';
import { sampleTime } from '../time-of-day.js';
import { SUN, MOON, skyDirection } from '../world-config.js';
import { paperTexture } from '../paper-texture.js';

// ---------- motes ----------

const MOTE_BOX = new THREE.Vector3(36, 9, 36); // field around the player (m)
const MOTE_NEAR_FADE = [2.5, 5.0]; // invisible closer than 2.5 m, full from 5 m: never over a panel

const moteVertex = /* glsl */ `
  attribute vec4 seed; // xyz: position in the box (0..1), w: personal random
  uniform vec3 uCam;
  uniform vec3 uBox;
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  uniform float uNight;
  uniform vec3 uSunDir;
  uniform vec2 uNearFade;
  varying float vAlpha;
  varying float vSeed;
  varying float vSun;

  void main() {
    float r = seed.w;
    // Slow drift (rising a little at sunset, wandering at night) plus a gentle personal sway
    vec3 drift = vec3(sin(r * 6.28) * 0.25, mix(0.12, 0.03, uNight), cos(r * 4.1) * 0.25) * (0.5 + r);
    vec3 sway = vec3(sin(uTime * 0.31 + r * 20.0), sin(uTime * 0.23 + r * 13.0) * 0.6, cos(uTime * 0.27 + r * 7.0)) * mix(0.35, 0.8, uNight);
    vec3 p = seed.xyz * uBox + drift * uTime + sway;
    // Wrap into a box centred on the player (slightly above the eyes)
    vec3 centre = uCam + vec3(0.0, 2.5, 0.0);
    p = mod(p - centre + uBox * 0.5, uBox) + centre - uBox * 0.5;

    vec4 mv = viewMatrix * vec4(p, 1.0);
    float dist = -mv.z;
    float edge = 1.0 - smoothstep(uBox.x * 0.32, uBox.x * 0.5, length(p.xz - uCam.xz)); // no popping at the wrap
    edge *= 1.0 - smoothstep(uBox.y * 0.35, uBox.y * 0.5, abs(p.y - centre.y));
    vAlpha = smoothstep(uNearFade.x, uNearFade.y, dist) * edge;
    // At night only some motes become fireflies (fewer, calmer)
    vAlpha *= mix(1.0, step(0.55, r), uNight);
    vSeed = r;
    vSun = pow(max(dot(normalize(p - uCam), uSunDir), 0.0), 3.0);

    float size = uSize * mix(1.0, 1.9, uNight) * (0.6 + 0.8 * r);
    float px = size * uScale / max(dist, 0.1);
    // Tiny far-away motes would read as stars: only show motes big and close enough to look like dust
    vAlpha *= smoothstep(1.8, 3.5, px) * (1.0 - smoothstep(14.0, 18.0, dist));
    gl_PointSize = clamp(px, 1.0, 22.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const moteFragment = /* glsl */ `
  uniform vec3 uDayColor;
  uniform vec3 uNightColor;
  uniform float uNight;
  uniform float uTime;
  uniform float uIntensity;
  varying float vAlpha;
  varying float vSeed;
  varying float vSun;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = smoothstep(0.5, 0.0, d);
    core *= core;
    // Dust glints more toward the sun; fireflies pulse slowly, each on its own rhythm
    float sunlit = mix(0.3 + 0.7 * vSun, 1.0, uNight);
    float pulse = mix(1.0, 0.25 + 0.75 * pow(0.5 + 0.5 * sin(uTime * (0.5 + vSeed * 0.7) + vSeed * 40.0), 3.0), uNight);
    vec3 col = mix(uDayColor, uNightColor, uNight);
    gl_FragColor = vec4(col * core * vAlpha * sunlit * pulse * uIntensity, 1.0);
    #include <colorspace_fragment>
  }
`;

function createMotes(count) {
  const random = rng(4242);
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = random();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 4));
  // `position` is required by three; the shader ignores it
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const uniforms = {
    uCam: { value: new THREE.Vector3() },
    uBox: { value: MOTE_BOX.clone() },
    uTime: { value: 0 },
    uScale: { value: 500 },
    uSize: { value: 0.07 }, // metres
    uNight: { value: 0 },
    uSunDir: { value: new THREE.Vector3() },
    uNearFade: { value: new THREE.Vector2(...MOTE_NEAR_FADE) },
    uDayColor: { value: new THREE.Color('#FFD07A') },
    uNightColor: { value: new THREE.Color('#FFF0C8') },
    uIntensity: { value: 0.9 },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: moteVertex,
    fragmentShader: moteFragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // positions come from the shader
  points.renderOrder = 10;
  return { object: points, uniforms };
}

// ---------- clouds ----------

const CLOUD_DISTANCE = 2400;
const ATLAS = 2; // 2 × 2 cloud shapes in one texture

/** Paint ATLAS² soft watercolour cloud shapes (white with alpha) into one canvas. */
function paintClouds(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const random = rng(777);
  const cell = size / ATLAS;
  for (let cy = 0; cy < ATLAS; cy++) {
    for (let cx = 0; cx < ATLAS; cx++) {
      const ox = cx * cell;
      const oy = cy * cell;
      const puffs = 26 + Math.floor(random() * 14);
      for (let i = 0; i < puffs; i++) {
        // Wide, flat-bottomed clusters: puffs spread along x, piled up toward the top
        const px = ox + cell * (0.18 + random() * 0.64);
        const spread = 1 - Math.abs((px - ox) / cell - 0.5) * 1.6;
        const py = oy + cell * (0.62 - random() * 0.28 * spread);
        const r = cell * (0.07 + random() * 0.12) * (0.6 + spread * 0.6);
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(255,255,255,0.32)');
        g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

const cloudVertex = /* glsl */ `
  attribute vec2 local; // 0..1 across the cloud quad
  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec3 vDir;
  void main() {
    vUv = uv;
    vLocal = local;
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const cloudFragment = /* glsl */ `
  uniform sampler2D uCloud;
  uniform sampler2D uPaper;
  uniform vec3 uLit;
  uniform vec3 uShade;
  uniform float uOpacity;
  uniform vec3 uLightDir;
  varying vec2 vUv;
  varying vec2 vLocal;
  varying vec3 vDir;
  void main() {
    float a = texture2D(uCloud, vUv).a;
    // Tops lit, undersides in the sky's shade colour; brighter rims on the side facing the light
    float top = smoothstep(0.25, 0.75, 1.0 - vLocal.y);
    float facing = pow(max(dot(vDir, uLightDir), 0.0), 6.0);
    vec3 col = mix(uShade, uLit, clamp(top + facing * 0.5, 0.0, 1.0));
    col *= 0.92 + 0.16 * texture2D(uPaper, vLocal * vec2(1.5, 0.6)).g; // watercolour wash
    gl_FragColor = vec4(col, a * uOpacity);
    #include <colorspace_fragment>
  }
`;

function createClouds(count) {
  const random = rng(1907);
  const positions = [];
  const uvs = [];
  const locals = [];
  const index = [];
  const dir = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < count; i++) {
    // Spread around the sky, low over the horizon; keep the area right around the sun clear
    let az;
    do az = -110 + random() * 250;
    while (Math.abs(az - SUN.azimuthDeg) < 12);
    const el = 4 + random() * 13;
    skyDirection(az, el, dir);
    const centre = dir.clone().multiplyScalar(CLOUD_DISTANCE);
    right.crossVectors(WORLD_UP, dir).normalize();
    up.crossVectors(dir, right).normalize();
    const w = CLOUD_DISTANCE * (0.22 + random() * 0.2);
    const h = w * 0.5;
    const cell = Math.floor(random() * ATLAS * ATLAS);
    const u0 = (cell % ATLAS) / ATLAS;
    const v0 = Math.floor(cell / ATLAS) / ATLAS;
    const base = positions.length / 3;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const p = centre.clone().addScaledVector(right, (sx * w) / 2).addScaledVector(up, (sy * h) / 2);
      positions.push(p.x, p.y, p.z);
      const lx = (sx + 1) / 2;
      const ly = (sy + 1) / 2;
      uvs.push(u0 + lx / ATLAS, 1 - (v0 + (1 - ly) / ATLAS));
      locals.push(lx, 1 - ly);
    }
    index.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('local', new THREE.Float32BufferAttribute(locals, 2));
  geometry.setIndex(index);
  const uniforms = {
    uCloud: { value: paintClouds() },
    uPaper: { value: paperTexture() },
    uLit: { value: new THREE.Color() },
    uShade: { value: new THREE.Color() },
    uOpacity: { value: 0.8 },
    uLightDir: { value: new THREE.Vector3() },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: cloudVertex,
    fragmentShader: cloudFragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -999; // right after the sky, before everything else
  return { object: mesh, uniforms };
}

// ---------- component ----------

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
const bufferSize = new THREE.Vector2();

AFRAME.registerComponent('atmosphere', {
  init() {
    this.motes = quality.motes > 0 ? createMotes(quality.motes) : null;
    this.clouds = quality.clouds > 0 ? createClouds(quality.clouds) : null;
    for (const part of [this.motes, this.clouds]) if (part) this.el.object3D.add(part.object);

    this.onTime = () => this.applyTime();
    this.el.addEventListener('timeofday', this.onTime);
    this.applyTime();
  },

  applyTime() {
    const env = sampleTime();
    // The light comes from the sun at sunset and from the moon at night (same blend as the light)
    const lightDir = skyDirection(SUN.azimuthDeg, Math.max(env.sunEl, 2), tmp)
      .lerp(skyDirection(MOON.azimuthDeg, Math.max(env.moonEl, 8), tmp2), env.moonLight)
      .normalize();
    if (this.motes) {
      const u = this.motes.uniforms;
      u.uNight.value = THREE.MathUtils.smoothstep(env.stars, 0.1, 0.8);
      u.uSunDir.value.copy(lightDir);
    }
    if (this.clouds) {
      const u = this.clouds.uniforms;
      u.uLit.value.copy(env.cloudLit);
      u.uShade.value.copy(env.cloudShade);
      u.uOpacity.value = env.cloudOpacity;
      u.uLightDir.value.copy(lightDir);
    }
  },

  tick(time) {
    const camera = this.el.camera;
    if (!camera) return;
    const seconds = time / 1000;
    if (this.motes) {
      const u = this.motes.uniforms;
      camera.getWorldPosition(u.uCam.value);
      u.uTime.value = seconds;
      // Pixels per metre at 1 m distance, for perspective point sizes
      const height = this.el.renderer.getDrawingBufferSize(bufferSize).y;
      u.uScale.value = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    }
    if (this.clouds) {
      camera.getWorldPosition(this.clouds.object.position); // far away: no parallax
      this.clouds.object.rotation.y = seconds * 0.0006; // a very slow drift
    }
  },

  remove() {
    this.el.removeEventListener('timeofday', this.onTime);
    for (const part of [this.motes, this.clouds]) {
      if (!part) continue;
      this.el.object3D.remove(part.object);
      part.object.geometry.dispose();
      part.object.material.dispose();
    }
  },
});
