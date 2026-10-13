import * as THREE from 'three';
import './style.css';
import { createGameState, getDisplayedScore } from './GameState.js';
import {
  BOSS_DASH_DAMAGE, BOSS_STOMP_DAMAGE, BOSS_LEAF_OFFSETS, BOSS_PHASE_BEAT_SCALE,
  BOSS_PHASE_SHAKE_SECONDS, BOSS_PHASE_SHAKE_DISTANCE, BOSS_DEFEAT_SHAKE_SECONDS,
  BOSS_DEFEAT_SHAKE_DISTANCE, CAMERA_POSITION, ENEMY_TYPES, GREEN_TEA_SPEED_MULTIPLIER,
  BOSS_CRASH_SHAKE_SECONDS, BOSS_CRASH_SHAKE_DISTANCE,
  HIT_INVULNERABILITY, INVULNERABILITY_BLINK_SECONDS, PLAYER_RADIUS,
  SHIELD_INVULNERABILITY_SECONDS, START_LIVES, SURVIVAL_SCORE_PER_SECOND,
  TONGUE_LEAF_BONUS, UPGRADE_CARD_COUNT, WIN_BOSS_COUNT,
} from './config.js';
import { createRunStats } from './RunStats.js';
import { createWorld, isBlocked } from './components/World.js';
import { createPlayer } from './components/Player.js';
import { createEnemies } from './components/Enemies.js';
import { createTea } from './components/Tea.js';
import { createHUD } from './components/HUD.js';
import { createUpgrades } from './components/Upgrades.js';
import { createUpgradeDebug } from './components/UpgradeDebug.js';
import { createTongue } from './components/Tongue.js';
import { createBossCrashEffects } from './components/BossCrashEffects.js';

const canvas = document.querySelector('.game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const world = createWorld(scene);
const crashEffects = createBossCrashEffects(scene);
const state = createGameState();
const runStats = createRunStats();
const player = createPlayer(scene);
const hud = createHUD();
let tea;
let upgrades;
let shakeLeft = 0;
let shakeDuration = 0;
let shakeDistance = 0;
function shake(duration, distance) {
  shakeLeft = duration;
  shakeDuration = duration;
  shakeDistance = distance;
}
const enemies = createEnemies(scene, state, (position, enemy, cause) => {
  runStats.recordKill(enemy.type);
  if (enemy.type === 'boss') {
    for (const [x, y] of BOSS_LEAF_OFFSETS) tea.drop(new THREE.Vector3(position.x + x, position.y + y, 0), true);
  } else {
    const dropChance = ENEMY_TYPES[enemy.type].leafDropChance * (cause === 'tongue' ? TONGUE_LEAF_BONUS : 1);
    tea.drop(position, false, dropChance);
  }
  if (cause === 'space') upgrades.onKill(position);
}, {
  onBossPhase: (phase, position, offsets) => {
    const center = player.group.getWorldPosition(new THREE.Vector3());
    const [x, y] = offsets.find(([dx, dy]) => !isBlocked(center.x + dx, center.y + dy, PLAYER_RADIUS)) ?? offsets.at(-1);
    tea.drop(new THREE.Vector3(center.x + x, center.y + y, 0), true, undefined, 'Chamomile');
    if (phase === 3) state.lives = Math.min(state.maxLives, state.lives + 1);
    shake(BOSS_PHASE_SHAKE_SECONDS, BOSS_PHASE_SHAKE_DISTANCE);
    hud.update(state, tea, enemies.boss);
  },
  onBossDefeat: () => {
    hud.clearBossHint();
    shake(BOSS_DEFEAT_SHAKE_SECONDS, BOSS_DEFEAT_SHAKE_DISTANCE);
  },
  onBossFirstTelegraph: () => hud.showBossHint(),
  onBossCrash: (position, houseIndex) => {
    runStats.recordCrash();
    world.flashHouse(houseIndex);
    crashEffects.burst(position);
    shake(BOSS_CRASH_SHAKE_SECONDS, BOSS_CRASH_SHAKE_DISTANCE);
  },
  onBossResolved: () => {
    if (!state.victoryShown && runStats.bossesDefeated >= WIN_BOSS_COUNT) showVictory();
  },
});
tea = createTea(scene, player, enemies, () => hud.update(state, tea, enemies.boss), {
  getDropChance: (baseChance) => upgrades.dropChanceFor(baseChance),
  getPickupRadius: () => upgrades.pickupRadius,
  onBrewEvent: (kind, event, detail) => hud.onBrewEvent(kind, event, detail),
  onLeafCollected: () => runStats.recordLeaf(),
});
upgrades = createUpgrades(state, (position, radius) => {
  tea.effect(radius, '#f4eaa8', position);
  for (const enemy of [...enemies.enemies]) {
    const enemyPosition = enemy.group.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(enemyPosition.x - position.x, enemyPosition.y - position.y) - enemy.radius <= radius) enemies.damage(enemy, 1, position);
  }
}, (name) => runStats.recordUpgrade(name));
const tongue = createTongue(scene, player, enemies, upgrades);
hud.setTongueStatus(tongue.cooldownLeft, tongue.cooldown);
let attackCooldown = 0;
const clock = new THREE.Clock();

