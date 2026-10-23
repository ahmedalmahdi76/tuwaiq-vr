// Fixes for A-Frame 1.8 on phones. Must be imported before the scene initialises.
//
// 1. iPhone crash: on mobile, look-controls reads sceneEl.components['device-orientation-permission-ui']
//    while setting up tilt-to-look, but the scene's own components start AFTER the camera's. On iOS
//    (where DeviceOrientationEvent.requestPermission exists) that read throws, look-controls never
//    finishes setting up, and the view can't be turned at all. Fix: wait for the scene to load first.
// 2. A-Frame's own motion-permission dialog is English-only and fires without a user gesture. We ask
//    from «ابدأ الرحلة» instead (ui/start-screen.js), so the built-in dialog is switched off here
//    (setting `enabled: false` on the scene doesn't stick: A-Frame resets the attribute on init).
import AFRAME from 'aframe';

const lookControls = AFRAME.components['look-controls'].Component.prototype;
const setupMagicWindow = lookControls.setupMagicWindowControls;
lookControls.setupMagicWindowControls = function () {
  const scene = this.el.sceneEl;
  if (scene.components['device-orientation-permission-ui']) {
    setupMagicWindow.call(this);
  } else {
    scene.addEventListener('loaded', () => setupMagicWindow.call(this), { once: true });
  }
};

const permissionUi = AFRAME.components['device-orientation-permission-ui'].Component.prototype;
permissionUi.init = function () {
  const needsAsking = typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
  this.permissionGranted = !needsAsking;
  this.el.addEventListener('deviceorientationpermissiongranted', () => {
    this.permissionGranted = true;
  });
};
permissionUi.remove = function () {};
