import * as THREE from 'three';
import './style.css';
import { createGameState } from './GameState.js';
import {
  ATTACK_COOLDOWN, ATTACK_RADIUS, CONTACT_RADIUS, GREEN_TEA_SPEED_MULTIPLIER,
  SURVIVAL_SCORE_PER_SECOND,
} from './config.js';
import { createWorld } from './components/World.js';
import { createPlayer } from './components/Player.js';
import { createEnemies } from './components/Enemies.js';
import { createTea } from './components/Tea.js';
import { createHUD } from './components/HUD.js';

const canvas = document.querySelector('.game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
createWorld(scene);
const state = createGameState();
const player = createPlayer(scene);
const hud = createHUD();
let tea;
const enemies = createEnemies(scene, state, (position) => tea.drop(position));
tea = createTea(scene, player, enemies, () => hud.update(state, tea));
let attackCooldown = 0;
const clock = new THREE.Clock();

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  player.camera.aspect = innerWidth / innerHeight;
  player.camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function gameOver() {
  state.mode = 'over';
  enemies.clear();
  tea.reset();
  attackCooldown = 0;
  hud.setOverlay('over', state);
}

function reset() {
  enemies.clear(true);
  tea.reset();
  player.reset();
  Object.assign(state, createGameState());
  attackCooldown = 0;
  hud.update(state, tea);
  hud.setOverlay('playing', state);
}

function attack() {
  if (attackCooldown > 0) return;
  attackCooldown = ATTACK_COOLDOWN;
  const center = player.group.getWorldPosition(new THREE.Vector3());
  tea.effect(ATTACK_RADIUS, '#d6f6a0', center);
  for (const enemy of [...enemies.enemies]) {
    const enemyPosition = enemy.group.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(enemyPosition.x - center.x, enemyPosition.y - center.y) <= ATTACK_RADIUS) {
      enemies.remove(enemy);
    }
  }
}

addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
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
    attackCooldown = Math.max(0, attackCooldown - dt);
    player.update(dt, tea.greenTeaLeft > 0 ? GREEN_TEA_SPEED_MULTIPLIER : 1);
    enemies.update(dt, player.group.position);
    tea.update(dt, state.time);
    for (const enemy of [...enemies.enemies]) {
      if (Math.hypot(enemy.group.position.x - player.group.position.x, enemy.group.position.y - player.group.position.y) <= CONTACT_RADIUS) {
        if (tea.contact(enemy) === 'fatal') {
          gameOver();
          break;
        }
      }
    }
    hud.update(state, tea);
  }
  renderer.render(scene, player.camera);
}
requestAnimationFrame(frame);
