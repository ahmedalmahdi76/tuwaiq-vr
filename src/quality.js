// One quality level for the whole experience (brief §11): low / medium / high.
// Chosen automatically per device, or forced with ?quality=low|medium|high.
// Every effect reads its own setting from `quality` instead of checking the device itself.
import AFRAME from 'aframe';

export const LEVELS = ['low', 'medium', 'high'];

// Settings per level. Later effects (particles, clouds, rays…) add their own entries here.
const SETTINGS = {
  low: { maxPixelRatio: 1, terrainStep: 6, paperSize: 256, wadiSize: 512, skySparkles: false },
  medium: { maxPixelRatio: 1.5, terrainStep: 4, paperSize: 256, wadiSize: 1024, skySparkles: true },
  high: { maxPixelRatio: 2, terrainStep: 3, paperSize: 512, wadiSize: 2048, skySparkles: true },
};

const DEFAULT_FOR_DEVICE = { desktop: 'high', phone: 'medium', headset: 'medium' };

export function detectDevice() {
  if (/OculusBrowser|Quest|Pico|Wolvic/i.test(navigator.userAgent)) return 'headset';
  if (AFRAME.utils.device.isMobile()) return 'phone';
  return 'desktop';
}

function choose() {
  const device = detectDevice();
  const forced = new URLSearchParams(location.search).get('quality');
  if (LEVELS.includes(forced)) return { level: forced, source: 'url', device };
  return { level: DEFAULT_FOR_DEVICE[device], source: 'auto', device };
}

export const quality = (() => {
  const choice = choose();
  return Object.freeze({ ...choice, ...SETTINGS[choice.level] });
})();

/** Apply the renderer-level settings once the scene's renderer exists. */
export function applyQuality(sceneEl) {
  const apply = () => {
    sceneEl.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
  };
  if (sceneEl.renderer) apply();
  else sceneEl.addEventListener('renderstart', apply, { once: true });
}
