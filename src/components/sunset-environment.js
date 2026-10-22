// <a-scene sunset-environment> — gradient sunset sky with a low sun, matching fog, and the two
// lights (sun = directional, sky = hemisphere). Values come from world-config.js.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { SKY, SUN, FOG, LIGHTS, sunDirection } from '../world-config.js';

const SKY_RADIUS = 5000; // well inside the camera's far plane (10000)

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 horizonColor;
  uniform vec3 midColor;
  uniform vec3 topColor;
  uniform vec3 discColor;
  uniform vec3 glowColor;
  uniform vec3 sunDir;
  uniform float discCos;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    // Gold at the horizon -> pink by ~20° -> mauve overhead. Below the horizon stays gold (fog colour).
    vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.35, h));
    col = mix(col, topColor, smoothstep(0.3, 0.9, h));

    // Sun: soft wide glow, warmer band along the horizon on the sun's side, then the disc.
    float d = max(dot(dir, sunDir), 0.0);
    col += glowColor * (pow(d, 6.0) * 0.25 + pow(d, 48.0) * 0.45);
    float horizonBand = (1.0 - smoothstep(0.0, 0.18, abs(h))) * pow(d, 2.0);
    col = mix(col, glowColor, horizonBand * 0.35);
    float disc = smoothstep(discCos - 0.00012, discCos + 0.00004, dot(dir, sunDir));
    col = mix(col, discColor, disc);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

AFRAME.registerComponent('sunset-environment', {
  init() {
    const scene = this.el;
    const sunDir = sunDirection();

    // Sky dome
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        horizonColor: { value: new THREE.Color(SKY.horizon) },
        midColor: { value: new THREE.Color(SKY.mid) },
        topColor: { value: new THREE.Color(SKY.top) },
        discColor: { value: new THREE.Color(SUN.discColor) },
        glowColor: { value: new THREE.Color(SUN.glowColor) },
        sunDir: { value: sunDir.clone() },
        discCos: { value: Math.cos(THREE.MathUtils.degToRad(SUN.discSizeDeg / 2)) },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 48, 24), material);
    this.sky.renderOrder = -1000; // draw first, behind everything
    this.sky.frustumCulled = false;
    scene.object3D.add(this.sky);

    // Fog
    scene.setAttribute('fog', { type: 'linear', color: FOG.color, near: FOG.near, far: FOG.far });

    // Lights (adding any light entity also removes A-Frame's default lights)
    this.lights = [
      this.makeLight({
        type: 'directional',
        color: LIGHTS.sun.color,
        intensity: LIGHTS.sun.intensity,
      }, sunDir.clone().multiplyScalar(100)),
      this.makeLight({
        type: 'hemisphere',
        color: LIGHTS.hemisphere.sky,
        groundColor: LIGHTS.hemisphere.ground,
        intensity: LIGHTS.hemisphere.intensity,
      }, new THREE.Vector3(0, 50, 0)),
    ];
  },

  makeLight(light, position) {
    const el = document.createElement('a-entity');
    el.setAttribute('light', light);
    el.setAttribute('position', position);
    this.el.appendChild(el);
    return el;
  },

  // Keep the sky centred on the camera so it never shows parallax when the player walks.
  tick() {
    const camera = this.el.camera;
    if (camera) camera.getWorldPosition(this.sky.position);
  },

  remove() {
    this.el.object3D.remove(this.sky);
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.lights.forEach((el) => el.remove());
    this.el.removeAttribute('fog');
  },
});
