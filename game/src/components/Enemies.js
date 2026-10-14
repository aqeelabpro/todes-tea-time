import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  BOSS_KILL_SCORE, BOSS_NORMAL_SPAWN_RATE, BOSS_SCORE_STEP, BOSS_HP,
  BOSS_HP_GROWTH, BOSS_DIFFICULTY, BOSS_PHASE_TWO_THRESHOLD, BOSS_PHASE_THREE_THRESHOLD,
  BOSS_ENRAGE_SPEED, BOSS_STAGGER_SECONDS,
  BOSS_REST_DAMAGE_MULTIPLIER, BOSS_SUMMON_COUNT, BOSS_SUMMON_INTERVAL,
  BOSS_REST_PULSE_SPEED, BOSS_REST_PULSE_BASE, BOSS_REST_PULSE_AMPLITUDE,
  BOSS_PHASE_LEAF_OFFSETS, BOSS_SUMMON_CORNER_OFFSETS,
  BOSS_CRASH_DAMAGE, BOSS_STUN_DAMAGE_MULTIPLIER, BOSS_STUN_TINT,
  BOSS_STUN_WHITE_MIX, BOSS_BLOCK_CANCEL_SECONDS,
  AUDIO_BRUTE_HEARING_RANGE, AUDIO_NEAREST_BRUTES, BRUTE_STEP_SECONDS, BOSS_STEP_SECONDS,
  BRUTE_HIT_KNOCKBACK_FRACTION, BRUTE_KNOCKBACK_SECONDS, BRUTE_STAGGER_TIME,
  BRUTE_ATTACK_RECOVERY, ENEMY_HIT_SQUASH, STAGES, STAGE_THREE_BRUTE_SHARE_CAP,
  STAGE_THREE_BRUTE_SHARE_GROWTH, STAGE_THREE_BRUTE_SHARE_SCORE_STEP,
  BRUTE_INTRO_COOLDOWN,
  DEBUG_ENEMY_SPAWN_DISTANCES, DIFFICULTY_SCORE_INTERVAL, DIFFICULTY_SPEED_STEP,
  ENEMY_CONTACT_CLEARANCE, ENEMY_HIT_FLASH_EMISSIVE, ENEMY_HIT_FLASH_SECONDS,
  ENEMY_KNOCKBACK_STEP, ENEMY_PLACEHOLDER_RADIUS_FACTOR,
  ENEMY_LIMIT, ENEMY_RADIUS, ENEMY_SEPARATION_DISTANCE, ENEMY_SEPARATION_STRENGTH,
  ENEMY_SIDEWAYS_BIAS, ENEMY_DETOUR_MARGIN, ENEMY_WAYPOINT_RADIUS,
  ENEMY_SPAWN_INSET, ENEMY_SPAWN_JITTER,
  ENEMY_SPAWN_SECONDS, ENEMY_SPEED, ENEMY_TYPES, HEAVY_CONTACT_KNOCKBACK,
  MAP_BOUNDARY_INSET, MAP_HALF_SIZE, MIN_SPAWN_SECONDS, PLAYER_RADIUS,
  DIFFICULTY_SPAWN_STEP, HOUSE_HALF_HEIGHT, HOUSE_HALF_WIDTH, HOUSE_POSITIONS,
} from '../config.js';
import { isBlocked } from './World.js';
import { groundModel } from './ModelGrounding.js';
import { createBossCharge } from './Boss.js';
import { createFlowField } from './FlowField.js';

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

