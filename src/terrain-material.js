// Terrain materials: flat-shaded vertex colours (MeshStandardMaterial) plus a small shader patch:
//   - watercolour paper: fine grain + soft washes from the shared paper texture, projected along the
//     face's main axis (faces are flat-shaded, so one lookup per scale, no seams)
//   - thin rock layer lines on steep faces (Tuwaiq's dense strata), drawn by height
//   - optional painted overlay (riverbeds / patches) on the plain
//   - height haze: fog that is mauve down at the plain and gold higher up (slide 1's layered hills)
// Shared uniforms live in `terrainUniforms` so the time-of-day system (V.3) can tint them.
import * as THREE from 'three';
import { paperTexture } from './paper-texture.js';
import { wadiTexture, WADI_RECT } from './wadi-texture.js';
import { HAZE } from './world-config.js';
import { PLAIN_Y } from './terrain.js';

export const terrainUniforms = {
  uPaper: { value: null },
  uHazeLow: { value: new THREE.Color(HAZE.low) },
  uHazeY: { value: new THREE.Vector2(PLAIN_Y + 10, PLAIN_Y + 110) }, // mauve below .x, fog colour above .y
  uLowHaze: { value: HAZE.lowExtra }, // extra haze close to the plain
};

const vertexPatch = {
  head: 'varying vec3 vWorld;',
  body: 'vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;',
};

const fragmentHead = /* glsl */ `
  varying vec3 vWorld;
  uniform sampler2D uPaper;
  uniform vec3 uHazeLow;
  uniform vec2 uHazeY;
  uniform float uLowHaze;
  #ifdef USE_WADI
    uniform sampler2D uWadi;
    uniform vec4 uWadiRect;
  #endif

  // Sample along the dominant axis of the (flat) face normal.
  vec4 paperAt(vec3 p, vec3 n) {
    vec3 a = abs(n);
    vec2 uv = a.y > a.x && a.y > a.z ? p.xz : (a.x > a.z ? p.zy : p.xy);
    return texture2D(uPaper, uv);
  }
`;

const fragmentColor = /* glsl */ `
  {
    vec3 nW = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
    #ifdef USE_WADI
      vec2 wuv = (vWorld.xz - uWadiRect.xy) / uWadiRect.zw;
      vec4 w = texture2D(uWadi, wuv);
      vec2 edge = smoothstep(0.0, 0.08, wuv) * smoothstep(0.0, 0.08, 1.0 - wuv);
      diffuseColor.rgb = mix(diffuseColor.rgb, w.rgb, w.a * edge.x * edge.y);
    #endif
    float grain = paperAt(vWorld / 3.0, nW).r;   // ~3 m per tile: paper bumps up close
    float wash = paperAt(vWorld / 70.0, nW).g;   // large soft washes and tide lines
    diffuseColor.rgb *= (0.88 + 0.24 * grain) * (0.86 + 0.28 * wash);

    // Thin rock layers on steep faces, slightly wavy so they don't look ruled
    float steep = smoothstep(0.5, 0.85, 1.0 - abs(nW.y));
    float wobble = paperAt(vWorld / 25.0, nW).g * 0.8;
    float layer = fract(vWorld.y / 2.6 + wobble);
    float fine = fract(vWorld.y / 0.9 + wobble * 1.7);
    float lines = smoothstep(0.86, 0.97, layer) * 0.16 + smoothstep(0.9, 0.98, fine) * 0.07;
    diffuseColor.rgb *= 1.0 - lines * steep;
  }
`;

const fogPatch = /* glsl */ `
  #ifdef USE_FOG
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
    float low = 1.0 - smoothstep(uHazeY.x, uHazeY.y, vWorld.y);
    // Low ground gathers extra haze sooner: far ridges fade in layers, like slide 1
    fogFactor = max(fogFactor, uLowHaze * low * smoothstep(fogNear * 2.0, fogFar * 0.9, vFogDepth));
    vec3 hazeColor = mix(fogColor, uHazeLow, low);
    gl_FragColor.rgb = mix(gl_FragColor.rgb, hazeColor, fogFactor);
  #endif
`;

/**
 * @param {{ wadi?: boolean }} options  wadi: add the painted riverbed overlay (plain only)
 */
export function createTerrainMaterial({ wadi = false } = {}) {
  terrainUniforms.uPaper.value = paperTexture();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    flatShading: true,
    roughness: 1,
    metalness: 0,
  });
  if (wadi) material.defines = { USE_WADI: '' };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, terrainUniforms);
    if (wadi) {
      shader.uniforms.uWadi = { value: wadiTexture() };
      shader.uniforms.uWadiRect = { value: new THREE.Vector4(WADI_RECT.x, WADI_RECT.z, WADI_RECT.w, WADI_RECT.d) };
    }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexPatch.head}`)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${vertexPatch.body}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragmentHead}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${fragmentColor}`)
      .replace('#include <fog_fragment>', fogPatch);
  };
  material.customProgramCacheKey = () => (wadi ? 'terrain-wadi' : 'terrain');
  return material;
}
