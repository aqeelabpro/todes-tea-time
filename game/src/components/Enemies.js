import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  DIFFICULTY_SCORE_INTERVAL, DIFFICULTY_SPEED_STEP, ENEMY_LIMIT, ENEMY_MODEL_SCALE,
  ENEMY_RADIUS, ENEMY_SEPARATION_DISTANCE, ENEMY_SEPARATION_STRENGTH,
  ENEMY_SIDEWAYS_BIAS, ENEMY_DETOUR_MARGIN, ENEMY_WAYPOINT_RADIUS,
  ENEMY_SPAWN_INSET, ENEMY_SPAWN_JITTER,
  ENEMY_SPAWN_SECONDS, ENEMY_SPEED, KILL_SCORE, MAP_HALF_SIZE, MIN_SPAWN_SECONDS,
  DIFFICULTY_SPAWN_STEP, HOUSE_HALF_HEIGHT, HOUSE_HALF_WIDTH, HOUSE_POSITIONS,
} from '../config.js';
import { isBlocked } from './World.js';
import { groundModel } from './ModelGrounding.js';

const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

// Return where a segment first enters an expanded house, or Infinity if clear.
function houseEntry(from, to, house, radius) {
  const [hx, hy] = house;
  const limits = [
    [hx - HOUSE_HALF_WIDTH - radius, hx + HOUSE_HALF_WIDTH + radius],
    [hy - HOUSE_HALF_HEIGHT - radius, hy + HOUSE_HALF_HEIGHT + radius],
  ];
  let near = 0;
  let far = 1;
  for (let axis = 0; axis < 2; axis++) {
    const start = axis === 0 ? from.x : from.y;
    const delta = (axis === 0 ? to.x : to.y) - start;
    const [min, max] = limits[axis];
    if (Math.abs(delta) < 0.001) {
      if (start < min || start > max) return Infinity;
      continue;
    }
    const first = (min - start) / delta;
    const second = (max - start) / delta;
    near = Math.max(near, Math.min(first, second));
    far = Math.min(far, Math.max(first, second));
    if (near >= far) return Infinity;
  }
  return near < far && near < 1 && far > 0 ? near : Infinity;
}

function firstBlockingHouse(from, to, radius = ENEMY_RADIUS) {
  let result = null;
  let entry = Infinity;
  for (const house of HOUSE_POSITIONS) {
    const candidate = houseEntry(from, to, house, radius);
    if (candidate < entry) {
      entry = candidate;
      result = house;
    }
  }
  return result;
}

function nextWaypoint(from, to, radius) {
  if (!firstBlockingHouse(from, to, radius)) return null;
  const nodes = [{ x: from.x, y: from.y }];
  for (const [hx, hy] of HOUSE_POSITIONS) {
    const x = HOUSE_HALF_WIDTH + radius + ENEMY_DETOUR_MARGIN;
    const y = HOUSE_HALF_HEIGHT + radius + ENEMY_DETOUR_MARGIN;
    for (const [dx, dy] of [[-x, -y], [-x, y], [x, -y], [x, y]]) {
      const point = { x: hx + dx, y: hy + dy };
      if (!isBlocked(point.x, point.y, radius)) nodes.push(point);
    }
  }
  nodes.push({ x: to.x, y: to.y });
  const destination = nodes.length - 1;
  const distance = nodes.map(() => Infinity);
  const previous = nodes.map(() => -1);
  const visited = new Set();
  distance[0] = 0;
  // The small visibility graph lets enemies route around more than one house.
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited.has(i) && (current < 0 || distance[i] < distance[current])) current = i;
    }
    if (current < 0 || distance[current] === Infinity || current === destination) break;
    visited.add(current);
    for (let i = 0; i < nodes.length; i++) {
      if (i === current || visited.has(i) || firstBlockingHouse(nodes[current], nodes[i], radius)) continue;
      const length = Math.hypot(nodes[i].x - nodes[current].x, nodes[i].y - nodes[current].y);
      if (distance[current] + length < distance[i]) {
        distance[i] = distance[current] + length;
        previous[i] = current;
      }
    }
  }
  if (previous[destination] < 0) return null;
  let waypoint = destination;
  while (previous[waypoint] > 0) waypoint = previous[waypoint];
  return waypoint === destination ? null : nodes[waypoint];
}

