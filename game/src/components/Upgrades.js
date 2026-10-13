import {
  ATTACK_COOLDOWN, ATTACK_RADIUS, CHAIN_LASH_CHANCE, CHAIN_LASH_RADIUS_MULTIPLIER,
  LEAF_DROP_CHANCE, LILY_HOP_BONUS, LONG_TONGUE_BONUS, LUCKY_LEAF_BONUS,
  MAX_LIVES, PICKUP_RADIUS, PLAYER_HOP_SECONDS, QUICK_TONGUE_REDUCTION, TEA_MAGNET_MULTIPLIER, UPGRADE_CAPS,
  TONGUE_COOLDOWN_AFTER_EAT, TONGUE_MIN_COOLDOWN, TONGUE_MAX_RANGE_MULTIPLIER,
  TONGUE_RANGE, UPGRADE_CARD_COUNT, UPGRADE_SCORE_GROWTH, UPGRADE_SCORE_STEP,
} from '../config.js';
import { getDisplayedScore } from '../GameState.js';

const icons = {
  longTongue: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8 17c7-10 25-10 32 0M11 20c0 14 8 20 13 20s13-6 13-20M24 22v16"/></svg>',
  quickTongue: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M27 4 12 25h11l-2 19 16-24H26z"/></svg>',
  lilyHop: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 34c4-12 32-12 36 0M24 35 34 9 24 14 14 9z"/></svg>',
  teaMagnet: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M11 8v23a13 13 0 0 0 26 0V8h-9v23a4 4 0 0 1-8 0V8z"/></svg>',
  luckyLeaf: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 38C8 13 20 6 41 6c0 25-10 35-34 32ZM7 38c8-12 19-20 34-32"/></svg>',
  chainLash: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M20 15h-4a9 9 0 0 0 0 18h8M28 33h4a9 9 0 0 0 0-18h-8M17 24h14"/></svg>',
  thickSkin: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 41 8 26C-1 17 10 3 24 15 38 3 49 17 40 26Z"/><path d="M24 20v12M18 26h12"/></svg>',
};

const upgrades = [
  { id: 'longTongue', name: 'Long Tongue', description: 'Bigger Space ring and longer tongue reach. Hit enemies from farther away.' },
  { id: 'quickTongue', name: 'Quick Tongue', description: 'Use Space and your tongue more often. Wait less between attacks.' },
  { id: 'lilyHop', name: 'Lily Hop', description: 'Hop faster. Escape enemies and grab leaves sooner.' },
  { id: 'teaMagnet', name: 'Tea Magnet', description: 'Collect tea leaves from farther away.' },
  { id: 'luckyLeaf', name: 'Lucky Leaf', description: 'Enemies drop tea leaves more often.' },
  { id: 'chainLash', name: 'Chain Lash', description: 'Kills sometimes trigger a free second attack.' },
  { id: 'thickSkin', name: 'Thick Skin', description: 'Take one more hit before the game ends.' },
];

