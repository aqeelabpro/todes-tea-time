import * as THREE from 'three';
import {
  BOSS_BLOCK_CANCEL_SECONDS, BOSS_CHAIN_TELEGRAPH_SECONDS, BOSS_CHARGE_INTERVAL,
  BOSS_DASH_SPEED, BOSS_DASH_STEP, BOSS_DIFFICULTY, BOSS_ENRAGED_REST_MULTIPLIER,
  BOSS_ENRAGED_STOMP_MULTIPLIER, BOSS_MIN_ATTACK_GAP, BOSS_REST_SECONDS,
  BOSS_STOMP_RADIUS, BOSS_STOMP_SECONDS, BOSS_TELEGRAPH_BASE_OPACITY,
  BOSS_TELEGRAPH_COLOR, BOSS_TELEGRAPH_PULSE_OPACITY, BOSS_TELEGRAPH_PULSE_SPEED,
  BOSS_TELEGRAPH_SECONDS, BOSS_TELEGRAPH_WIDTH,
  BOSS_CRASH_COOLDOWN, BOSS_STUN_TIME,
} from '../config.js';
import { houseAt, isBlocked } from './World.js';

export function createBossCharge(scene, enemy, hooks = {}) {
  let mode = 'chase';
  let attackClock = 0;
  let remaining = 0;
  let target = null;
  let telegraph = null;
  let blockedFor = 0;
  let chained = false;
  let nextAttack = 'charge';
  let attackGap = 0;
  let stompCenter = null;
  let crashCooldownLeft = 0;

  function clearTelegraph() {
    if (!telegraph) return;
    for (const part of telegraph.children) {
      part.geometry.dispose();
      part.material.dispose();
    }
    scene.remove(telegraph);
    telegraph = null;
  }

  function rest() {
    clearTelegraph();
    mode = 'rest';
    remaining = BOSS_REST_SECONDS * (enemy.phase === 3 ? BOSS_ENRAGED_REST_MULTIPLIER : 1);
    attackClock = 0;
    attackGap = BOSS_MIN_ATTACK_GAP;
    blockedFor = 0;
  }

  function crash(houseIndex) {
    clearTelegraph();
    mode = 'stun';
    remaining = BOSS_STUN_TIME;
    crashCooldownLeft = BOSS_CRASH_COOLDOWN;
    attackClock = 0;
    attackGap = BOSS_MIN_ATTACK_GAP;
    nextAttack = 'charge';
    chained = false;
    blockedFor = 0;
    hooks.onCrash?.(enemy.group.position.clone(), houseIndex);
  }

  function line(playerPosition, seconds = BOSS_TELEGRAPH_SECONDS) {
    clearTelegraph();
    mode = 'chargeTelegraph';
    remaining = seconds;
    target = new THREE.Vector2(playerPosition.x, playerPosition.y);
    const start = enemy.group.position;
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const length = Math.hypot(dx, dy);
    telegraph = new THREE.Group();
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(length + BOSS_TELEGRAPH_WIDTH, BOSS_TELEGRAPH_WIDTH),
      new THREE.MeshBasicMaterial({ color: BOSS_TELEGRAPH_COLOR, transparent: true, opacity: BOSS_TELEGRAPH_BASE_OPACITY, depthWrite: false, side: THREE.DoubleSide }));
    strip.position.set(start.x + dx / 2, start.y + dy / 2, 0.3);
    strip.rotation.z = Math.atan2(dy, dx);
    telegraph.add(strip);
    scene.add(telegraph);
    hooks.onTelegraph?.();
  }

  function stomp() {
    clearTelegraph();
    mode = 'stompTelegraph';
    remaining = BOSS_STOMP_SECONDS;
    stompCenter = enemy.group.position.clone();
    const radius = BOSS_STOMP_RADIUS * (enemy.phase === 3 ? BOSS_ENRAGED_STOMP_MULTIPLIER : 1);
    telegraph = new THREE.Group();
    telegraph.position.set(stompCenter.x, stompCenter.y, 0.35);
    const fill = new THREE.Mesh(new THREE.CircleGeometry(radius, 64),
      new THREE.MeshBasicMaterial({ color: BOSS_TELEGRAPH_COLOR, transparent: true, opacity: BOSS_TELEGRAPH_BASE_OPACITY, depthWrite: false, side: THREE.DoubleSide }));
    fill.scale.setScalar(0.01);
    const border = new THREE.Mesh(new THREE.RingGeometry(radius - 2, radius, 64),
      new THREE.MeshBasicMaterial({ color: BOSS_TELEGRAPH_COLOR, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    telegraph.add(fill, border);
    scene.add(telegraph);
    hooks.onStompTelegraph?.(stompCenter.clone());
  }

  function update(dt, playerPosition) {
    crashCooldownLeft = Math.max(0, crashCooldownLeft - dt);
    enemy.isDashing = false;
    enemy.dashPath = null;
    enemy.stompArea = null;
    if (mode === 'stun') {
      remaining = Math.max(0, remaining - dt);
      if (remaining === 0) mode = 'chase';
      return true;
    }
    if (mode === 'rest') {
      remaining = Math.max(0, remaining - dt);
      if (remaining === 0) mode = 'chase';
      return true;
    }
    if (mode === 'chase') {
      attackGap = Math.max(0, attackGap - dt);
      attackClock += dt * BOSS_DIFFICULTY;
      if (attackClock < BOSS_CHARGE_INTERVAL || attackGap > 0) return false;
      chained = false;
      if (enemy.phase >= 2 && nextAttack === 'stomp') stomp();
      else line(playerPosition);
      nextAttack = enemy.phase >= 2 && nextAttack === 'charge' ? 'stomp' : 'charge';
      return true;
    }
    if (mode === 'chargeTelegraph' || mode === 'stompTelegraph') {
      remaining = Math.max(0, remaining - dt);
      if (mode === 'chargeTelegraph') {
        telegraph.children[0].material.opacity = BOSS_TELEGRAPH_BASE_OPACITY + BOSS_TELEGRAPH_PULSE_OPACITY *
          (1 + Math.sin(remaining * BOSS_TELEGRAPH_PULSE_SPEED)) / 2;
        if (remaining === 0) {
          clearTelegraph();
          mode = 'dash';
          hooks.onDash?.(enemy.group.position.clone());
        }
      } else {
        telegraph.children[0].scale.setScalar(Math.max(0.01, 1 - remaining / BOSS_STOMP_SECONDS));
        if (remaining === 0) {
          enemy.stompArea = { center: stompCenter.clone(), radius: BOSS_STOMP_RADIUS * (enemy.phase === 3 ? BOSS_ENRAGED_STOMP_MULTIPLIER : 1) };
          hooks.onStomp?.(stompCenter.clone());
          rest();
        }
      }
      return true;
    }
    const from = enemy.group.position.clone();
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) {
      if (enemy.phase === 3 && !chained) { chained = true; line(playerPosition, BOSS_CHAIN_TELEGRAPH_SECONDS); }
      else rest();
      return true;
    }
    const travel = Math.min(distance, BOSS_DASH_SPEED * BOSS_DIFFICULTY * dt);
    let moved = 0;
    let hitHouse = -1;
    while (moved < travel) {
      const step = Math.min(BOSS_DASH_STEP, travel - moved);
      const nx = enemy.group.position.x + dx / distance * step;
      const ny = enemy.group.position.y + dy / distance * step;
      if (isBlocked(nx, ny, enemy.radius)) {
        hitHouse = houseAt(nx, ny, enemy.radius);
        break;
      }
      enemy.group.position.set(nx, ny, 0);
      moved += step;
    }
    enemy.isDashing = moved > 0;
    if (moved > 0) enemy.dashPath = { from, to: enemy.group.position.clone() };
    if (hitHouse >= 0 && crashCooldownLeft === 0) {
      crash(hitHouse);
      return true;
    }
    blockedFor = moved === 0 ? blockedFor + dt : 0;
    if (blockedFor >= BOSS_BLOCK_CANCEL_SECONDS || moved < travel || moved >= distance - 0.001) {
      if (enemy.phase === 3 && !chained && blockedFor < BOSS_BLOCK_CANCEL_SECONDS && moved >= distance - 0.001) {
        chained = true;
        line(playerPosition, BOSS_CHAIN_TELEGRAPH_SECONDS);
      } else rest();
    }
    return true;
  }

  return {
    update, dispose: clearTelegraph,
    stopOnContact() { if (mode === 'dash') rest(); },
    cancelBlocked() { if (mode === 'chase') rest(); },
    get resting() { return mode === 'rest'; },
    get stunned() { return mode === 'stun'; },
    get attacking() { return mode !== 'chase' && mode !== 'rest' && mode !== 'stun'; },
  };
}
