// <a-scene world-environment> — the sky dome (gradient, sun, crescent moon, stars, paper texture),
// fog, haze and the two lights, all following the journey clock (time-of-day.js).
// Only colours, directions and uniforms change over time: no lights are added or removed, so no
// shader ever recompiles and nothing stutters.
import AFRAME from 'aframe';
import * as THREE from 'three';
import { SUN, MOON, FOG, skyDirection } from '../world-config.js';
import { journey, sampleTime, stepJourney } from '../time-of-day.js';
import { paperTexture } from '../paper-texture.js';
import { terrainUniforms } from '../terrain-material.js';
import { quality } from '../quality.js';

const SKY_RADIUS = 5000; // well inside the camera's far plane

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
  uniform float glowStrength;
  uniform vec3 sunDir;
  uniform float discCos;
  uniform float discVisible;
  uniform vec3 moonDir;
  uniform vec3 moonColor;
  uniform float moonCos;
  uniform float moonVisible;
  uniform float stars;
  uniform float rays;
  uniform float time;
  uniform sampler2D uPaper;
  varying vec3 vDir;

  #ifdef RAYS
  // Soft beams fanning out from the sun (mostly upward), turning very slowly. Sky only: no extra
  // geometry or draw calls. Fades out as the sun sets (rays uniform).
  float sunRays(vec3 dir) {
    vec3 right = normalize(cross(sunDir, vec3(0.0, 1.0, 0.0)));
    vec3 up = cross(right, sunDir);
    vec2 p = vec2(dot(dir, right), dot(dir, up));
    float ang = atan(p.y, p.x);
    float dist = acos(clamp(dot(dir, sunDir), -1.0, 1.0));
    float beams = pow(0.5 + 0.5 * sin(ang * 7.0 + sin(ang * 3.0 + time * 0.03) * 2.0), 5.0) * 0.6
                + pow(0.5 + 0.5 * sin(ang * 13.0 + 1.3 - time * 0.02), 9.0) * 0.4;
    float falloff = exp(-dist * 3.2) * smoothstep(0.03, 0.12, dist);
    return beams * falloff * smoothstep(-0.02, 0.12, dir.y);
  }
  #endif

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }

  // Small twinkling stars on a 3D grid of directions; sized at least ~1 px so they don't shimmer.
  float starField(vec3 dir) {
    vec3 p = dir * 170.0;
    vec3 c = floor(p);
    float h = hash13(c);
    if (h < 0.955) return 0.0;
    vec3 off = vec3(hash13(c + 1.3), hash13(c + 2.7), hash13(c + 4.1)) * 0.6 + 0.2;
    float d = length(fract(p) - off);
    float px = length(fwidth(p));
    float r = max(0.06 + 0.08 * hash13(c + 7.1), px * 0.9);
    float twinkle = 0.7 + 0.3 * sin(time * (0.8 + 2.0 * hash13(c + 9.4)) + h * 60.0);
    return smoothstep(r, r * 0.3, d) * twinkle * (0.4 + 0.6 * (h - 0.955) / 0.045);
  }

  #ifdef SPARKLES
  // A few big four-pointed sparkles (✦) like the ones on the slides.
  float sparkles(vec3 dir) {
    vec3 p = dir * 16.0;
    vec3 c = floor(p);
    float h = hash13(c + 17.0);
    if (h < 0.93) return 0.0;
    vec3 q = fract(p) - (vec3(hash13(c + 3.3), hash13(c + 5.5), hash13(c + 8.8)) * 0.5 + 0.25);
    vec3 a = abs(dir);
    vec2 uv = a.y > a.x && a.y > a.z ? q.xz : (a.x > a.z ? q.zy : q.xy);
    uv /= 0.06 + 0.04 * hash13(c + 2.2);
    float arms = exp(-abs(uv.x) * 9.0) * exp(-abs(uv.y) * 1.6) + exp(-abs(uv.y) * 9.0) * exp(-abs(uv.x) * 1.6);
    float pulse = 0.75 + 0.25 * sin(time * 0.7 + h * 40.0);
    return clamp(arms, 0.0, 1.0) * pulse;
  }
  #endif

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    // Horizon -> mid by ~20° -> top overhead. Below the horizon stays the horizon colour (fog colour).
    vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.35, h));
    col = mix(col, topColor, smoothstep(0.3, 0.9, h));

    // Sun glow (also an afterglow when the sun is just below the horizon), then the disc.
    float d = max(dot(dir, sunDir), 0.0);
    col += glowColor * glowStrength * (pow(d, 6.0) * 0.25 + pow(d, 48.0) * 0.45);
    float horizonBand = (1.0 - smoothstep(0.0, 0.18, abs(h))) * pow(d, 2.0);
    col = mix(col, glowColor, horizonBand * 0.35 * glowStrength);
    float disc = smoothstep(discCos - 0.00012, discCos + 0.00004, dot(dir, sunDir));
    col = mix(col, discColor, disc * discVisible);
    #ifdef RAYS
      col += glowColor * sunRays(dir) * rays * 0.22;
    #endif

    // Stars fade in toward the night and thin out near the horizon haze.
    float above = smoothstep(0.03, 0.3, h);
    float s = starField(dir);
    #ifdef SPARKLES
      s = max(s, sparkles(dir));
    #endif
    col += vec3(1.0, 0.96, 0.92) * s * stars * above;

    // Crescent moon with a soft halo
    float md = dot(dir, moonDir);
    float halo = pow(max(md, 0.0), 300.0) * 0.35 + pow(max(md, 0.0), 40.0) * 0.08;
    vec3 side = normalize(cross(moonDir, vec3(0.0, 1.0, 0.0)));
    vec3 shadowDir = normalize(moonDir + side * 0.018 + vec3(0.0, 0.006, 0.0));
    float lit = smoothstep(moonCos - 0.00008, moonCos + 0.00003, md);
    float shadow = smoothstep(moonCos - 0.00008, moonCos + 0.00003, dot(dir, shadowDir));
    col += moonColor * halo * moonVisible;
    col = mix(col, moonColor, lit * (1.0 - shadow) * moonVisible);

    // Watercolour paper: fine grain + large soft washes. Explicit LOD avoids a seam where the
    // azimuth wraps; the effect fades out overhead where the mapping pinches.
    float az = atan(dir.z, dir.x) / 6.2831853;
    float paperAmount = 1.0 - smoothstep(0.75, 0.98, abs(h));
    float grain = textureLod(uPaper, vec2(az * 8.0, h * 4.0), 0.0).r;
    float wash = textureLod(uPaper, vec2(az * 2.0, h * 1.3), 2.0).g;
    col *= 1.0 + paperAmount * ((grain - 0.5) * 0.06 + (wash - 0.55) * 0.12);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const tmpDir = new THREE.Vector3();

