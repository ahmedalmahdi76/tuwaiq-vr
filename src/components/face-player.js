// <a-entity face-player="speed: 3"> — turns around its vertical axis to face the camera, smoothly.
// Used by markers now and by station panels later (B.3).
import AFRAME from 'aframe';
import * as THREE from 'three';

const camPos = new THREE.Vector3();
const selfPos = new THREE.Vector3();

AFRAME.registerComponent('face-player', {
  schema: {
    speed: { type: 'number', default: 4 }, // how quickly it catches up (1/s); 0 = instant
  },

  init() {
    this.first = true;
  },

  tick(time, delta) {
    const camera = this.el.sceneEl.camera;
    if (!camera) return;
    camera.getWorldPosition(camPos);
    this.el.object3D.getWorldPosition(selfPos);
    const target = Math.atan2(camPos.x - selfPos.x, camPos.z - selfPos.z);
    const rot = this.el.object3D.rotation;
    if (this.first || this.data.speed <= 0) {
      rot.y = target;
      this.first = false;
      return;
    }
    // Shortest way round, eased
    let diff = target - rot.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    rot.y += diff * Math.min(1, (this.data.speed * delta) / 1000);
  },
});