function refreshScoreAndCheckUpgrades() {
  hud.update(state, tea, enemies.boss);
  upgrades.checkThresholds();
}

const upgradeDebug = import.meta.env.DEV ? createUpgradeDebug(state, upgrades, () => {
  state.score = Math.max(getDisplayedScore(state), upgrades.nextThreshold);
  refreshScoreAndCheckUpgrades();
}) : null;

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  player.camera.aspect = innerWidth / innerHeight;
  player.camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function gameOver() {
  const finishedStats = runStats.snapshot(state);
  state.bossRemainingPercent = enemies.boss ? Math.ceil(enemies.boss.hp / enemies.boss.maxHp * 100) : null;
  state.mode = 'over';
  state.endless = false;
  state.victoryShown = false;
  state.lives = START_LIVES;
  state.maxLives = START_LIVES;
  state.hitInvulnerableLeft = 0;
  tongue.reset();
  enemies.clear();
  crashEffects.reset();
  world.reset();
  hud.clearBossHint();
  tea.reset();
  hud.clearBrews();
  player.setVisible(true);
  upgrades.reset();
  attackCooldown = 0;
  shakeLeft = 0;
  player.camera.position.set(...CAMERA_POSITION);
  hud.setTongueStatus(tongue.cooldownLeft, tongue.cooldown);
  hud.update(state, tea, enemies.boss);
  hud.setOverlay('over', state, finishedStats);
  runStats.reset();
}

function reset() {
  tongue.reset();
  enemies.clear(true);
  crashEffects.reset();
  world.reset();
  hud.clearBossHint();
  tea.reset();
  hud.clearBrews();
  hud.clearHitFlash();
  player.reset();
  Object.assign(state, createGameState());
  runStats.reset();
  upgrades.reset();
  attackCooldown = 0;
  shakeLeft = 0;
  player.camera.position.set(...CAMERA_POSITION);
  hud.setTongueStatus(tongue.cooldownLeft, tongue.cooldown);
  hud.update(state, tea, enemies.boss);
  hud.setOverlay('playing', state);
}

function showVictory() {
  if (state.victoryShown || state.mode !== 'playing') return;
  state.victoryShown = true;
  state.mode = 'victory';
  hud.update(state, tea, enemies.boss);
  hud.setOverlay('victory', state, runStats.snapshot(state));
}

function chooseVictory(choice) {
  if (state.mode !== 'victory') return;
  if (choice === 'restart') reset();
  if (choice === 'continue') {
    state.endless = true;
    state.mode = 'playing';
    hud.update(state, tea, enemies.boss);
    hud.setOverlay('playing', state);
  }
}
hud.onVictoryChoice(chooseVictory);

