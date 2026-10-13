import {
  BREW_HUD, GREEN_TEA_SECONDS, HIT_FLASH_SECONDS, MATCHA_HUD_FADE_SECONDS, MATCHA_HUD_SECONDS,
  SHIELD_DURATION,
} from '../config.js';
import { getDisplayedScore } from '../GameState.js';

export function createHUD() {
  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <div id="hit-flash" class="hit-flash"></div>
    <div class="hud-top"><div class="title-block"><div class="title">Tode's Tea Time</div><div id="hearts" class="hearts" aria-label="Lives"></div></div><div class="stats"><span id="score">Score 0</span><span id="kills">Kills 0</span></div></div>
    <div id="brews" class="brews"></div>
    <div class="controls">WASD / arrows · hop &nbsp; Space · attack &nbsp; P · pause</div>
    <div id="overlay" class="overlay hidden"><div class="overlay-card"><h1 id="overlay-title"></h1><p id="overlay-detail"></p></div></div>
  `;
  document.body.append(root);
  const score = root.querySelector('#score');
  const kills = root.querySelector('#kills');
  const hearts = root.querySelector('#hearts');
  const hitFlash = root.querySelector('#hit-flash');
  const brews = root.querySelector('#brews');
  const overlay = root.querySelector('#overlay');
  let matchaResult = '';
  let hitFlashLeft = 0;

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

  function brewIndicator(kind, status, fraction, opacity = 1) {
    const { color, icon } = BREW_HUD[kind];
    return `<div class="brew" style="--brew-color:${color};opacity:${opacity}"><div class="brew-label"><span class="brew-icon" aria-hidden="true">${icon}</span><span><strong>${kind}</strong>: ${status}</span></div><div class="brew-track"><div class="brew-fill" style="width:${Math.max(0, Math.min(1, fraction)) * 100}%"></div></div></div>`;
  }

  function onBrewEvent(kind, event, detail) {
    if (kind === 'Matcha Burst' && event === 'pickup') matchaResult = BREW_HUD[kind].result(detail);
  }

  function clearBrews() {
    matchaResult = '';
    brews.replaceChildren();
  }

  function update(state, tea) {
    score.textContent = `Score ${getDisplayedScore(state)}`;
    kills.textContent = `Kills ${state.kills}`;
    hearts.setAttribute('aria-label', `${state.lives} of ${state.maxLives} hearts`);
    hearts.innerHTML = Array.from({ length: state.maxLives }, (_, index) => `<svg class="heart ${index < state.lives ? 'full' : 'empty'}" viewBox="0 0 32 30" aria-hidden="true"><path d="M16 27 4.4 16.1C-2.3 9.7 3.4 0.6 11.1 3.4 13.3 4.2 15 6 16 7.2 16 7.2 16 7.2S18.7 4.2 20.9 3.4C28.6 0.6 34.3 9.7 27.6 16.1Z"/></svg>`).join('');
    const items = [];
    for (const kind of ['Green Tea', 'Chamomile', 'Matcha Burst']) {
      const remaining = kind === 'Green Tea' ? tea.greenTeaLeft : kind === 'Chamomile' ? tea.shieldLeft : tea.matchaNoticeLeft;
      const active = kind === 'Green Tea' ? tea.greenTeaLeft > 0 : kind === 'Chamomile' ? tea.hasShield : tea.matchaNoticeLeft > 0;
      if (active) {
        const duration = kind === 'Green Tea' ? GREEN_TEA_SECONDS : kind === 'Chamomile' ? SHIELD_DURATION : MATCHA_HUD_SECONDS;
        const description = kind === 'Matcha Burst' ? matchaResult : BREW_HUD[kind].description;
        const opacity = kind === 'Matcha Burst' ? Math.min(1, remaining / MATCHA_HUD_FADE_SECONDS) : 1;
        items.push(brewIndicator(kind, `${description} · ${remaining.toFixed(1)}s`, remaining / duration, opacity));
      }
    }
    brews.innerHTML = items.join('');
  }

  function setOverlay(mode, state) {
    overlay.classList.toggle('hidden', mode === 'playing');
    if (mode === 'over') {
      root.querySelector('#overlay-title').textContent = 'Game Over';
      root.querySelector('#overlay-detail').textContent = `Score ${getDisplayedScore(state)} · ${state.kills} kills · Press Space to reset`;
    } else if (mode === 'paused') {
      root.querySelector('#overlay-title').textContent = 'Paused';
      root.querySelector('#overlay-detail').textContent = 'Press P to continue';
    }
  }
  return { update, setOverlay, onBrewEvent, clearBrews, flashHit, tickHitFlash, clearHitFlash };
}
