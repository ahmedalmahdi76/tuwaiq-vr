// Entry point: loads A-Frame and our components. Later steps add the loading screen and device detection.
import 'aframe';
import './styles.css';
import { arabicFontsReady } from './fonts.js';
import './components/arabic-text.js';
import './components/math-text.js';
import './components/sunset-environment.js';
import { runArabicTest } from './dev/arabic-test.js';
import { runEnvironmentTest } from './dev/environment-test.js';

arabicFontsReady(); // start loading Tajawal right away (used by canvas text and HTML overlays)
runArabicTest();
runEnvironmentTest();
