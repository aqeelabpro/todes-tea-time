import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  FLOOR_TILE_SIZE, HOUSE_DOOR_ROTATIONS, HOUSE_HALF_HEIGHT, HOUSE_HALF_WIDTH, HOUSE_MODEL_SCALE,
  HOUSE_POSITIONS, MAP_BOUNDARY_INSET, MAP_HALF_SIZE,
  BOSS_HOUSE_FLASH_SECONDS, BOSS_HOUSE_FLASH_COLOR, BOSS_HOUSE_FLASH_EMISSIVE,
  HOUSE_FADE_OPACITY, HOUSE_FADE_OUT_SECONDS, HOUSE_FADE_IN_SECONDS,
  HOUSE_FADE_ENTER_DELAY_SECONDS, HOUSE_FADE_HOLD_SECONDS, HOUSE_FADE_MAX_CAMERA_DISTANCE,
  HOUSE_FADE_PLAYER_HEIGHT, HOUSE_OCCLUSION_EPSILON,
} from '../config.js';
import { groundModel } from './ModelGrounding.js';

export function houseAt(x, y, radius = 0) {
  return HOUSE_POSITIONS.findIndex(([hx, hy]) =>
    Math.abs(x - hx) < HOUSE_HALF_WIDTH + radius && Math.abs(y - hy) < HOUSE_HALF_HEIGHT + radius
  );
}

export function isBlocked(x, y, radius = 0) {
  if (Math.abs(x) + radius > MAP_HALF_SIZE - MAP_BOUNDARY_INSET || Math.abs(y) + radius > MAP_HALF_SIZE - MAP_BOUNDARY_INSET) return true;
  return houseAt(x, y, radius) >= 0;
}

