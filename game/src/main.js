import * as THREE from 'three';
import './style.css';
import { createGameState } from './GameState.js';
import {
  BOSS_DASH_DAMAGE, BOSS_STOMP_DAMAGE, BOSS_LEAF_OFFSETS, BOSS_PHASE_LEAF_OFFSETS, BOSS_PHASE_BEAT_SCALE,
  BOSS_CONTACT_RADIUS,
  BOSS_PHASE_SHAKE_SECONDS, BOSS_PHASE_SHAKE_DISTANCE, BOSS_DEFEAT_SHAKE_SECONDS,
  BOSS_DEFEAT_SHAKE_DISTANCE, ENEMY_TYPES, GREEN_TEA_SPEED_MULTIPLIER,
  BOSS_CRASH_SHAKE_SECONDS, BOSS_CRASH_SHAKE_DISTANCE,
  HIT_INVULNERABILITY, INVULNERABILITY_BLINK_SECONDS, PLAYER_RADIUS,
  SHIELD_INVULNERABILITY_SECONDS, START_LIVES, SURVIVAL_SCORE_PER_SECOND,
  TONGUE_LEAF_BONUS, UPGRADE_CARD_COUNT, WIN_BOSS_COUNT, SHAKE_KILL,
  SHAKE_HEART, SHAKE_STOMP, SHAKE_BOSS_STEP, BREW_HUD,
} from './config.js';
import { createRunStats } from './RunStats.js';
import { createSave } from './components/Save.js';
import { createAchievements } from './components/Achievements.js';
import { createWorld, isBlocked } from './components/World.js';
import { createPlayer } from './components/Player.js';
import { createEnemies, firstBlockingHouse } from './components/Enemies.js';
import { createTea } from './components/Tea.js';
import { createHUD } from './components/HUD.js';
import { createUpgrades } from './components/Upgrades.js';
import { createTongue } from './components/Tongue.js';
import { createEffects } from './components/Effects.js';
import { createAudio } from './components/Audio.js';
import { createAtmosphere } from './components/Atmosphere.js';