function attack() {
  if (attackCooldown > 0) return;
  attackCooldown = upgrades.attackCooldown;
  const center = player.group.getWorldPosition(new THREE.Vector3());
  const radius = upgrades.attackRadius;
  tea.effect(radius, '#d6f6a0', center);
  for (const enemy of [...enemies.enemies]) {
    const enemyPosition = enemy.group.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(enemyPosition.x - center.x, enemyPosition.y - center.y) - enemy.radius <= radius) {
      enemies.damage(enemy, 1, center, true);
    }
  }
  refreshScoreAndCheckUpgrades();
}

function enemyTouchesPlayer(enemy) {
  const playerPosition = player.group.position;
  const radius = PLAYER_RADIUS + enemy.radius;
  if (Math.hypot(enemy.group.position.x - playerPosition.x, enemy.group.position.y - playerPosition.y) <= radius) return true;
  if (!enemy.isDashing || !enemy.dashPath) return false;
  const { from, to } = enemy.dashPath;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return false;
  const progress = Math.max(0, Math.min(1, ((playerPosition.x - from.x) * dx + (playerPosition.y - from.y) * dy) / lengthSquared));
  return Math.hypot(from.x + progress * dx - playerPosition.x, from.y + progress * dy - playerPosition.y) <= radius;
}

const consumedKeys = new Set();
addEventListener('keyup', (event) => consumedKeys.delete(event.code));
addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code) ||
      (state.mode === 'victory' && event.code === 'Enter')) event.preventDefault();
  if (consumedKeys.has(event.code)) return;
  if (state.mode === 'victory') {
    if (!event.repeat && (event.code === 'Space' || event.code === 'Enter')) {
      consumedKeys.add(event.code);
      chooseVictory(event.code === 'Space' ? 'restart' : 'continue');
    }
    return;
  }
  if (state.mode === 'upgrade') {
    const choice = /^(Digit|Numpad)[1-9]$/.exec(event.code);
    if (choice && !event.repeat) {
      const index = Number(event.code.at(-1)) - 1;
      if (index < UPGRADE_CARD_COUNT) upgrades.choose(index);
    }
    return;
  }
  if (event.code === 'KeyP' && !event.repeat && state.mode !== 'over') {
    state.mode = state.mode === 'paused' ? 'playing' : 'paused';
    hud.setOverlay(state.mode, state);
    return;
  }
  if (state.mode === 'over' && event.code === 'Space') return reset();
  if (state.mode !== 'playing') return;
  if (import.meta.env.DEV && !event.repeat) {
    if (event.code === 'KeyV') {
      showVictory();
      return;
    }
    const debugType = { KeyB: 'boss', KeyN: 'brute' }[event.code];
    if (debugType) {
      enemies.debugSpawn(debugType, player.group.position, player.facing);
      hud.update(state, tea, enemies.boss);
      return;
    }
  }
  if (event.code === 'Space') attack();
  else if (event.code === 'KeyE') {
    tongue.fire();
    hud.setTongueStatus(tongue.cooldownLeft, tongue.cooldown);
  }
  else player.queueMove(event.code);
});