function valueChange(id, level, state) {
  const next = level + 1;
  const units = (value) => Number(value.toFixed(1));
  const percent = (value) => `${units(value * 100)}%`;
  switch (id) {
    case 'longTongue':
      return `Space radius: ${units(ATTACK_RADIUS * (1 + LONG_TONGUE_BONUS) ** level)} → ${units(ATTACK_RADIUS * (1 + LONG_TONGUE_BONUS) ** next)} · Tongue range: ${units(Math.min(ATTACK_RADIUS * TONGUE_MAX_RANGE_MULTIPLIER, TONGUE_RANGE * (1 + LONG_TONGUE_BONUS) ** level))} → ${units(Math.min(ATTACK_RADIUS * TONGUE_MAX_RANGE_MULTIPLIER, TONGUE_RANGE * (1 + LONG_TONGUE_BONUS) ** next))} units`;
    case 'quickTongue':
      return `Space wait: ${(ATTACK_COOLDOWN * (1 - QUICK_TONGUE_REDUCTION) ** level).toFixed(2)}s → ${(ATTACK_COOLDOWN * (1 - QUICK_TONGUE_REDUCTION) ** next).toFixed(2)}s · Tongue wait: ${Math.max(TONGUE_MIN_COOLDOWN, TONGUE_COOLDOWN_AFTER_EAT * (1 - QUICK_TONGUE_REDUCTION) ** level).toFixed(2)}s → ${Math.max(TONGUE_MIN_COOLDOWN, TONGUE_COOLDOWN_AFTER_EAT * (1 - QUICK_TONGUE_REDUCTION) ** next).toFixed(2)}s`;
    case 'lilyHop':
      return `Base hop time: ${(PLAYER_HOP_SECONDS / (1 + LILY_HOP_BONUS) ** level).toFixed(2)}s → ${(PLAYER_HOP_SECONDS / (1 + LILY_HOP_BONUS) ** next).toFixed(2)}s`;
    case 'teaMagnet':
      return `Pickup radius: ${units(PICKUP_RADIUS * TEA_MAGNET_MULTIPLIER ** level)} → ${units(PICKUP_RADIUS * TEA_MAGNET_MULTIPLIER ** next)} units`;
    case 'luckyLeaf':
      return `Leaf drop chance: ${percent(Math.min(1, LEAF_DROP_CHANCE + LUCKY_LEAF_BONUS * level))} → ${percent(Math.min(1, LEAF_DROP_CHANCE + LUCKY_LEAF_BONUS * next))}`;
    case 'chainLash':
      return `Second attack chance: ${percent(Math.min(1, CHAIN_LASH_CHANCE * level))} → ${percent(Math.min(1, CHAIN_LASH_CHANCE * next))}`;
    case 'thickSkin':
      return `Max hearts: ${state.maxLives} → ${Math.min(MAX_LIVES, state.maxLives + 1)} · Restore 1 heart`;
  }
}