const canvas = document.querySelector('.game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
const world = createWorld(scene);
const state = createGameState();
const runStats = createRunStats();
const save = createSave();
let audio;
const player = createPlayer(scene, () => audio?.jump());
const effects = createEffects(scene, player.camera, player);
const atmosphere = createAtmosphere(scene, renderer, world);
audio = createAudio(player.camera, player.group);
const hud = createHUD();
hud.setSaveData(save.data);
hud.onResetSave(() => { save.clear(); hud.setSaveData(save.data); hud.setOverlay('start', state); });
hud.setMuted(audio.muted);
hud.onMuteClick(() => { audio.gesture(); hud.setMuted(audio.toggleMute()); });
hud.onStageChange(() => audio.stage());
state.mode = 'start';
hud.setOverlay('start', state);
const achievements = createAchievements(save, (item) => {
  hud.setSaveData(save.data);
  hud.queueAchievement(item);
  audio.achievement();
});
let tea;
let upgrades;
const enemies = createEnemies(scene, state, (position, enemy, cause) => {
  runStats.recordKill(enemy.type, cause);
  achievements.emit('enemyKilled', runStats.snapshot(state));
  if (enemy.type === 'boss') achievements.emit('bossDefeated');
  effects.emit(enemy.type, position);
  effects.shake(...SHAKE_KILL);
  if (enemy.type === 'grunt') audio.gruntKill(position);
  if (enemy.type === 'brute') audio.bruteKill(position);
  if (enemy.type === 'boss') audio.bossDefeat(position);
  if (enemy.type === 'boss') hud.bossBonusPulse();
  if (enemy.type === 'boss') {
    const used = new Set();
    for (const [x, y] of BOSS_LEAF_OFFSETS) {
      const [leafX, leafY] = [[x, y], ...BOSS_PHASE_LEAF_OFFSETS].find(([dx, dy]) => {
        const key = `${dx},${dy}`;
        if (used.has(key) || isBlocked(position.x + dx, position.y + dy)) return false;
        used.add(key);
        return true;
      }) ?? [0, 0];
      tea.drop(new THREE.Vector3(position.x + leafX, position.y + leafY, 0), true);
    }
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
    effects.slowMotion(BOSS_PHASE_BEAT_SECONDS, BOSS_PHASE_BEAT_SCALE);
    effects.shake(BOSS_PHASE_SHAKE_DISTANCE, BOSS_PHASE_SHAKE_SECONDS);
    audio.phase(position);
    hud.flashBossPhase();
    hud.update(state, tea, enemies.boss);
  },
  onBossDefeat: () => {
    hud.clearBossHint();
    effects.shake(BOSS_DEFEAT_SHAKE_DISTANCE, BOSS_DEFEAT_SHAKE_SECONDS);
  },
  onBossFirstTelegraph: () => hud.showBossHint(),
  onBossCrash: (position, houseIndex) => {
    runStats.recordCrash();
    achievements.emit('bossCrash');
    world.flashHouse(houseIndex);
    effects.emit('dust', position);
    effects.shake(BOSS_CRASH_SHAKE_DISTANCE, BOSS_CRASH_SHAKE_SECONDS);
    audio.crash(position);
  },
  onBossTelegraph: (position) => audio.telegraph(position),
  onBossDash: (position) => audio.dash(position),
  onBossStomp: (position) => {
    effects.emit('stomp', position);
    effects.shake(...SHAKE_STOMP);
    audio.stomp(position);
  },
  onSpawn: (enemy) => {
    if (enemy.type === 'brute') audio.bruteGrowl(enemy.group.position);
    if (enemy.type === 'boss') { audio.bossWarning(enemy.group.position); audio.bossRoar(enemy.group.position); }
  },
  onHeavyHit: (position, type) => {
    effects.hitStop(type);
    if (type === 'brute') audio.bruteHit(position);
    else { hud.hitBoss(); audio.bossHit(position); }
  },
  onFootstep: (position, type) => {
    if (type === 'boss') { audio.bossStep(position); effects.shake(...SHAKE_BOSS_STEP); }
    else audio.bruteStep(position);
  },
  onBossResolved: () => {
    if (!state.victoryShown && runStats.bossesDefeated >= WIN_BOSS_COUNT) showVictory(true);
  },
});
tea = createTea(scene, player, enemies, () => hud.update(state, tea, enemies.boss), {
  effects,
  getDropChance: (baseChance) => upgrades.dropChanceFor(baseChance),
  getPickupRadius: () => upgrades.pickupRadius,
  onBrewEvent: (kind, event, detail) => {
    hud.onBrewEvent(kind, event, detail);
    if (event === 'pickup') achievements.emit('brewActiveCountChanged', {
      activeBrews: Number(tea.greenTeaLeft > 0) + Number(tea.hasShield) + Number(tea.matchaNoticeLeft > 0),
    });
    if (kind === 'Matcha Burst' && event === 'pickup') {
      effects.emit('matcha', player.group.position);
      audio.matcha();
    }
  },
  onLeafCollected: (kind, position) => {
    runStats.recordLeaf();
    achievements.emit('leafCollected', runStats.snapshot(state));
    effects.emit('leaf', position, BREW_HUD[kind].color);
    audio.leafPickup(kind);
  },
  onShieldBlock: (position) => { effects.emit('shield', position); audio.shield(); },
});
upgrades = createUpgrades(state, (position, radius) => {
  tea.effect(radius, '#f4eaa8', position);
  for (const enemy of [...enemies.enemies]) {
    const enemyPosition = enemy.group.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(enemyPosition.x - position.x, enemyPosition.y - position.y) - enemy.radius <= radius) enemies.damage(enemy, 1, position);
  }
}, (name) => {
  runStats.recordUpgrade(name);
  achievements.emit('upgradePicked', runStats.snapshot(state));
  audio.upgradePick();
}, () => audio.upgradeOpen());
const tongue = createTongue(scene, player, enemies, upgrades, {
  onTongueFired: () => audio.tongueShot(),
  onTongueEat: (position) => { audio.tongueEat(); effects.emit('tongue', position); },
});
hud.setTongueStatus(tongue.cooldownLeft, tongue.cooldown);
let attackCooldown = 0;
const clock = new THREE.Clock();

