import {
  BOSS_HUD_NAME, BOSS_PHASE_TWO_THRESHOLD, BOSS_PHASE_THREE_THRESHOLD,
  BOSS_CRASH_HINT, BOSS_CRASH_HINT_SECONDS,
  BREW_HUD, GREEN_TEA_SECONDS, HIT_FLASH_SECONDS,
  MATCHA_HUD_FADE_SECONDS, MATCHA_HUD_SECONDS,
  SHIELD_DURATION, STAGES, STAGE_PULSE_SECONDS, VICTORY_STEAM_SECONDS,
  HUD_PULSE_SECONDS, HUD_HEART_SHAKE_SECONDS, HUD_BREW_SLIDE_SECONDS,
  HUD_BOSS_HIT_SECONDS, HUD_BOSS_PHASE_SECONDS, START_STORY, START_CONTROLS,
} from '../config.js';
import { getDisplayedScore } from '../GameState.js';

export function createHUD() {
  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <div id="hit-flash" class="hit-flash"></div>
    <div class="hud-top"><div class="title-block"><div class="title">Tode's Tea Time</div><div id="hearts" class="hearts" aria-label="Lives"></div></div><div class="stats"><span id="score">Score 0</span><span id="stage">Stage 1</span><span id="endless" class="hidden">Endless</span><span id="kills">Kills 0</span><span id="tongue-meter" class="tongue-meter ready" role="progressbar" aria-label="Tongue cooldown" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><strong>E</strong><span class="tongue-meter-track"><span class="tongue-meter-fill"></span></span></span><button id="mute" class="mute-button" type="button" aria-label="Mute audio" title="M: mute">♫</button></div></div>
    <div id="boss-health" class="boss-health hidden"><div class="boss-health-heading"><strong>${BOSS_HUD_NAME}</strong><span id="boss-phase"></span></div><div class="boss-health-track"><div class="boss-health-fill"></div><i class="boss-tick tick-one"></i><i class="boss-tick tick-two"></i></div><div id="boss-hint" class="boss-hint hidden">${BOSS_CRASH_HINT}</div></div>
    <div id="brews" class="brews"></div>
    <div class="controls">WASD / arrows · hop &nbsp; Space · attack &nbsp; E · tongue &nbsp; P · pause &nbsp; M · mute</div>
    <div id="overlay" class="overlay hidden"><div class="overlay-card"><h1 id="overlay-title"></h1><p id="overlay-detail"></p><div id="game-over-stats" class="run-stats hidden"></div></div></div>
    <div id="victory" class="victory hidden"><div class="victory-card">
      <h1>Victory!</h1>
      <div class="teacup" aria-hidden="true"><span class="steam steam-one"></span><span class="steam steam-two"></span><span class="steam steam-three"></span><span class="cup-handle"></span><span class="cup-body"></span><span class="cup-saucer"></span></div>
      <p>The monsters are gone. Tode finally enjoys his tea in peace.</p>
      <div id="victory-stats" class="run-stats"></div>
      <div class="victory-actions"><button type="button" data-victory-choice="continue">Enter: Keep playing (Endless Mode)</button><button type="button" data-victory-choice="restart">Space: Play again</button></div>
    </div></div>
  `;
  document.body.append(root);
  const score = root.querySelector('#score');
  const stageLabel = root.querySelector('#stage');
  const endlessLabel = root.querySelector('#endless');
  stageLabel.style.setProperty('--stage-pulse-seconds', `${STAGE_PULSE_SECONDS}s`);
  const kills = root.querySelector('#kills');
  const muteButton = root.querySelector('#mute');
  const pulse = (element, className = 'hud-pulse') => {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  };
  root.style.setProperty('--hud-pulse-seconds', `${HUD_PULSE_SECONDS}s`);
  root.style.setProperty('--hud-heart-seconds', `${HUD_HEART_SHAKE_SECONDS}s`);
  root.style.setProperty('--hud-brew-seconds', `${HUD_BREW_SLIDE_SECONDS}s`);
  root.style.setProperty('--hud-boss-hit-seconds', `${HUD_BOSS_HIT_SECONDS}s`);
  root.style.setProperty('--hud-boss-phase-seconds', `${HUD_BOSS_PHASE_SECONDS}s`);
  const tongueMeter = root.querySelector('#tongue-meter');
  const tongueFill = tongueMeter.querySelector('.tongue-meter-fill');
  const hearts = root.querySelector('#hearts');
  const hitFlash = root.querySelector('#hit-flash');
  const bossHealth = root.querySelector('#boss-health');
  bossHealth.style.setProperty('--phase-two-tick', `${BOSS_PHASE_TWO_THRESHOLD * 100}%`);
  bossHealth.style.setProperty('--phase-three-tick', `${BOSS_PHASE_THREE_THRESHOLD * 100}%`);
  const bossHealthFill = bossHealth.querySelector('.boss-health-fill');
  const bossPhase = bossHealth.querySelector('#boss-phase');
  const bossHint = bossHealth.querySelector('#boss-hint');
  const brews = root.querySelector('#brews');
  const overlay = root.querySelector('#overlay');
  const victory = root.querySelector('#victory');
  victory.style.setProperty('--steam-seconds', `${VICTORY_STEAM_SECONDS}s`);
  const gameOverStats = root.querySelector('#game-over-stats');
  const victoryStats = root.querySelector('#victory-stats');
  let victoryChoice = () => {};
  victory.addEventListener('click', (event) => {
    const button = event.target.closest('[data-victory-choice]');
    if (button && victory.contains(button)) victoryChoice(button.dataset.victoryChoice);
  });
  let matchaResult = '';
  let hitFlashLeft = 0;
  let bossHintLeft = 0;
  let lastStage = STAGES[0].number;
  let stagePulseUntil = 0;
  let previousScore = 0;
  let previousKills = 0;
  let previousHearts = null;
  let previousBossHp = null;
  let previousBossPhase = null;
  const brewNodes = new Map();
  let onStageChange = null;

  function setMuted(muted) {
    muteButton.textContent = muted ? '♪̸' : '♫';
    muteButton.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio');
  }

  function resetJuice() {
    previousScore = 0;
    previousKills = 0;
    previousHearts = null;
    previousBossHp = null;
    previousBossPhase = null;
    brewNodes.clear();
    lastStage = STAGES[0].number;
    stagePulseUntil = 0;
  }

  function hitBoss() { pulse(bossHealth, 'boss-hit'); }
  function flashBossPhase() { pulse(bossHealth, 'boss-phase-flash'); }
  function bossBonusPulse() { pulse(score, 'hud-pulse-strong'); }

  function flashHit() {
    hitFlashLeft = HIT_FLASH_SECONDS;
    hitFlash.style.opacity = '1';
  }

  function tickHitFlash(dt) {
    hitFlashLeft = Math.max(0, hitFlashLeft - dt);
    hitFlash.style.opacity = String(hitFlashLeft / HIT_FLASH_SECONDS);
  }

  function clearHitFlash() {
    hitFlashLeft = 0;
    hitFlash.style.opacity = '0';
  }

  function showBossHint() {
    bossHintLeft = BOSS_CRASH_HINT_SECONDS;
    bossHint.classList.remove('hidden');
  }

  function tickBossHint(dt) {
    bossHintLeft = Math.max(0, bossHintLeft - dt);
    if (bossHintLeft === 0) bossHint.classList.add('hidden');
  }

  function clearBossHint() {
    bossHintLeft = 0;
    bossHint.classList.add('hidden');
  }

  function setTongueStatus(remaining, total) {
    const ready = total <= 0 ? 1 : Math.max(0, Math.min(1, 1 - remaining / total));
    tongueFill.style.width = `${ready * 100}%`;
    tongueMeter.classList.toggle('ready', remaining <= 0);
    tongueMeter.setAttribute('aria-valuenow', String(Math.round(ready * 100)));
  }

  function brewIndicator(kind) {
    const { color, icon } = BREW_HUD[kind];
    const row = document.createElement('div');
    row.className = 'brew brew-enter';
    row.style.setProperty('--brew-color', color);
    row.innerHTML = `<div class="brew-label"><span class="brew-icon" aria-hidden="true">${icon}</span><span><strong>${kind}</strong>: <span class="brew-status"></span></span></div><div class="brew-track"><div class="brew-fill"></div></div>`;
    return row;
  }

  function onBrewEvent(kind, event, detail) {
    if (kind === 'Matcha Burst' && event === 'pickup') matchaResult = BREW_HUD[kind].result(detail);
  }

  function clearBrews() {
    matchaResult = '';
    brewNodes.clear();
    brews.replaceChildren();
  }

  function update(state, tea, boss = null) {
    const displayedScore = getDisplayedScore(state);
    if (displayedScore > previousScore) pulse(score);
    previousScore = displayedScore;
    score.textContent = `Score ${displayedScore}`;
    const currentStage = [...STAGES].reverse().find((stage) => getDisplayedScore(state) >= stage.score) ?? STAGES[0];
    if (currentStage.number !== lastStage) {
      stagePulseUntil = state.time + STAGE_PULSE_SECONDS;
      lastStage = currentStage.number;
      onStageChange?.(currentStage.number);
    }
    stageLabel.textContent = `Stage ${currentStage.number}`;
    stageLabel.classList.toggle('stage-pulse', state.time < stagePulseUntil);
    endlessLabel.classList.toggle('hidden', !state.endless);
    if (state.kills > previousKills) pulse(kills);
    previousKills = state.kills;
    kills.textContent = `Kills ${state.kills}`;
    bossHealth.classList.toggle('hidden', !boss);
    if (boss) {
      if (previousBossHp != null && boss.hp < previousBossHp) hitBoss();
      if (previousBossPhase != null && boss.phase !== previousBossPhase) flashBossPhase();
      bossHealthFill.style.width = `${boss.hp / boss.maxHp * 100}%`;
      bossPhase.textContent = boss.phase === 3 ? 'Enraged' : `Phase ${boss.phase}`;
      bossHealth.setAttribute('aria-label', `${BOSS_HUD_NAME}: ${boss.hp} of ${boss.maxHp} health`);
    }
    previousBossHp = boss?.hp ?? null;
    previousBossPhase = boss?.phase ?? null;
    if (previousHearts != null && state.lives < previousHearts) pulse(hearts, 'heart-shake');
    previousHearts = state.lives;
    hearts.setAttribute('aria-label', `${state.lives} of ${state.maxLives} hearts`);
    hearts.innerHTML = Array.from({ length: state.maxLives }, (_, index) => `<svg class="heart ${index < state.lives ? 'full' : 'empty'}" viewBox="0 0 32 30" aria-hidden="true"><path d="M16 27 4.4 16.1C-2.3 9.7 3.4 0.6 11.1 3.4 13.3 4.2 15 6 16 7.2 16 7.2 16 7.2S18.7 4.2 20.9 3.4C28.6 0.6 34.3 9.7 27.6 16.1Z"/></svg>`).join('');
    const activeBrews = new Set();
    for (const kind of ['Green Tea', 'Chamomile', 'Matcha Burst']) {
      const remaining = kind === 'Green Tea' ? tea.greenTeaLeft : kind === 'Chamomile' ? tea.shieldLeft : tea.matchaNoticeLeft;
      const active = kind === 'Green Tea' ? tea.greenTeaLeft > 0 : kind === 'Chamomile' ? tea.hasShield : tea.matchaNoticeLeft > 0;
      if (active) {
        activeBrews.add(kind);
        const duration = kind === 'Green Tea' ? GREEN_TEA_SECONDS : kind === 'Chamomile' ? SHIELD_DURATION : MATCHA_HUD_SECONDS;
        const description = kind === 'Matcha Burst' ? matchaResult : BREW_HUD[kind].description;
        const opacity = kind === 'Matcha Burst' ? Math.min(1, remaining / MATCHA_HUD_FADE_SECONDS) : 1;
        let row = brewNodes.get(kind);
        if (!row) {
          row = brewIndicator(kind);
          brewNodes.set(kind, row);
          brews.append(row);
        }
        row.querySelector('.brew-status').textContent = `${description} · ${remaining.toFixed(1)}s`;
        row.querySelector('.brew-fill').style.width = `${Math.max(0, Math.min(1, remaining / duration)) * 100}%`;
        row.style.opacity = String(opacity);
      }
    }
    for (const [kind, row] of brewNodes) {
      if (!activeBrews.has(kind)) { row.remove(); brewNodes.delete(kind); }
    }
  }

  function renderRunStats(target, stats) {
    target.replaceChildren();
    if (!stats) return;
    const elapsed = Math.floor(stats.time);
    const time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
    const upgrades = stats.upgradesChosen.length
      ? stats.upgradesChosen.map(({ name, count }) => `${name} ×${count}`).join(', ') : 'None';
    for (const [label, value] of [
      ['Final score', stats.score], ['Kills', stats.kills], ['Time survived', time],
      ['Hearts left', stats.heartsLeft], ['Tea leaves collected', stats.leavesCollected],
      ['Bosses defeated', stats.bossesDefeated], ['Damage taken', stats.damageTaken],
      ['Bosses crashed', stats.bossesCrashed],
      ['Upgrades chosen', upgrades],
    ]) {
      const row = document.createElement('div');
      row.className = 'run-stat';
      const name = document.createElement('span');
      const result = document.createElement('strong');
      name.textContent = label;
      result.textContent = String(value);
      row.append(name, result);
      target.append(row);
    }
  }

  function setOverlay(mode, state, stats = null) {
    setFrozen(mode !== 'playing');
    overlay.classList.toggle('hidden', mode !== 'paused' && mode !== 'over' && mode !== 'start');
    victory.classList.toggle('hidden', mode !== 'victory');
    if (mode === 'victory') renderRunStats(victoryStats, stats);
    if (mode === 'over') {
      root.querySelector('#overlay-title').textContent = 'Game Over';
      const bossRemaining = state.bossRemainingPercent == null ? '' : ` · Boss HP ${state.bossRemainingPercent}%`;
      root.querySelector('#overlay-detail').textContent = `Score ${getDisplayedScore(state)} · ${state.kills} kills${bossRemaining} · Press Space to reset`;
      renderRunStats(gameOverStats, stats);
      gameOverStats.classList.remove('hidden');
    } else if (mode === 'start') {
      root.querySelector('#overlay-title').textContent = "Tode's Tea Time";
      root.querySelector('#overlay-detail').innerHTML = `${START_STORY}<br>${START_CONTROLS}<br><strong>Press any key to start</strong>`;
      gameOverStats.classList.add('hidden');
    } else if (mode === 'paused') {
      root.querySelector('#overlay-title').textContent = 'Paused';
      root.querySelector('#overlay-detail').textContent = 'Press P to continue';
      gameOverStats.classList.add('hidden');
    } else {
      gameOverStats.classList.add('hidden');
    }
  }
  function setFrozen(frozen) { root.classList.toggle('is-frozen', frozen); }
  return { update, setOverlay, onBrewEvent, clearBrews, flashHit, tickHitFlash, clearHitFlash, setTongueStatus,
    showBossHint, tickBossHint, clearBossHint, setMuted, hitBoss, flashBossPhase, bossBonusPulse, resetJuice, setFrozen,
    onMuteClick(callback) { muteButton.addEventListener('click', callback); },
    onStageChange(callback) { onStageChange = callback; },
    onVictoryChoice(callback) { victoryChoice = callback; } };
}
