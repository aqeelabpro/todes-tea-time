import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  FLOOR_TILE_SIZE, HOUSE_HALF_HEIGHT, HOUSE_HALF_WIDTH, HOUSE_MODEL_SCALE,
  HOUSE_POSITIONS, MAP_BOUNDARY_INSET, MAP_HALF_SIZE,
  BOSS_HOUSE_FLASH_SECONDS, BOSS_HOUSE_FLASH_COLOR, BOSS_HOUSE_FLASH_EMISSIVE,
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
  scene.background = new THREE.Color('#228B22');
  scene.add(new THREE.AmbientLight('#ffffff', 1.5));
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
      house.traverse((part) => {
        if (!part.isMesh || !part.material) return;
        const cloneMaterial = (source) => {
          const material = source.clone();
          materials.push({
            material,
            color: material.color?.clone(),
            emissive: material.emissive?.clone(),
            intensity: material.emissiveIntensity,
          });
          return material;
        };
        part.material = Array.isArray(part.material) ? part.material.map(cloneMaterial) : cloneMaterial(part.material);
      });
      house.position.set(x, y, 0);
      house.rotation.x = Math.PI / 2;
      house.rotateY(Math.floor(Math.random() * 4) * Math.PI / 2);
      house.scale.setScalar(HOUSE_MODEL_SCALE);
      scene.add(house);
      groundModel(house);
      houses[index] = { materials, flashLeft: 0 };
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

  function update(dt) {
    for (const house of houses) {
      if (!house || house.flashLeft <= 0) continue;
      house.flashLeft = Math.max(0, house.flashLeft - dt);
      if (house.flashLeft === 0) restore(house);
    }
  }

  function reset() {
    for (const house of houses) {
      if (!house) continue;
      house.flashLeft = 0;
      restore(house);
    }
  }

  return { flashHouse, update, reset };
}