function refreshScoreAndCheckUpgrades() {
  hud.update(state, tea, enemies.boss);
  upgrades.checkThresholds();
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  player.camera.aspect = innerWidth / innerHeight;
  player.camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

function gameOver() {
  const finishedStats = runStats.snapshot(state);
  const savedResult = save.recordRun(finishedStats);
  hud.setSaveData(save.data);
  state.bossRemainingPercent = enemies.boss ? Math.ceil(enemies.boss.hp / enemies.boss.maxHp * 100) : null;
  state.mode = 'over';
  state.endless = false;
  state.victoryShown = false;
  state.lives = START_LIVES;
  state.maxLives = START_LIVES;
  state.hitInvulnerableLeft = 0;
  tongue.reset();
  enemies.clear();
  effects.reset();
  audio.reset();
  audio.gameOver();
  atmosphere.reset();
  world.reset();
  hud.clearBossHint();
  tea.reset();
  hud.clearBrews();
  hud.resetJuice();
  player.setVisible(true);
  upgrades.reset();
  attackCooldown = 0;
  hud.setTongueStatus(tongue.cooldownLeft, tongue.cooldown);
  hud.update(state, tea, enemies.boss);
  hud.setOverlay('over', state, finishedStats, savedResult);
  runStats.reset();
}

function reset() {
  save.resetRun();
  hud.clearAchievements();
  tongue.reset();
  enemies.clear(true);
  effects.reset();
  audio.reset();
  atmosphere.reset();
  world.reset();
  hud.clearBossHint();
  tea.reset();
  hud.clearBrews();
  hud.resetJuice();
  hud.clearHitFlash();
  player.reset();
  Object.assign(state, createGameState());
  runStats.reset();
  upgrades.reset();
  attackCooldown = 0;
  hud.setTongueStatus(tongue.cooldownLeft, tongue.cooldown);
  hud.update(state, tea, enemies.boss);
  hud.setOverlay('playing', state);
}

function showVictory(fromBoss = false) {
  if (state.victoryShown || state.mode !== 'playing') return;
  state.victoryShown = true;
  state.mode = 'victory';
  const finishedStats = runStats.snapshot(state);
  const savedResult = save.recordRun(finishedStats, true);
  hud.setSaveData(save.data);
  if (!fromBoss) audio.victory();
  hud.update(state, tea, enemies.boss);
  hud.setOverlay('victory', state, finishedStats, savedResult);
}

function chooseVictory(choice) {
  if (state.mode !== 'victory') return;
  if (choice === 'restart') reset();
  if (choice === 'continue') {
    state.endless = true;
    state.mode = 'playing';
    hud.clearAchievements();
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
  effects.ring(center, radius, '#d6f6a0', true);
  audio.attack();
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
  const radius = PLAYER_RADIUS + (enemy.type === 'boss' ? BOSS_CONTACT_RADIUS : enemy.radius);
  if (Math.hypot(enemy.group.position.x - playerPosition.x, enemy.group.position.y - playerPosition.y) <= radius &&
      (enemy.type !== 'boss' || !firstBlockingHouse(enemy.group.position, playerPosition, 0))) return true;
  if (!enemy.isDashing || !enemy.dashPath) return false;
  const { from, to } = enemy.dashPath;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return false;
  const progress = Math.max(0, Math.min(1, ((playerPosition.x - from.x) * dx + (playerPosition.y - from.y) * dy) / lengthSquared));
  const nearest = { x: from.x + progress * dx, y: from.y + progress * dy };
  return Math.hypot(nearest.x - playerPosition.x, nearest.y - playerPosition.y) <= radius &&
    !firstBlockingHouse(nearest, playerPosition, 0);
}

const consumedKeys = new Set();
addEventListener('keyup', (event) => consumedKeys.delete(event.code));
function pauseOnFocusLoss() {
  consumedKeys.clear();
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  hud.setOverlay('paused', state);
  audio.update(0, state.mode, enemies.stage.number, Boolean(enemies.boss));
}
addEventListener('blur', pauseOnFocusLoss);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseOnFocusLoss(); });
addEventListener('keydown', (event) => {
  audio.gesture();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code) ||
      (state.mode === 'victory' && event.code === 'Enter')) event.preventDefault();
  if (consumedKeys.has(event.code)) return;
  if (state.mode === 'start') {
    if (!event.repeat) {
      consumedKeys.add(event.code);
      state.mode = 'playing';
      hud.setOverlay('playing', state);
    }
    return;
  }
  if (event.code === 'KeyM' && !event.repeat) {
    hud.setMuted(audio.toggleMute());
    return;
  }
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
  if (state.mode === 'over' && event.code === 'Space' && !event.repeat) {
    consumedKeys.add(event.code);
    reset();
    return;
  }
  if (state.mode !== 'playing') return;
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
    const gameDt = effects.step(dt);
    state.time += gameDt;
    runStats.setTime(state.time);
    achievements.emit('timeAdvanced', { unhurtTime: runStats.unhurtTime });
    hud.tickAchievements(gameDt);
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
      world.update(gameDt, player.camera, player.group.position, enemies.enemies, tea.drops);
      enemies.update(gameDt, player.group.position);
      tea.update(gameDt, state.time);
      atmosphere.update(gameDt, enemies.stage.number, Boolean(enemies.boss));
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
          effects.playerHit();
          effects.shake(...SHAKE_HEART);
          audio.heart();
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
            effects.playerHit();
            effects.shake(...SHAKE_HEART);
            audio.heart();
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
  audio.update(state.mode === 'playing' ? dt : 0, state.mode, enemies.stage.number, Boolean(enemies.boss));
  hud.setFrozen(state.mode !== 'playing');
  renderer.render(scene, player.camera);
}
requestAnimationFrame(frame);
