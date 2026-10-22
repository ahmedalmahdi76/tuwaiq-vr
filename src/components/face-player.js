// <a-entity face-player="speed: 3; maxAngle: 40"> — turns around its vertical axis to face the
// camera, smoothly. Works inside rotated parents. maxAngle limits how far (degrees) it may turn
// away from its starting direction (180 = no limit).
import AFRAME from 'aframe';
import * as THREE from 'three';

const camPos = new THREE.Vector3();
const selfPos = new THREE.Vector3();
const parentQuat = new THREE.Quaternion();
const euler = new THREE.Euler();

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

AFRAME.registerComponent('face-player', {
  schema: {
    speed: { type: 'number', default: 4 }, // how quickly it catches up (1/s); 0 = instant
    maxAngle: { type: 'number', default: 180 },
  },

  init() {
    this.first = true;
    this.base = null; // taken on the first tick, once the rotation attribute has been applied
  },

  tick(time, delta) {
    const camera = this.el.sceneEl.camera;
    if (!camera) return;
    const o = this.el.object3D;
    if (this.base === null) this.base = o.rotation.y;
    camera.getWorldPosition(camPos);
    o.getWorldPosition(selfPos);
    // Wanted world yaw, converted into the parent's frame
    let target = Math.atan2(camPos.x - selfPos.x, camPos.z - selfPos.z);
    if (o.parent) {
      o.parent.getWorldQuaternion(parentQuat);
      target -= euler.setFromQuaternion(parentQuat, 'YXZ').y;
    }
    // Limit around the starting direction
    const limit = THREE.MathUtils.degToRad(this.data.maxAngle);
    target = this.base + THREE.MathUtils.clamp(wrap(target - this.base), -limit, limit);

    if (this.first || this.data.speed <= 0) {
      o.rotation.y = target;
      this.first = false;
      return;
    }
    const diff = wrap(target - o.rotation.y);
    o.rotation.y += diff * Math.min(1, (this.data.speed * delta) / 1000);
  },
});