export function createUpgrades(state, onChainAttack, onChoose = () => {}) {
  const counts = Object.fromEntries(upgrades.map(({ id }) => [id, 0]));
  const hud = document.querySelector('.hud');
  const owned = document.createElement('div');
  owned.className = 'owned-upgrades';
  owned.setAttribute('aria-label', 'Owned upgrades');
  const overlay = document.createElement('div');
  overlay.className = 'upgrade-overlay hidden';
  overlay.innerHTML = '<div class="upgrade-panel"><h1>Choose an upgrade</h1><p>Time stands still while you choose.</p><div class="upgrade-cards"></div></div>';
  hud.append(owned, overlay);
  const cards = overlay.querySelector('.upgrade-cards');
  let nextThreshold = UPGRADE_SCORE_STEP;
  let nextIncrement = UPGRADE_SCORE_STEP + UPGRADE_SCORE_GROWTH;
  let pending = 0;
  let choices = [];
  let chainActive = false;

  function renderOwned() {
    owned.innerHTML = upgrades.filter(({ id }) => counts[id] > 0).map(({ id, name }) =>
      `<span class="owned-upgrade" title="${name}">${icons[id]}<span>${name} ×${counts[id]}</span></span>`
    ).join('');
  }

  function offerNext() {
    const available = upgrades.filter(({ id }) => counts[id] < UPGRADE_CAPS[id] && (id !== 'thickSkin' || state.maxLives < MAX_LIVES));
    if (available.length === 0) {
      pending = 0;
      choices = [];
      overlay.classList.add('hidden');
      state.mode = 'playing';
      return;
    }
    // Shuffle a copy so a capped card never appears and a pick has no duplicates.
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    choices = available.slice(0, UPGRADE_CARD_COUNT);
    state.mode = 'upgrade';
    cards.innerHTML = choices.map(({ id, name, description }, index) => `
      <button class="upgrade-card" type="button" data-upgrade-index="${index}">
        <span class="upgrade-key">${index + 1}</span><span class="upgrade-icon">${icons[id]}</span>
        <strong>${name}</strong><span class="upgrade-description">${description}</span>
        <span class="upgrade-values">${valueChange(id, counts[id], state)}</span>
        <small>Level ${counts[id]} → ${counts[id] + 1} (max ${UPGRADE_CAPS[id]})</small>
      </button>
    `).join('');
    overlay.classList.remove('hidden');
  }

  function checkThresholds() {
    if (state.mode !== 'playing') return;
    while (getDisplayedScore(state) >= nextThreshold) {
      pending += 1;
      nextThreshold += nextIncrement;
      nextIncrement += UPGRADE_SCORE_GROWTH;
    }
    if (pending > 0) offerNext();
  }

  function choose(index) {
    if (state.mode !== 'upgrade' || !choices[index]) return false;
    const id = choices[index].id;
    counts[id] += 1;
    onChoose(choices[index].name);
    if (id === 'thickSkin') {
      state.maxLives = Math.min(MAX_LIVES, state.maxLives + 1);
      state.lives = Math.min(state.maxLives, state.lives + 1);
    }
    pending -= 1;
    renderOwned();
    if (pending > 0) offerNext();
    else {
      choices = [];
      cards.innerHTML = '';
      overlay.classList.add('hidden');
      state.mode = 'playing';
    }
    return true;
  }

  overlay.addEventListener('click', (event) => {
    const card = event.target.closest('[data-upgrade-index]');
    if (card && overlay.contains(card)) choose(Number(card.dataset.upgradeIndex));
  });

  function onKill(position) {
    if (chainActive || counts.chainLash === 0) return;
    if (Math.random() >= Math.min(1, counts.chainLash * CHAIN_LASH_CHANCE)) return;
    chainActive = true;
    try {
      onChainAttack(position, ATTACK_RADIUS * (1 + LONG_TONGUE_BONUS) ** counts.longTongue * CHAIN_LASH_RADIUS_MULTIPLIER);
    } finally {
      chainActive = false;
    }
  }

  function reset() {
    for (const { id } of upgrades) counts[id] = 0;
    nextThreshold = UPGRADE_SCORE_STEP;
    nextIncrement = UPGRADE_SCORE_STEP + UPGRADE_SCORE_GROWTH;
    pending = 0;
    choices = [];
    chainActive = false;
    cards.innerHTML = '';
    overlay.classList.add('hidden');
    renderOwned();
  }

  return {
    checkThresholds, choose, onKill, reset,
    get nextThreshold() { return nextThreshold; },
    get attackRadius() { return ATTACK_RADIUS * (1 + LONG_TONGUE_BONUS) ** counts.longTongue; },
    get attackCooldown() { return ATTACK_COOLDOWN * (1 - QUICK_TONGUE_REDUCTION) ** counts.quickTongue; },
    get tongueRange() { return Math.min(ATTACK_RADIUS * TONGUE_MAX_RANGE_MULTIPLIER, TONGUE_RANGE * (1 + LONG_TONGUE_BONUS) ** counts.longTongue); },
    get tongueCooldown() { return Math.max(TONGUE_MIN_COOLDOWN, TONGUE_COOLDOWN_AFTER_EAT * (1 - QUICK_TONGUE_REDUCTION) ** counts.quickTongue); },
    get moveMultiplier() { return (1 + LILY_HOP_BONUS) ** counts.lilyHop; },
    get pickupRadius() { return PICKUP_RADIUS * TEA_MAGNET_MULTIPLIER ** counts.teaMagnet; },
    get dropChance() { return Math.min(1, LEAF_DROP_CHANCE + LUCKY_LEAF_BONUS * counts.luckyLeaf); },
    dropChanceFor(baseChance) { return Math.min(1, baseChance + LUCKY_LEAF_BONUS * counts.luckyLeaf); },
  };
}
