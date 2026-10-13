import * as THREE from 'three';
import './style.css';
import { createGameState, getDisplayedScore } from './GameState.js';
import {
  CONTACT_RADIUS, GREEN_TEA_SPEED_MULTIPLIER, HIT_INVULNERABILITY,
  INVULNERABILITY_BLINK_SECONDS, SHIELD_INVULNERABILITY_SECONDS, START_LIVES,
  SURVIVAL_SCORE_PER_SECOND, UPGRADE_CARD_COUNT,
} from './config.js';
import { createWorld } from './components/World.js';
import { createPlayer } from './components/Player.js';
import { createEnemies } from './components/Enemies.js';
import { createTea } from './components/Tea.js';
import { createHUD } from './components/HUD.js';
import { createUpgrades } from './components/Upgrades.js';
import { createUpgradeDebug } from './components/UpgradeDebug.js';

const canvas = document.querySelector('.game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
createWorld(scene);
const state = createGameState();
const player = createPlayer(scene);
const hud = createHUD();
let tea;
let upgrades;
const enemies = createEnemies(scene, state, (position) => {
  tea.drop(position);
  upgrades.onKill(position);
});
tea = createTea(scene, player, enemies, () => hud.update(state, tea), {
  getDropChance: () => upgrades.dropChance,
  getPickupRadius: () => upgrades.pickupRadius,
  onBrewEvent: (kind, event, detail) => hud.onBrewEvent(kind, event, detail),
});
upgrades = createUpgrades(state, (position, radius) => {
  tea.effect(radius, '#f4eaa8', position);
  for (const enemy of [...enemies.enemies]) {
    const enemyPosition = enemy.group.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(enemyPosition.x - position.x, enemyPosition.y - position.y) <= radius) enemies.remove(enemy);
  }
});
let attackCooldown = 0;
const clock = new THREE.Clock();

function refreshScoreAndCheckUpgrades() {
  hud.update(state, tea);
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
  state.mode = 'over';
  state.lives = START_LIVES;
  state.maxLives = START_LIVES;
  state.hitInvulnerableLeft = 0;
  enemies.clear();
  tea.reset();
  hud.clearBrews();
  player.setVisible(true);
  upgrades.reset();
  attackCooldown = 0;
  hud.update(state, tea);
  hud.setOverlay('over', state);
}

function reset() {
  enemies.clear(true);
  tea.reset();
  hud.clearBrews();
  hud.clearHitFlash();
  player.reset();
  Object.assign(state, createGameState());
  upgrades.reset();
  attackCooldown = 0;
  hud.update(state, tea);
  hud.setOverlay('playing', state);
}

function attack() {
  if (attackCooldown > 0) return;
  attackCooldown = upgrades.attackCooldown;
  const center = player.group.getWorldPosition(new THREE.Vector3());
  const radius = upgrades.attackRadius;
  tea.effect(radius, '#d6f6a0', center);
  for (const enemy of [...enemies.enemies]) {
    const enemyPosition = enemy.group.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(enemyPosition.x - center.x, enemyPosition.y - center.y) <= radius) {
      enemies.remove(enemy);
    }
  }
  refreshScoreAndCheckUpgrades();
}

addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
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
  if (event.code === 'Space') attack();
  else player.queueMove(event.code);
});

function frame() {
  requestAnimationFrame(frame);
  // Read the clock even while paused so resuming never catches up on frozen time.
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === 'playing') {
    state.time += dt;
    const oldSurvival = state.survivalScore;
    state.survivalScore = Math.floor(state.time * SURVIVAL_SCORE_PER_SECOND);
    state.score += state.survivalScore - oldSurvival;
    refreshScoreAndCheckUpgrades();
    if (state.mode === 'playing') {
      attackCooldown = Math.max(0, attackCooldown - dt);
      state.hitInvulnerableLeft = Math.max(0, state.hitInvulnerableLeft - dt);
      hud.tickHitFlash(dt);
      player.update(dt, (tea.greenTeaLeft > 0 ? GREEN_TEA_SPEED_MULTIPLIER : 1) * upgrades.moveMultiplier);
      enemies.update(dt, player.group.position);
      tea.update(dt, state.time);
      refreshScoreAndCheckUpgrades();
      if (state.mode === 'playing') {
        for (const enemy of [...enemies.enemies]) {
          if (!enemies.enemies.includes(enemy)) continue;
          if (Math.hypot(enemy.group.position.x - player.group.position.x, enemy.group.position.y - player.group.position.y) > CONTACT_RADIUS) continue;
          if (state.hitInvulnerableLeft > 0) {
            enemies.remove(enemy);
            continue;
          }
          if (tea.contact(enemy) === 'fatal') {
            enemies.remove(enemy);
            state.lives -= 1;
            hud.flashHit();
            if (state.lives === 0) {
              gameOver();
              break;
            }
            state.hitInvulnerableLeft = HIT_INVULNERABILITY;
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
  upgradeDebug?.update();
  renderer.render(scene, player.camera);
}
requestAnimationFrame(frame);
