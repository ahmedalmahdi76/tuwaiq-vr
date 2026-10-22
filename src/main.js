// Entry point: loads A-Frame and our components. Later steps add the loading screen and device detection.
import 'aframe';
import './styles.css';
import './components/arabic-text.js';
import { runArabicTest } from './dev/arabic-test.js';

runArabicTest();