function frame() {
  requestAnimationFrame(frame);
  // Read the clock even while paused so resuming never catches up on frozen time.
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === 'playing') {
    const gameDt = enemies.beatLeft > 0 ? dt * BOSS_PHASE_BEAT_SCALE : dt;
    state.time += gameDt;
    runStats.setTime(state.time);
    const oldSurvival = state.survivalScore;
    state.survivalScore = Math.floor(state.time * SURVIVAL_SCORE_PER_SECOND);
    state.score += state.survivalScore - oldSurvival;
    refreshScoreAndCheckUpgrades();
    if (state.mode === 'playing') {
      attackCooldown = Math.max(0, attackCooldown - gameDt);
      state.hitInvulnerableLeft = Math.max(0, state.hitInvulnerableLeft - gameDt);
      hud.tickHitFlash(gameDt);
      hud.tickBossHint(gameDt);
      player.update(gameDt, (tea.greenTeaLeft > 0 ? GREEN_TEA_SPEED_MULTIPLIER : 1) * upgrades.moveMultiplier);
      tongue.update(gameDt);
      hud.setTongueStatus(tongue.cooldownLeft, tongue.cooldown);
      world.update(gameDt);
      crashEffects.update(gameDt);
      enemies.update(gameDt, player.group.position, dt);
      tea.update(gameDt, state.time);
      refreshScoreAndCheckUpgrades();
      if (state.mode === 'playing') {
        for (const enemy of [...enemies.enemies]) {
          if (!enemies.enemies.includes(enemy)) continue;
          if (enemy.tongueCaptured) continue;
          if (!enemyTouchesPlayer(enemy)) continue;
          const heavy = enemy.type === 'brute' || enemy.type === 'boss';
          if (enemy.type === 'brute' && enemy.contactRecovery > 0) continue;
          if (state.hitInvulnerableLeft > 0) {
            if (heavy) {
              if (enemy.type === 'brute') enemies.contactKnockback(enemy, player.group.position);
            }
            else enemies.remove(enemy);
            continue;
          }
          const contact = tea.contact(enemy, !heavy);
          if (contact !== 'fatal') {
            if (heavy) enemies.contactKnockback(enemy, player.group.position);
            continue;
          }
          const damage = enemy.type === 'boss' && enemy.isDashing ? BOSS_DASH_DAMAGE : 1;
          if (heavy) enemies.contactKnockback(enemy, player.group.position);
          else enemies.remove(enemy);
          state.lives = Math.max(0, state.lives - damage);
          runStats.recordDamage(damage);
          hud.flashHit();
          if (state.lives === 0) {
            gameOver();
            break;
          }
          state.hitInvulnerableLeft = HIT_INVULNERABILITY;
        }
        const boss = enemies.boss;
        if (state.mode === 'playing' && boss?.stompArea) {
          const { center, radius } = boss.stompArea;
          boss.stompArea = null;
          if (Math.hypot(center.x - player.group.position.x, center.y - player.group.position.y) <= radius &&
              state.hitInvulnerableLeft === 0 && tea.contact(boss, false) === 'fatal') {
            state.lives = Math.max(0, state.lives - BOSS_STOMP_DAMAGE);
            runStats.recordDamage(BOSS_STOMP_DAMAGE);
            hud.flashHit();
            if (state.lives === 0) gameOver();
            else state.hitInvulnerableLeft = HIT_INVULNERABILITY;
          }
        }
        refreshScoreAndCheckUpgrades();
      }
      const hitSafe = state.hitInvulnerableLeft > 0;
      const safeTime = hitSafe ? state.hitInvulnerableLeft : tea.invulnerableLeft;
      const safeDuration = hitSafe ? HIT_INVULNERABILITY : SHIELD_INVULNERABILITY_SECONDS;
      player.setVisible(safeTime === 0 || Math.floor((safeDuration - safeTime) / INVULNERABILITY_BLINK_SECONDS) % 2 === 0);
    }
  }
  if (state.mode === 'over') hud.tickHitFlash(dt);
  if (state.mode === 'playing' && shakeLeft > 0) {
    shakeLeft = Math.max(0, shakeLeft - dt);
    const strength = shakeDistance * shakeLeft / shakeDuration;
    player.camera.position.set(CAMERA_POSITION[0] + (Math.random() * 2 - 1) * strength,
      CAMERA_POSITION[1] + (Math.random() * 2 - 1) * strength, CAMERA_POSITION[2]);
  } else if (shakeLeft === 0) player.camera.position.set(...CAMERA_POSITION);
  upgradeDebug?.update();
  renderer.render(scene, player.camera);
}
requestAnimationFrame(frame);
