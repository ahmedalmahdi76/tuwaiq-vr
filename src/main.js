// Entry point: loads A-Frame and our components. Later steps add the loading screen and device detection.
import 'aframe';
import './styles.css';
import { quality, applyQuality } from './quality.js';
import { arabicFontsReady } from './fonts.js';
import './components/arabic-text.js';
import './components/math-text.js';
import './components/world-environment.js';
import './components/atmosphere.js';
import './components/tuwaiq-terrain.js';
import { runArabicTest } from './dev/arabic-test.js';
import { setupCameraPresets } from './dev/camera-presets.js';
import { setupFpsMeter } from './dev/fps-meter.js';
import { setupTimeControls } from './dev/time-controls.js';

console.info(`[quality] ${quality.level} (${quality.source}, ${quality.device})`);
applyQuality(document.querySelector('a-scene'));
arabicFontsReady(); // start loading Tajawal right away (used by canvas text and HTML overlays)
setupCameraPresets();
setupFpsMeter(); // ?stats
setupTimeControls(); // ?time=0.6 | ?time=cycle, keys [ ]
// Arabic text test boards (steps 1.2–1.3b) only with ?text, so they don't block the view
if (new URLSearchParams(location.search).has('text')) runArabicTest();
