import { GREEN_TEA_SECONDS } from '../config.js';

export function createHUD() {
  const root = document.createElement('div');
  root.className = 'hud';
  root.innerHTML = `
    <div class="hud-top"><div class="title">Tode's Tea Time</div><div class="stats"><span id="score">Score 0</span><span id="kills">Kills 0</span></div></div>
    <div id="brews" class="brews"></div>
    <div class="controls">WASD / arrows · hop &nbsp; Space · attack &nbsp; P · pause</div>
    <div id="overlay" class="overlay hidden"><div class="overlay-card"><h1 id="overlay-title"></h1><p id="overlay-detail"></p></div></div>
  `;
  document.body.append(root);
  const score = root.querySelector('#score');
  const kills = root.querySelector('#kills');
  const brews = root.querySelector('#brews');
  const overlay = root.querySelector('#overlay');

  function update(state, tea) {
    score.textContent = `Score ${state.score}`;
    kills.textContent = `Kills ${state.kills}`;
    const items = [];
    if (tea.greenTeaLeft > 0) items.push(`<div class="brew"><span>Green Tea · ${tea.greenTeaLeft.toFixed(1)}s</span><div class="brew-track"><div class="brew-fill" style="width:${tea.greenTeaLeft / GREEN_TEA_SECONDS * 100}%"></div></div></div>`);
    if (tea.hasShield) items.push('<div class="brew"><span>Chamomile · shield ready</span><div class="brew-track"><div class="brew-fill full"></div></div></div>');
    if (tea.invulnerableLeft > 0) items.push(`<div class="brew"><span>Invulnerable · ${tea.invulnerableLeft.toFixed(1)}s</span><div class="brew-track"><div class="brew-fill" style="width:${tea.invulnerableLeft * 100}%"></div></div></div>`);
    brews.innerHTML = items.join('');
  }

  function setOverlay(mode, state) {
    overlay.classList.toggle('hidden', mode === 'playing');
    if (mode === 'over') {
      root.querySelector('#overlay-title').textContent = 'Game Over';
      root.querySelector('#overlay-detail').textContent = `Score ${state.score} · ${state.kills} kills · Press Space to reset`;
    } else if (mode === 'paused') {
      root.querySelector('#overlay-title').textContent = 'Paused';
      root.querySelector('#overlay-detail').textContent = 'Press P to continue';
    }
  }
  return { update, setOverlay };
}