export function createWorld(scene) {
  const houses = [];
  const raycaster = new THREE.Raycaster();
  const cameraPosition = new THREE.Vector3();
  const targetPosition = new THREE.Vector3();
  const screenPosition = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();
  scene.background = new THREE.Color('#228B22');
  const ambient = new THREE.AmbientLight('#ffffff', 1.5);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#ffffff', 1.5);
  sun.position.set(-100, -100, 200);
  scene.add(sun);

  const colors = [new THREE.Color('#228B22'), new THREE.Color('#90EE90')];
  const positions = [];
  const vertexColors = [];
  const tilesPerSide = MAP_HALF_SIZE * 2 / FLOOR_TILE_SIZE;
  for (let row = 0; row < tilesPerSide; row++) {
    for (let col = 0; col < tilesPerSide; col++) {
      const x = -MAP_HALF_SIZE + col * FLOOR_TILE_SIZE;
      const y = -MAP_HALF_SIZE + row * FLOOR_TILE_SIZE;
      positions.push(
        x, y, 0, x + FLOOR_TILE_SIZE, y, 0, x, y + FLOOR_TILE_SIZE, 0,
        x + FLOOR_TILE_SIZE, y, 0, x + FLOOR_TILE_SIZE, y + FLOOR_TILE_SIZE, 0, x, y + FLOOR_TILE_SIZE, 0,
      );
      const color = colors[(row + col) % 2];
      for (let vertex = 0; vertex < 6; vertex++) vertexColors.push(color.r, color.g, color.b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));

  const loader = new GLTFLoader();
  loader.load('/models/small_house.glb', ({ scene: model }) => {
    HOUSE_POSITIONS.forEach(([x, y], index) => {
      const house = model.clone(true);
      const materials = [];
      const meshes = [];
      house.traverse((part) => {
        if (!part.isMesh || !part.material) return;
        meshes.push(part);
        const cloneMaterial = (source) => {
          const material = source.clone();
          materials.push({
            material,
            color: material.color?.clone(),
            emissive: material.emissive?.clone(),
            intensity: material.emissiveIntensity,
            opacity: material.opacity,
            transparent: material.transparent,
            depthWrite: material.depthWrite,
          });
          return material;
        };
        part.material = Array.isArray(part.material) ? part.material.map(cloneMaterial) : cloneMaterial(part.material);
      });
      house.position.set(x, y, 0);
      house.rotation.x = Math.PI / 2;
      // The model's door is on its -Z face; these quarter turns face the camera.
      house.rotateY(HOUSE_DOOR_ROTATIONS[Math.floor(Math.random() * HOUSE_DOOR_ROTATIONS.length)]);
      house.scale.setScalar(HOUSE_MODEL_SCALE);
      scene.add(house);
      groundModel(house);
      house.updateMatrixWorld(true);
      houses[index] = {
        materials, meshes, bounds: new THREE.Box3().setFromObject(house),
        flashLeft: 0, opacity: 1, seenFor: 0, holdLeft: 0,
      };
    });
  });

  function restore(house) {
    for (const entry of house.materials) {
      if (entry.color) entry.material.color.copy(entry.color);
      if (entry.emissive) entry.material.emissive.copy(entry.emissive);
      if (entry.intensity !== undefined) entry.material.emissiveIntensity = entry.intensity;
    }
  }

  function flashHouse(index) {
    const house = houses[index];
    if (!house) return;
    house.flashLeft = BOSS_HOUSE_FLASH_SECONDS;
    for (const entry of house.materials) {
      if (entry.color) entry.material.color.set(BOSS_HOUSE_FLASH_COLOR);
      if (entry.emissive) entry.material.emissive.set(BOSS_HOUSE_FLASH_COLOR);
      if (entry.intensity !== undefined) entry.material.emissiveIntensity = BOSS_HOUSE_FLASH_EMISSIVE;
    }
  }

  function houseScreenBounds(house, camera) {
    const { min, max } = house.bounds;
    const bounds = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
      screenPosition.set(x, y, z).project(camera);
      bounds.left = Math.min(bounds.left, screenPosition.x);
      bounds.right = Math.max(bounds.right, screenPosition.x);
      bounds.bottom = Math.min(bounds.bottom, screenPosition.y);
      bounds.top = Math.max(bounds.top, screenPosition.y);
    }
    return bounds;
  }

  // First reject off-screen/far targets and the house's screen rectangle, then
  // raycast its actual meshes so empty corners of the rectangle do not trigger a fade.
  function coversTarget(house, bounds, target, camera) {
    targetPosition.set(target.x, target.y, target.z);
    const distance = cameraPosition.distanceTo(targetPosition);
    if (distance > HOUSE_FADE_MAX_CAMERA_DISTANCE) return false;
    screenPosition.copy(targetPosition).project(camera);
    if (Math.abs(screenPosition.x) > 1 || Math.abs(screenPosition.y) > 1 ||
        screenPosition.z < -1 || screenPosition.z > 1) return false;
    if (screenPosition.x < bounds.left || screenPosition.x > bounds.right ||
        screenPosition.y < bounds.bottom || screenPosition.y > bounds.top) return false;
    rayDirection.copy(targetPosition).sub(cameraPosition).normalize();
    raycaster.set(cameraPosition, rayDirection);
    raycaster.far = distance - HOUSE_OCCLUSION_EPSILON;
    return raycaster.intersectObjects(house.meshes, false).length > 0;
  }

  function setOpacity(house, opacity) {
    house.opacity = opacity;
    for (const entry of house.materials) {
      entry.material.opacity = entry.opacity * opacity;
      const transparent = opacity < 1 || entry.transparent;
      const depthWrite = opacity < 1 ? false : entry.depthWrite;
      if (entry.material.transparent !== transparent || entry.material.depthWrite !== depthWrite) {
        entry.material.transparent = transparent;
        entry.material.depthWrite = depthWrite;
        entry.material.needsUpdate = true;
      }
    }
  }

  function update(dt, camera, playerPosition, enemies, leaves) {
    camera.updateMatrixWorld(true);
    camera.getWorldPosition(cameraPosition);
    const targets = [{ x: playerPosition.x, y: playerPosition.y,
      z: playerPosition.z + HOUSE_FADE_PLAYER_HEIGHT }];
    for (const enemy of enemies) targets.push({ x: enemy.group.position.x, y: enemy.group.position.y,
      z: enemy.group.position.z + enemy.radius });
    for (const leaf of leaves) if (leaf.mesh.visible) targets.push(leaf.mesh.position);
    for (let index = 0; index < houses.length; index++) {
      const house = houses[index];
      if (!house) continue;
      if (house.flashLeft > 0) {
        house.flashLeft = Math.max(0, house.flashLeft - dt);
        if (house.flashLeft === 0) restore(house);
      }
      const bounds = houseScreenBounds(house, camera);
      const covered = targets.some((target) => coversTarget(house, bounds, target, camera));
      house.seenFor = covered ? house.seenFor + dt : 0;
      house.holdLeft = covered ? HOUSE_FADE_HOLD_SECONDS : Math.max(0, house.holdLeft - dt);
      const fade = house.seenFor >= HOUSE_FADE_ENTER_DELAY_SECONDS ||
        (house.opacity < 1 && house.holdLeft > 0);
      const target = fade ? HOUSE_FADE_OPACITY : 1;
      const duration = fade ? HOUSE_FADE_OUT_SECONDS : HOUSE_FADE_IN_SECONDS;
      const step = (1 - HOUSE_FADE_OPACITY) * dt / duration;
      const opacity = house.opacity + Math.sign(target - house.opacity) *
        Math.min(Math.abs(target - house.opacity), step);
      setOpacity(house, Math.abs(opacity - target) < HOUSE_OCCLUSION_EPSILON ? target : opacity);
    }
  }

  function reset() {
    for (const house of houses) {
      if (!house) continue;
      house.flashLeft = 0;
      house.seenFor = 0;
      house.holdLeft = 0;
      restore(house);
      setOpacity(house, 1);
    }
  }

  return { flashHouse, update, reset, ambient, sun };
}