export function firstBlockingHouse(from, to, radius) {
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

export function createEnemies(scene, state, onKill, hooks = {}) {
  const enemies = [];
  let template = null;
  let spawnTimer = 0;
  let nextEnemyId = 0;
  let boss = null;
  let nextBossScore = BOSS_SCORE_STEP;
  let pendingBosses = 0;
  let bossesSpawned = 0;
  let firstBossHintShown = false;
  let bruteIntroduced = false;
  let bruteCooldown = 0;
  const bossFlow = createFlowField(ENEMY_TYPES.boss.radius);
  new GLTFLoader().load('/models/enemy.glb', ({ scene: model }) => {
    template = model;
    enemies.forEach((enemy) => attachModel(enemy));
  });

  function attachModel(enemy) {
    if (!template || enemy.model) return;
    // enemy.glb is skinned: Object3D.clone keeps bones tied to the source scene.
    const model = cloneSkeleton(template);
    const tint = new THREE.Color(ENEMY_TYPES[enemy.type].tint);
    model.traverse((part) => {
      if (!part.isMesh || !part.material) return;
      const cloneMaterial = (source) => {
        const material = source.clone();
        const baseColor = material.color?.clone();
        if (material.color) material.color.multiply(tint);
        enemy.flashMaterials.push({
          material,
          baseColor,
          color: material.color?.clone(),
          emissive: material.emissive?.clone(),
          emissiveIntensity: material.emissiveIntensity,
        });
        return material;
      };
      part.material = Array.isArray(part.material)
        ? part.material.map(cloneMaterial) : cloneMaterial(part.material);
    });
    model.rotation.x = Math.PI / 2;
    model.scale.setScalar(ENEMY_TYPES[enemy.type].scale);
    enemy.group.add(model);
    groundModel(model);
    enemy.group.remove(enemy.placeholder);
    enemy.placeholder.geometry.dispose();
    enemy.placeholder.material.dispose();
    enemy.model = model;
  }

  function spawnAt(type, position) {
    if (enemies.length >= ENEMY_LIMIT || (type === 'boss' && boss)) return null;
    const data = ENEMY_TYPES[type];
    const [x, y] = position;
    if (isBlocked(x, y, data.radius)) return null;
    if (enemies.some((other) => Math.hypot(other.group.position.x - x, other.group.position.y - y) < data.radius + other.radius + 1)) return null;
    const group = new THREE.Group();
    group.position.set(x, y, 0);
    const placeholder = new THREE.Mesh(
      new THREE.SphereGeometry(data.radius * ENEMY_PLACEHOLDER_RADIUS_FACTOR, 12, 8),
      new THREE.MeshStandardMaterial({ color: data.placeholderTint ?? data.tint }),
    );
    placeholder.position.z = data.radius * ENEMY_PLACEHOLDER_RADIUS_FACTOR;
    group.add(placeholder);
    scene.add(group);
    const enemy = {
      type, group, placeholder, model: null, waypoint: null, radius: data.radius,
      hp: type === 'boss' ? Math.ceil(BOSS_HP * BOSS_DIFFICULTY * (1 + bossesSpawned * BOSS_HP_GROWTH)) : data.hp,
      maxHp: type === 'boss' ? Math.ceil(BOSS_HP * BOSS_DIFFICULTY * (1 + bossesSpawned * BOSS_HP_GROWTH)) : data.hp,
      id: nextEnemyId++, flashMaterials: [], phase: 1, summoned: false,
      hitFlashLeft: 0, isDashing: false, dashPath: null, charge: null,
      staggerLeft: 0, staggerLock: 0, contactRecovery: 0, knockback: null, summonClock: 0,
      blockedFor: 0, stepClock: 0,
    };
    enemies.push(enemy);
    if (type === 'boss') {
      boss = enemy;
      bossesSpawned += 1;
      enemy.charge = createBossCharge(scene, enemy, {
        onTelegraph: () => {
          hooks.onBossTelegraph?.(enemy.group.position.clone());
          if (bossesSpawned === 1 && !firstBossHintShown) {
            firstBossHintShown = true;
            hooks.onBossFirstTelegraph?.();
          }
        },
        onCrash: (position, houseIndex) => {
          hooks.onBossCrash?.(position, houseIndex);
          damage(enemy, enemy.maxHp * BOSS_CRASH_DAMAGE, position);
        },
        onDash: (position) => hooks.onBossDash?.(position),
        onStompTelegraph: (position) => hooks.onBossTelegraph?.(position),
        onStomp: (position) => hooks.onBossStomp?.(position),
      });
    }
    attachModel(enemy);
    hooks.onSpawn?.(enemy);
    return enemy;
  }

  function cornerSpawn(type) {
    const startCorner = Math.floor(Math.random() * corners.length);
    const radius = ENEMY_TYPES[type].radius;
    const inset = Math.max(ENEMY_SPAWN_INSET, radius + MAP_BOUNDARY_INSET);
    for (let attempt = 0; attempt < corners.length; attempt++) {
      const candidate = corners[(startCorner + attempt) % corners.length];
      const [cx, cy] = candidate;
      const edge = MAP_HALF_SIZE - inset;
      const jitter = Math.random() * ENEMY_SPAWN_JITTER;
      const enemy = spawnAt(type, [cx * edge, cy * (edge - jitter)]);
      if (enemy) return enemy;
    }
    return null;
  }

  function stage() {
    return [...STAGES].reverse().find((entry) => state.score >= entry.score) ?? STAGES[0];
  }

  function chooseNormalType() {
    const current = stage();
    if (boss || !bruteIntroduced || bruteCooldown > 0 || current.maxBrutes === 0) return 'grunt';
    if (enemies.filter((enemy) => enemy.type === 'brute').length >= current.maxBrutes) return 'grunt';
    const growth = current.number === 3
      ? Math.floor((state.score - current.score) / STAGE_THREE_BRUTE_SHARE_SCORE_STEP) * STAGE_THREE_BRUTE_SHARE_GROWTH : 0;
    return Math.random() < Math.min(STAGE_THREE_BRUTE_SHARE_CAP, current.bruteShare + growth) ? 'brute' : 'grunt';
  }

  function debugSpawn(type, playerPosition, facing) {
    if (!ENEMY_TYPES[type] || (type === 'boss' && boss)) return null;
    const directions = [
      [-facing[0], -facing[1]], [facing[1], -facing[0]],
      [-facing[1], facing[0]], [facing[0], facing[1]],
    ];
    for (const [dx, dy] of directions) {
      for (const distance of DEBUG_ENEMY_SPAWN_DISTANCES) {
        const enemy = spawnAt(type, [
          playerPosition.x + dx * distance,
          playerPosition.y + dy * distance,
        ]);
        if (enemy) return enemy;
      }
    }
    return type === 'boss' ? cornerSpawn(type) : null;
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

  function updateFlash(enemy, dt) {
    if (enemy.hitFlashLeft > 0) {
      enemy.hitFlashLeft = Math.max(0, enemy.hitFlashLeft - dt);
      if (enemy.hitFlashLeft === 0) {
        for (const entry of enemy.flashMaterials) {
          if (entry.color) entry.material.color.copy(entry.color);
          if (entry.emissive) entry.material.emissive.copy(entry.emissive);
          if (entry.emissiveIntensity !== undefined) entry.material.emissiveIntensity = entry.emissiveIntensity;
        }
        if (!enemy.model) enemy.placeholder.material.color.set(ENEMY_TYPES[enemy.type].placeholderTint ?? ENEMY_TYPES[enemy.type].tint);
      }
    }
    const pulse = enemy.hitFlashLeft > 0
      ? 1 + (ENEMY_HIT_SQUASH - 1) * Math.sin(Math.PI * enemy.hitFlashLeft / ENEMY_HIT_FLASH_SECONDS)
      : 1;
    if (enemy.model) enemy.model.scale.setScalar(ENEMY_TYPES[enemy.type].scale * pulse);
    else enemy.placeholder.scale.setScalar(pulse);
    if (enemy.type === 'boss' && enemy.hitFlashLeft === 0) {
      const stunned = enemy.charge?.stunned;
      const tint = new THREE.Color(stunned ? BOSS_STUN_TINT : enemy.phase === 3 ? ENEMY_TYPES.boss.enragedTint : ENEMY_TYPES.boss.tint);
      const white = new THREE.Color('#ffffff');
      const mix = stunned ? BOSS_STUN_WHITE_MIX : enemy.charge?.resting
        ? BOSS_REST_PULSE_BASE + BOSS_REST_PULSE_AMPLITUDE * Math.sin(state.time * BOSS_REST_PULSE_SPEED) : 0;
      for (const entry of enemy.flashMaterials) if (entry.baseColor) entry.material.color.copy(entry.baseColor).multiply(tint).lerp(white, mix);
      if (!enemy.model) enemy.placeholder.material.color.copy(tint).lerp(white, mix);
    }
  }

  function flash(enemy) {
    enemy.hitFlashLeft = ENEMY_HIT_FLASH_SECONDS;
    for (const entry of enemy.flashMaterials) {
      if (entry.color) entry.material.color.set('#ffffff');
      if (entry.emissive) entry.material.emissive.set('#ffffff');
      if (entry.emissiveIntensity !== undefined) entry.material.emissiveIntensity = ENEMY_HIT_FLASH_EMISSIVE;
    }
    if (!enemy.model) enemy.placeholder.material.color.set('#ffffff');
  }

  function knockback(enemy, sourcePosition, distance = HEAVY_CONTACT_KNOCKBACK) {
    if (!enemies.includes(enemy)) return;
    const dx = enemy.group.position.x - sourcePosition.x;
    const dy = enemy.group.position.y - sourcePosition.y;
    const length = Math.hypot(dx, dy);
    const ux = length > 0.001 ? dx / length : 1;
    const uy = length > 0.001 ? dy / length : 0;
    for (const [vx, vy] of [[ux, uy], [-uy, ux], [uy, -ux]]) {
      let moved = 0;
      while (moved < distance) {
        const step = Math.min(ENEMY_KNOCKBACK_STEP, distance - moved);
        const nx = enemy.group.position.x + vx * step;
        const ny = enemy.group.position.y + vy * step;
        if (!canMove(enemy, nx, ny)) break;
        enemy.group.position.set(nx, ny, 0);
        moved += step;
      }
      if (moved > 0) break;
    }
    enemy.waypoint = null;
    enemy.charge?.stopOnContact();
  }

  function contactKnockback(enemy, playerPosition) {
    const currentDistance = Math.hypot(enemy.group.position.x - playerPosition.x, enemy.group.position.y - playerPosition.y);
    const needed = PLAYER_RADIUS + enemy.radius + ENEMY_CONTACT_CLEARANCE - currentDistance;
    knockback(enemy, playerPosition, Math.max(HEAVY_CONTACT_KNOCKBACK, needed));
    if (enemy.type === 'brute') enemy.contactRecovery = BRUTE_ATTACK_RECOVERY;
  }

  function damage(enemy, amount, sourcePosition, spaceAttack = false) {
    if (!enemies.includes(enemy)) return false;
    if (enemy.type === 'boss' && spaceAttack) {
      if (enemy.charge?.stunned) amount *= BOSS_STUN_DAMAGE_MULTIPLIER;
      else if (enemy.charge?.resting) amount *= BOSS_REST_DAMAGE_MULTIPLIER;
    }
    if (enemy.type === 'brute' || enemy.type === 'boss') {
      hooks.onHeavyHit?.(enemy.group.position.clone(), enemy.type, enemy.hp <= amount);
    }
    enemy.hp = Math.max(0, enemy.hp - amount);
    if (enemy.hp === 0) {
      remove(enemy, true, spaceAttack ? 'space' : 'other');
      return true;
    }
    flash(enemy);
    if (enemy.type === 'brute' && enemy.staggerLock <= 0) {
      enemy.staggerLeft = BRUTE_STAGGER_TIME;
      enemy.staggerLock = BRUTE_STAGGER_TIME;
      const dx = enemy.group.position.x - sourcePosition.x;
      const dy = enemy.group.position.y - sourcePosition.y;
      const distance = Math.hypot(dx, dy) || 1;
      enemy.knockback = { x: dx / distance, y: dy / distance,
        left: enemy.radius * BRUTE_HIT_KNOCKBACK_FRACTION, time: BRUTE_KNOCKBACK_SECONDS };
    }
    if (enemy.type === 'boss') {
      if (!enemy.charge?.attacking) enemy.staggerLeft = BOSS_STAGGER_SECONDS;
      const fraction = enemy.hp / enemy.maxHp;
      const nextPhase = fraction < BOSS_PHASE_THREE_THRESHOLD ? 3 : fraction < BOSS_PHASE_TWO_THRESHOLD ? 2 : 1;
      if (nextPhase > enemy.phase) {
        for (let phase = enemy.phase + 1; phase <= nextPhase; phase++) {
          enemy.phase = phase;
          hooks.onBossPhase?.(phase, enemy.group.position.clone(), BOSS_PHASE_LEAF_OFFSETS);
          if (phase === 2) summonGrunts(enemy);
        }
      }
    }
    return false;
  }

  function summonGrunts(enemy) {
    const ordered = [...corners].sort((a, b) =>
      Math.hypot(a[0] * MAP_HALF_SIZE - enemy.group.position.x, a[1] * MAP_HALF_SIZE - enemy.group.position.y) -
      Math.hypot(b[0] * MAP_HALF_SIZE - enemy.group.position.x, b[1] * MAP_HALF_SIZE - enemy.group.position.y));
    let alive = enemies.filter((other) => other.summoned).length;
    for (const [x, y] of ordered) {
      if (alive >= BOSS_SUMMON_COUNT) break;
      const edge = MAP_HALF_SIZE - ENEMY_SPAWN_INSET;
      for (const [insetX, insetY] of BOSS_SUMMON_CORNER_OFFSETS) {
        const summoned = spawnAt('grunt', [x * (edge - insetX), y * (edge - insetY)]);
        if (summoned) { summoned.summoned = true; alive++; break; }
      }
    }
  }

  function update(dt, playerPosition) {
    bruteCooldown = Math.max(0, bruteCooldown - dt);
    if (stage().number >= 2 && !bruteIntroduced && !boss) {
      const introduction = cornerSpawn('brute');
      if (introduction) {
        bruteIntroduced = true;
        bruteCooldown = BRUTE_INTRO_COOLDOWN;
        spawnTimer = 0;
      }
    }
    while (state.score >= nextBossScore) {
      pendingBosses += 1;
      nextBossScore += BOSS_SCORE_STEP;
    }
    if (pendingBosses > 0 && !boss && cornerSpawn('boss')) pendingBosses -= 1;
    const level = Math.floor(state.score / DIFFICULTY_SCORE_INTERVAL);
    const baseInterval = Math.max(MIN_SPAWN_SECONDS, ENEMY_SPAWN_SECONDS - level * DIFFICULTY_SPAWN_STEP);
    const interval = boss ? baseInterval / BOSS_NORMAL_SPAWN_RATE : baseInterval;
    spawnTimer += dt;
    while (spawnTimer >= interval) {
      spawnTimer -= interval;
      cornerSpawn(chooseNormalType());
    }
    const difficultySpeed = 1 + level * DIFFICULTY_SPEED_STEP;
    const nearestBrutes = enemies.filter((enemy) => enemy.type === 'brute')
      .map((enemy) => ({ enemy, distance: Math.hypot(enemy.group.position.x - playerPosition.x, enemy.group.position.y - playerPosition.y) }))
      .filter(({ distance }) => distance <= AUDIO_BRUTE_HEARING_RANGE)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, AUDIO_NEAREST_BRUTES)
      .map(({ enemy }) => enemy);
    const hash = spatialHash();
    for (const enemy of [...enemies]) {
      if (enemy.tongueCaptured) continue;
      enemy.staggerLock = Math.max(0, enemy.staggerLock - dt);
      enemy.staggerLeft = Math.max(0, enemy.staggerLeft - dt);
      enemy.contactRecovery = Math.max(0, enemy.contactRecovery - dt);
      updateFlash(enemy, dt);
      if (enemy.type === 'boss' && enemy.phase >= 2) {
        enemy.summonClock += dt;
        if (enemy.summonClock >= BOSS_SUMMON_INTERVAL) {
          enemy.summonClock = 0;
          summonGrunts(enemy);
        }
      }
      if (enemy.charge?.update(dt, playerPosition)) continue;
      if (enemy.knockback) {
        const kick = enemy.knockback;
        const travel = Math.min(kick.left, kick.left * dt / Math.max(kick.time, dt));
        const nx = enemy.group.position.x + kick.x * travel;
        const ny = enemy.group.position.y + kick.y * travel;
        if (canMove(enemy, nx, ny)) enemy.group.position.set(nx, ny, 0);
        kick.left -= travel;
        kick.time -= dt;
        if (kick.time <= 0 || kick.left <= 0) enemy.knockback = null;
        continue;
      }
      if (enemy.staggerLeft > 0) continue;
      let target;
      if (enemy.type === 'boss') {
        target = bossFlow.nextPosition(enemy.group.position, playerPosition) ?? playerPosition;
      } else {
        if (enemy.waypoint && Math.hypot(enemy.waypoint.x - enemy.group.position.x, enemy.waypoint.y - enemy.group.position.y) < ENEMY_WAYPOINT_RADIUS) {
          enemy.waypoint = null;
        }
        if (!enemy.waypoint) enemy.waypoint = nextWaypoint(enemy.group.position, playerPosition, enemy.radius);
        target = enemy.waypoint ?? playerPosition;
      }
      const dx = target.x - enemy.group.position.x;
      const dy = target.y - enemy.group.position.y;
      const length = Math.hypot(dx, dy);
      if (length < 0.001) continue;
      const speed = ENEMY_SPEED * ENEMY_TYPES[enemy.type].speedMultiplier * difficultySpeed *
        (enemy.type === 'boss' ? BOSS_DIFFICULTY * (enemy.phase === 3 ? BOSS_ENRAGE_SPEED : 1) : 1);
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
      const beforeX = enemy.group.position.x;
      const beforeY = enemy.group.position.y;
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
      if (enemy.type === 'boss') {
        const moved = Math.hypot(enemy.group.position.x - beforeX, enemy.group.position.y - beforeY);
        enemy.blockedFor = moved < 0.001 ? enemy.blockedFor + dt : 0;
        if (enemy.blockedFor >= BOSS_BLOCK_CANCEL_SECONDS) {
          enemy.charge.cancelBlocked();
          enemy.blockedFor = 0;
        }
        if (moved > 0) {
          enemy.stepClock += dt;
          if (enemy.stepClock >= BOSS_STEP_SECONDS) {
            enemy.stepClock = 0;
            hooks.onFootstep?.(enemy.group.position.clone(), 'boss');
          }
        }
      } else if (enemy.type === 'brute' && nearestBrutes.includes(enemy)) {
        const moved = Math.hypot(enemy.group.position.x - beforeX, enemy.group.position.y - beforeY);
        if (moved > 0) {
          enemy.stepClock += dt;
          if (enemy.stepClock >= BRUTE_STEP_SECONDS) {
            enemy.stepClock = 0;
            hooks.onFootstep?.(enemy.group.position.clone(), 'brute');
          }
        }
      }
    }
  }

  function remove(enemy, scored = true, cause = 'other') {
    const index = enemies.indexOf(enemy);
    if (index < 0) return false;
    enemies.splice(index, 1);
    enemy.charge?.dispose();
    if (enemy === boss) {
      boss = null;
      if (scored) {
        for (const other of [...enemies]) remove(other, false);
        hooks.onBossDefeat?.();
      }
    }
    scene.remove(enemy.group);
    if (!enemy.model) {
      enemy.placeholder.geometry.dispose();
      enemy.placeholder.material.dispose();
    }
    if (enemy.model) enemy.model.traverse((part) => {
      if (part.isMesh) {
        if (Array.isArray(part.material)) part.material.forEach((material) => material.dispose());
        else part.material.dispose();
      }
    });
    if (scored) {
      state.kills += 1;
      state.score += ENEMY_TYPES[enemy.type].scoreValue + (enemy.type === 'boss' ? BOSS_KILL_SCORE : 0);
      onKill(enemy.group.position.clone(), enemy, cause);
      if (enemy.type === 'boss') hooks.onBossResolved?.();
    }
    return true;
  }

  function clear(spawnAtStart = false) {
    for (const enemy of [...enemies]) remove(enemy, false);
    spawnTimer = 0;
    nextBossScore = BOSS_SCORE_STEP;
    pendingBosses = 0;
    bossesSpawned = 0;
    firstBossHintShown = false;
    bruteIntroduced = false;
    bruteCooldown = 0;
    nextEnemyId = 0;
    if (spawnAtStart) cornerSpawn('grunt');
  }
  cornerSpawn('grunt');
  return { enemies, update, remove, damage, contactKnockback, clear, debugSpawn,
    get boss() { return boss; }, get stage() { return stage(); } };
}