export function createEnemies(scene, state, onKill) {
  const enemies = [];
  let template = null;
  let spawnTimer = 0;
  let nextEnemyId = 0;
  new GLTFLoader().load('/models/enemy.glb', ({ scene: model }) => {
    template = model;
    enemies.forEach((enemy) => attachModel(enemy));
  });

  function attachModel(enemy) {
    if (!template || enemy.model) return;
    // enemy.glb is skinned: Object3D.clone keeps bones tied to the source scene.
    const model = cloneSkeleton(template);
    model.traverse((part) => {
      if (part.isMesh && part.material) part.material = Array.isArray(part.material)
        ? part.material.map((material) => material.clone()) : part.material.clone();
    });
    model.rotation.x = Math.PI / 2;
    model.scale.setScalar(ENEMY_MODEL_SCALE);
    enemy.group.add(model);
    groundModel(model);
    enemy.group.remove(enemy.placeholder);
    enemy.model = model;
  }

  function spawn() {
    if (enemies.length >= ENEMY_LIMIT) return;
    const startCorner = Math.floor(Math.random() * corners.length);
    let position = null;
    for (let attempt = 0; attempt < corners.length; attempt++) {
      const candidate = corners[(startCorner + attempt) % corners.length];
      const [cx, cy] = candidate;
      const jitter = (Math.random() - 0.5) * ENEMY_SPAWN_JITTER;
      const x = cx * (MAP_HALF_SIZE - ENEMY_SPAWN_INSET);
      const y = cy * (MAP_HALF_SIZE - ENEMY_SPAWN_INSET) + jitter;
      if (isBlocked(x, y, ENEMY_RADIUS)) continue;
      if (enemies.some((other) => Math.hypot(other.group.position.x - x, other.group.position.y - y) < ENEMY_RADIUS + other.radius + 1)) continue;
      position = [x, y];
      break;
    }
    if (!position) return;
    const group = new THREE.Group();
    group.position.set(position[0], position[1], 0);
    const placeholder = new THREE.Mesh(
      new THREE.SphereGeometry(10, 12, 8),
      new THREE.MeshStandardMaterial({ color: '#a45462' }),
    );
    placeholder.position.z = 10;
    group.add(placeholder);
    scene.add(group);
    const enemy = { group, placeholder, model: null, waypoint: null, radius: ENEMY_RADIUS, id: nextEnemyId++ };
    enemies.push(enemy);
    attachModel(enemy);
  }

  function canMove(enemy, x, y) {
    return !isBlocked(x, y, enemy.radius);
  }

  function spatialHash() {
    const cells = new Map();
    let maxRadius = 0;
    for (const enemy of enemies) {
      const x = Math.floor(enemy.group.position.x / ENEMY_SEPARATION_DISTANCE);
      const y = Math.floor(enemy.group.position.y / ENEMY_SEPARATION_DISTANCE);
      const key = `${x},${y}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push(enemy);
      maxRadius = Math.max(maxRadius, enemy.radius);
    }
    return { cells, maxRadius };
  }

  function separation(enemy, desiredX, desiredY, playerPosition, hash) {
    const cellSize = ENEMY_SEPARATION_DISTANCE;
    const cellX = Math.floor(enemy.group.position.x / cellSize);
    const cellY = Math.floor(enemy.group.position.y / cellSize);
    const padding = Math.max(0, cellSize - ENEMY_RADIUS * 2);
    const range = Math.ceil((enemy.radius + hash.maxRadius + padding) / cellSize);
    let pushX = 0;
    let pushY = 0;
    for (let y = cellY - range; y <= cellY + range; y++) {
      for (let x = cellX - range; x <= cellX + range; x++) {
        for (const other of hash.cells.get(`${x},${y}`) ?? []) {
          if (other === enemy) continue;
          let awayX = enemy.group.position.x - other.group.position.x;
          let awayY = enemy.group.position.y - other.group.position.y;
          let distance = Math.hypot(awayX, awayY);
          if (distance < 0.001) {
            awayX = enemy.id < other.id ? -1 : 1;
            awayY = 0;
            distance = 1;
          }
          const threshold = enemy.radius + other.radius + padding;
          if (distance >= threshold) continue;
          const closeness = (threshold - distance) / threshold;
          const ux = awayX / distance;
          const uy = awayY / distance;
          // Existing overlaps get a stronger nudge on the following frame.
          const overlap = Math.max(0, enemy.radius + other.radius - distance) / (enemy.radius + other.radius);
          const force = (closeness + overlap) * ENEMY_SEPARATION_STRENGTH;
          pushX += ux * force;
          pushY += uy * force;

          const otherTarget = other.waypoint ?? playerPosition;
          const otherDx = otherTarget.x - other.group.position.x;
          const otherDy = otherTarget.y - other.group.position.y;
          const otherLength = Math.hypot(otherDx, otherDy);
          if (otherLength > 0.001 && (desiredX * otherDx + desiredY * otherDy) / otherLength < -0.4) {
            // All enemies pass clockwise relative to their neighbor; the pair gets opposite lateral pushes.
            pushX += -uy * closeness * ENEMY_SIDEWAYS_BIAS;
            pushY += ux * closeness * ENEMY_SIDEWAYS_BIAS;
          }
        }
      }
    }
    return [pushX, pushY];
  }

  function update(dt, playerPosition) {
    const level = Math.floor(state.score / DIFFICULTY_SCORE_INTERVAL);
    const interval = Math.max(MIN_SPAWN_SECONDS, ENEMY_SPAWN_SECONDS - level * DIFFICULTY_SPAWN_STEP);
    spawnTimer += dt;
    while (spawnTimer >= interval) {
      spawnTimer -= interval;
      spawn();
    }
    const speed = ENEMY_SPEED * (1 + level * DIFFICULTY_SPEED_STEP);
    const hash = spatialHash();
    for (const enemy of enemies) {
      if (enemy.waypoint && Math.hypot(enemy.waypoint.x - enemy.group.position.x, enemy.waypoint.y - enemy.group.position.y) < ENEMY_WAYPOINT_RADIUS) {
        enemy.waypoint = null;
      }
      if (!enemy.waypoint) {
        enemy.waypoint = nextWaypoint(enemy.group.position, playerPosition, enemy.radius);
      }
      const target = enemy.waypoint ?? playerPosition;
      const dx = target.x - enemy.group.position.x;
      const dy = target.y - enemy.group.position.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.001) continue;
      const step = Math.min(length, speed * dt);
      const [pushX, pushY] = separation(enemy, dx / length, dy / length, playerPosition, hash);
      let vx = dx / length + pushX;
      let vy = dy / length + pushY;
      const magnitude = Math.hypot(vx, vy);
      if (magnitude < 0.001) {
        vx = -dy / length;
        vy = dx / length;
      } else {
        vx /= magnitude;
        vy /= magnitude;
      }
      const nx = enemy.group.position.x + vx * step;
      const ny = enemy.group.position.y + vy * step;
      if (canMove(enemy, nx, ny)) enemy.group.position.set(nx, ny, 0);
      else if (canMove(enemy, nx, enemy.group.position.y)) enemy.group.position.x = nx;
      else if (canMove(enemy, enemy.group.position.x, ny)) enemy.group.position.y = ny;
      else {
        // A neighbor can block both slides; step around its side without overlap.
        const sideX = -vy * step;
        const sideY = vx * step;
        if (canMove(enemy, enemy.group.position.x + sideX, enemy.group.position.y + sideY)) {
          enemy.group.position.x += sideX;
          enemy.group.position.y += sideY;
        } else if (canMove(enemy, enemy.group.position.x - sideX, enemy.group.position.y - sideY)) {
          enemy.group.position.x -= sideX;
          enemy.group.position.y -= sideY;
        }
      }
    }
  }

  function remove(enemy, scored = true) {
    const index = enemies.indexOf(enemy);
    if (index < 0) return;
    enemies.splice(index, 1);
    scene.remove(enemy.group);
    if (enemy.model) enemy.model.traverse((part) => {
      if (part.isMesh) {
        if (Array.isArray(part.material)) part.material.forEach((material) => material.dispose());
        else part.material.dispose();
      }
    });
    if (scored) {
      state.kills += 1;
      state.score += KILL_SCORE;
      onKill(enemy.group.position);
    }
  }

  function clear(spawnAtStart = false) {
    for (const enemy of [...enemies]) remove(enemy, false);
    spawnTimer = 0;
    if (spawnAtStart) spawn();
  }
  spawn();
  return { enemies, update, remove, clear };
}
