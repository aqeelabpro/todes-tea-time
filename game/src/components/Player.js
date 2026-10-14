import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  CAMERA_FAR, CAMERA_FOV, CAMERA_POSITION, INPUT_QUEUE_LIMIT, PLAYER_HOP_HEIGHT,
  PLAYER_HOP_SECONDS, PLAYER_MODEL_SCALE, PLAYER_RADIUS, PLAYER_STEP,
  PLAYER_HIT_TINT_COLOR,
  PLAYER_HIT_EMISSIVE_MIX,
} from '../config.js';
import { isBlocked } from './World.js';
import { groundModel } from './ModelGrounding.js';

const DIRECTIONS = {
  ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};

export function createPlayer(scene, onHop = () => {}) {
  const group = new THREE.Group();
  scene.add(group);
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, innerWidth / innerHeight, 0.1, CAMERA_FAR);
  camera.up.set(0, 0, 1);
  camera.position.set(...CAMERA_POSITION);
  camera.lookAt(0, 0, 0);
  group.add(camera);
  const visual = new THREE.Group();
  group.add(visual);
  const tintMaterials = [];
  const hitColor = new THREE.Color(PLAYER_HIT_TINT_COLOR);

  function rememberMaterial(material) {
    tintMaterials.push({ material, color: material.color?.clone(), emissive: material.emissive?.clone() });
    return material;
  }

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(9, 16, 12),
    rememberMaterial(new THREE.MeshStandardMaterial({ color: '#7bbd59' })),
  );
  marker.position.z = 9;
  visual.add(marker);

  new GLTFLoader().load('/models/tode.glb', ({ scene: model }) => {
    visual.remove(marker);
    tintMaterials.shift();
    marker.geometry.dispose();
    marker.material.dispose();
    model.traverse((part) => {
      if (!part.isMesh || !part.material) return;
      part.material = Array.isArray(part.material)
        ? part.material.map((material) => rememberMaterial(material.clone()))
        : rememberMaterial(part.material.clone());
    });
    model.rotation.x = Math.PI / 2;
    model.scale.setScalar(PLAYER_MODEL_SCALE);
    visual.add(model);
    groundModel(model);
  });

  let queue = [];
  let hop = null;
  let facing = [0, 1];
  function queueMove(code) {
    const direction = DIRECTIONS[code];
    if (!direction) return false;
    if (queue.length < INPUT_QUEUE_LIMIT) queue.push(direction);
    return true;
  }
  function update(dt, speedMultiplier = 1) {
    if (!hop && queue.length) {
      const direction = queue.shift();
      const target = [group.position.x + direction[0] * PLAYER_STEP, group.position.y + direction[1] * PLAYER_STEP];
      facing = direction;
      if (!isBlocked(target[0], target[1], PLAYER_RADIUS)) {
        hop = { from: [group.position.x, group.position.y], to: target, progress: 0 };
        onHop();
      }
    }
    if (hop) {
      hop.progress = Math.min(1, hop.progress + dt * speedMultiplier / PLAYER_HOP_SECONDS);
      const t = hop.progress;
      group.position.set(
        THREE.MathUtils.lerp(hop.from[0], hop.to[0], t),
        THREE.MathUtils.lerp(hop.from[1], hop.to[1], t),
        Math.sin(t * Math.PI) * PLAYER_HOP_HEIGHT,
      );
      if (t === 1) hop = null;
    }
  }
  function reset() {
    queue = [];
    hop = null;
    facing = [0, 1];
    group.position.set(0, 0, 0);
    visual.visible = true;
    setHitTint(0);
  }
  function setHitTint(amount) {
    for (const entry of tintMaterials) {
      if (entry.color) entry.material.color.copy(entry.color).lerp(hitColor, amount);
      if (entry.emissive) entry.material.emissive.copy(entry.emissive).lerp(hitColor, amount * PLAYER_HIT_EMISSIVE_MIX);
    }
  }
  return { group, camera, queueMove, update, reset, setHitTint,
    setVisible: (visible) => { visual.visible = visible; }, get facing() { return facing; } };
}