AFRAME.registerComponent('world-environment', {
  init() {
    const scene = this.el;

    this.uniforms = {
      horizonColor: { value: new THREE.Color() },
      midColor: { value: new THREE.Color() },
      topColor: { value: new THREE.Color() },
      discColor: { value: new THREE.Color(SUN.discColor) },
      glowColor: { value: new THREE.Color() },
      glowStrength: { value: 1 },
      sunDir: { value: new THREE.Vector3() },
      discCos: { value: Math.cos(THREE.MathUtils.degToRad(SUN.discSizeDeg / 2)) },
      discVisible: { value: 1 },
      moonDir: { value: new THREE.Vector3() },
      moonColor: { value: new THREE.Color(MOON.color) },
      moonCos: { value: Math.cos(THREE.MathUtils.degToRad(MOON.sizeDeg / 2)) },
      moonVisible: { value: 0 },
      stars: { value: 0 },
      rays: { value: 0 },
      time: { value: 0 },
      uPaper: { value: paperTexture() },
    };
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: this.uniforms,
      defines: {
        ...(quality.skySparkles ? { SPARKLES: '' } : {}),
        ...(quality.sunRays ? { RAYS: '' } : {}),
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(SKY_RADIUS, 48, 24), material);
    this.sky.renderOrder = -1000; // draw first, behind everything
    this.sky.frustumCulled = false;
    scene.object3D.add(this.sky);

    scene.setAttribute('fog', { type: 'linear', color: '#F7C98B', near: FOG.near, far: FOG.far });

    // The two lights exist once and are only re-coloured / re-aimed afterwards.
    this.sunEl = this.makeLight({ type: 'directional', color: '#ffffff', intensity: 1 });
    this.hemiEl = this.makeLight({ type: 'hemisphere', color: '#ffffff', groundColor: '#ffffff', intensity: 1 });
    this.hemiEl.object3D.position.set(0, 50, 0);

    this.needsApply = true;
  },

  makeLight(light) {
    const el = document.createElement('a-entity');
    el.setAttribute('light', light);
    this.el.appendChild(el);
    return el;
  },

  tick(time, delta) {
    const camera = this.el.camera;
    if (camera) camera.getWorldPosition(this.sky.position); // no parallax when walking

    this.uniforms.time.value = time / 1000;
    if (stepJourney(Math.min(delta, 100) / 1000) || this.needsApply) this.apply();
  },

  apply() {
    const sun = this.sunEl.getObject3D('light');
    const hemi = this.hemiEl.getObject3D('light');
    const fog = this.el.object3D.fog;
    if (!sun || !hemi || !fog) return; // lights/fog not created yet: try next frame
    this.needsApply = false;

    const env = sampleTime();
    const u = this.uniforms;
    u.horizonColor.value.copy(env.horizon);
    u.midColor.value.copy(env.mid);
    u.topColor.value.copy(env.top);
    u.glowColor.value.copy(env.glow);
    u.glowStrength.value = env.glowStrength;
    skyDirection(SUN.azimuthDeg, env.sunEl, u.sunDir.value);
    u.discVisible.value = THREE.MathUtils.smoothstep(env.sunEl, -2.5, 0.5);
    skyDirection(MOON.azimuthDeg, env.moonEl, u.moonDir.value);
    u.moonVisible.value = THREE.MathUtils.smoothstep(env.moonEl, -1, 3);
    u.stars.value = env.stars;
    u.rays.value = env.rays;

    fog.color.copy(env.fog);
    terrainUniforms.uHazeLow.value.copy(env.haze);

    // Directional light: from the sun, handing over to the moon (always from above the horizon)
    tmpDir.copy(skyDirection(SUN.azimuthDeg, Math.max(env.sunEl, 3)));
    tmpDir.lerp(skyDirection(MOON.azimuthDeg, Math.max(env.moonEl, 8)), env.moonLight).normalize();
    this.sunEl.object3D.position.copy(tmpDir).multiplyScalar(100);
    sun.color.copy(env.light);
    sun.intensity = env.lightIntensity;
    hemi.color.copy(env.hemiSky);
    hemi.groundColor.copy(env.hemiGround);
    hemi.intensity = env.hemiIntensity;

    this.el.emit('timeofday', { t: journey.value }, false);
  },

  remove() {
    this.el.object3D.remove(this.sky);
    this.sky.geometry.dispose();
    this.sky.material.dispose();
    this.sunEl.remove();
    this.hemiEl.remove();
    this.el.removeAttribute('fog');
  },
});
