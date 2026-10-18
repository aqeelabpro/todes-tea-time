import * as THREE from 'three';
import {
  ATTACK_COOLDOWN, ATTACK_RADIUS, CHAIN_LASH_CHANCE, CHAIN_LASH_RADIUS_MULTIPLIER,
  LEAF_DROP_CHANCE, LILY_HOP_BONUS, LONG_TONGUE_BONUS, POWER_STRIKE_DAMAGE,
  LUCKY_LEAF_BONUS, MAX_LIVES, PICKUP_RADIUS, PLAYER_RADIUS, PLAYER_STEP,
  QUICK_TONGUE_REDUCTION, TEA_MAGNET_MULTIPLIER, UPGRADE_CAPS,
  TONGUE_COOLDOWN_AFTER_EAT, TONGUE_MIN_COOLDOWN, TONGUE_MAX_RANGE_MULTIPLIER, TONGUE_RANGE,
  PERK_FIRST_SPAWN_SECONDS, PERK_SPAWN_SECONDS, PERK_MIN_SPAWN_SECONDS,
  PERK_DROP_CHANCE, PERK_DROP_CHANCE_GROWTH, PERK_MAX_DROP_CHANCE, PERK_BRUTE_DROP_BONUS,
  PERK_LIMIT, PERK_LIFETIME_SECONDS, PERK_BLINK_SECONDS,
  PERK_SPAWN_MIN_DISTANCE, PERK_SPAWN_MAX_DISTANCE, PERK_POWER_SCORE, PERK_EPIC_SCORE,
  PERK_RARE_CHANCE, PERK_EPIC_CHANCE, PERK_NOTICE_SECONDS, PERK_OVERCHARGE_SECONDS,
} from '../config.js';
import { isBlocked } from './World.js';

const perks = [
  { id: 'longTongue', name: 'Long Tongue', icon: '◎', color: '#f5a5c1', description: 'Bigger ring and longer tongue reach.' },
  { id: 'quickTongue', name: 'Quick Tongue', icon: 'ϟ', color: '#ffe183', description: 'Less waiting between attacks.' },
  { id: 'lilyHop', name: 'Lily Hop', icon: '↟', color: '#a7f075', description: 'Faster hops.' },
  { id: 'teaMagnet', name: 'Tea Magnet', icon: '∩', color: '#86d9ff', description: 'Collect leaves and perks from farther away.' },
  { id: 'luckyLeaf', name: 'Lucky Leaf', icon: '❧', color: '#b3ffa6', description: 'More tea leaves from enemies.' },
  { id: 'thickSkin', name: 'Thick Skin', icon: '♥', color: '#ff929e', description: 'Extra hearts and healing.' },
  { id: 'chainLash', name: 'Chain Lash', icon: '∞', color: '#d9a4ff', description: 'Kills can trigger another ring attack.', score: PERK_POWER_SCORE },
  { id: 'powerStrike', name: 'Power Strike', icon: '✹', color: '#ffb875', description: 'Ring attacks deal more damage.', score: PERK_POWER_SCORE },
];
const overcharge = { id: 'overcharge', name: 'Overcharge', icon: '★', color: '#ffe183' };
const tiers = [
  { name: 'Perk', color: '#c7f5b0', mark: 'I' },
  { name: 'Rare', color: '#9bd9ff', mark: 'II' },
  { name: 'Epic', color: '#ffd176', mark: 'III' },
];

export function createUpgrades(scene, state, player, onChainAttack, onCollect = () => {}) {
  const counts = Object.fromEntries(perks.map(({ id }) => [id, 0]));
  const drops = [];
  // Reuse icon textures across drops; only each drop's material/geometry is disposable.
  const textures = new Map();
  const hud = document.querySelector('.hud');
  const owned = document.createElement('div');
  owned.className = 'owned-upgrades';
  owned.setAttribute('aria-label', 'Collected perks');
  const notice = document.createElement('div');
  notice.className = 'perk-notice hidden';
  notice.setAttribute('role', 'status');
  notice.setAttribute('aria-live', 'polite');
  hud.append(owned, notice);
  let spawnTimer = 0;
  let spawnJitter = PERK_FIRST_SPAWN_SECONDS / PERK_SPAWN_SECONDS;
  let noticeLeft = 0;
  let overchargeLeft = 0;
  let chainActive = false;

  function renderOwned() {
    owned.innerHTML = perks.filter(({ id }) => counts[id] > 0).map(({ id, name, icon, color, description }) =>
      `<span class="owned-upgrade" title="${description}"><span class="perk-symbol" style="color:${color}" aria-hidden="true">${icon}</span><span>${name} ×${counts[id]}</span></span>`
    ).join('') + (overchargeLeft > 0 ? '<span class="owned-upgrade overcharged">★ Overcharge active</span>' : '');
  }

  function availablePerks() {
    return perks.filter(({ id, score = 0 }) => state.difficulty.progressionScore >= score && counts[id] < UPGRADE_CAPS[id] &&
      (id !== 'thickSkin' || state.maxLives < MAX_LIVES));
  }

  function randomPerk() {
    const available = availablePerks();
    // Prefer combat powers once heavier enemies join the arena.
    const weighted = available.flatMap((perk) => perk.score ? [perk, perk] : [perk]);
    return weighted[Math.floor(Math.random() * weighted.length)] ?? overcharge;
  }

  function randomTier() {
    if (state.difficulty.progressionScore >= PERK_EPIC_SCORE && Math.random() < PERK_EPIC_CHANCE) return 3;
    if (state.difficulty.progressionScore >= PERK_POWER_SCORE && Math.random() < PERK_RARE_CHANCE) return 2;
    return 1;
  }

  function iconTexture(perk, tier) {
    const key = `${perk.id}:${tier}`;
    if (textures.has(key)) return textures.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 288;
    const ctx = canvas.getContext('2d');
    const tierColor = tiers[tier - 1].color;
    ctx.fillStyle = '#172e27';
    ctx.strokeStyle = tierColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(128, 104, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 100px sans-serif';
    ctx.fillStyle = perk.color;
    ctx.fillText(perk.icon, 128, 106);
    ctx.fillStyle = tierColor;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${tiers[tier - 1].name} ${tiers[tier - 1].mark}`, 128, 208);
    ctx.fillStyle = '#fffbea';
    ctx.font = 'bold 28px sans-serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#172e27';
    ctx.strokeText(perk.name, 128, 250, 248);
    ctx.fillText(perk.name, 128, 250, 248);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.set(key, texture);
    return texture;
  }

  function nearbyPosition(center) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = PERK_SPAWN_MIN_DISTANCE + Math.random() * (PERK_SPAWN_MAX_DISTANCE - PERK_SPAWN_MIN_DISTANCE);
      // Place icons on Tode's hop grid so every pickup has a reachable landing spot.
      const x = Math.round((center.x + Math.cos(angle) * distance) / PLAYER_STEP) * PLAYER_STEP;
      const y = Math.round((center.y + Math.sin(angle) * distance) / PLAYER_STEP) * PLAYER_STEP;
      if (!isBlocked(x, y, PLAYER_RADIUS) && !drops.some(({ mesh }) => Math.hypot(mesh.position.x - x, mesh.position.y - y) < 28)) {
        return { x, y };
      }
    }
    return null;
  }

  function spawn(position, tier = randomTier()) {
    if (drops.length >= PERK_LIMIT) return false;
    if (position) position = {
      x: Math.round(position.x / PLAYER_STEP) * PLAYER_STEP,
      y: Math.round(position.y / PLAYER_STEP) * PLAYER_STEP,
    };
    if (!position || isBlocked(position.x, position.y, PLAYER_RADIUS) ||
        drops.some(({ mesh }) => Math.hypot(mesh.position.x - position.x, mesh.position.y - position.y) < 28)) {
      position = nearbyPosition(player.group.position);
    }
    if (!position) return false;
    const perk = randomPerk();
    const mesh = new THREE.Group();
    mesh.position.set(position.x, position.y, 23);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(perk, tier), depthWrite: false }));
    sprite.scale.set(36, 40.5, 1);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(10, 12, 32),
      new THREE.MeshBasicMaterial({ color: tiers[tier - 1].color, side: THREE.DoubleSide, transparent: true, opacity: 0.75, depthWrite: false }),
    );
    ring.position.z = -22.6;
    mesh.add(sprite, ring);
    scene.add(mesh);
    drops.push({ mesh, sprite, ring, perk, tier, age: 0, phase: Math.random() * Math.PI * 2 });
    return true;
  }

  function drop(position, enemyType) {
    const factor = state.difficulty.factor;
    const chance = Math.min(PERK_MAX_DROP_CHANCE, PERK_DROP_CHANCE + factor * PERK_DROP_CHANCE_GROWTH) +
      (enemyType === 'brute' ? PERK_BRUTE_DROP_BONUS : 0);
    if (enemyType !== 'boss' && Math.random() >= chance) return;
    spawn(position, enemyType === 'boss' ? 3 : randomTier());
  }

  function removeDrop(index) {
    const [item] = drops.splice(index, 1);
    scene.remove(item.mesh);
    item.sprite.material.dispose();
    item.ring.geometry.dispose();
    item.ring.material.dispose();
  }

  function collect(item) {
    let perk = item.perk;
    // A previous pickup may have capped a perk that is still lying in the arena.
    if (perk.id !== 'overcharge' && !availablePerks().some(({ id }) => id === perk.id)) perk = randomPerk();
    let gained = 0;
    let detail;
    if (perk.id === 'overcharge') {
      overchargeLeft = Math.max(overchargeLeft, PERK_OVERCHARGE_SECONDS * item.tier);
      state.lives = Math.min(state.maxLives, state.lives + 1);
      detail = `Extra damage and faster attacks for ${Math.ceil(overchargeLeft)}s. Restore 1 heart.`;
    } else {
      gained = Math.min(item.tier, UPGRADE_CAPS[perk.id] - counts[perk.id]);
      if (perk.id === 'thickSkin') gained = Math.min(gained, MAX_LIVES - state.maxLives);
      counts[perk.id] += gained;
      if (perk.id === 'thickSkin') {
        state.maxLives += gained;
        state.lives = Math.min(state.maxLives, state.lives + gained);
      }
      detail = `${perk.description} Level ${counts[perk.id]}.`;
    }
    renderOwned();
    notice.style.setProperty('--perk-color', tiers[item.tier - 1].color);
    notice.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = `${perk.icon} ${perk.name}${gained > 1 ? ` +${gained}` : ''}`;
    const description = document.createElement('span');
    description.textContent = detail;
    notice.append(title, description);
    notice.classList.remove('hidden');
    noticeLeft = PERK_NOTICE_SECONDS;
    onCollect(perk.name, player.group.position.clone(), perk.color);
  }

  function update(dt, time) {
    if (state.mode !== 'playing') return;
    noticeLeft = Math.max(0, noticeLeft - dt);
    if (noticeLeft === 0) notice.classList.add('hidden');
    if (overchargeLeft > 0) {
      overchargeLeft = Math.max(0, overchargeLeft - dt);
      if (overchargeLeft === 0) renderOwned();
    }
    const interval = Math.max(PERK_MIN_SPAWN_SECONDS, PERK_SPAWN_SECONDS / state.difficulty.enemySpeedMultiplier) * spawnJitter;
    spawnTimer += dt;
    if (spawnTimer >= interval) {
      spawnTimer %= interval;
      spawnJitter = 0.8 + Math.random() * 0.4;
      spawn(nearbyPosition(player.group.position));
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const item = drops[i];
      item.age += dt;
      if (item.age >= PERK_LIFETIME_SECONDS) { removeDrop(i); continue; }
      item.sprite.position.z = Math.sin(time * 3 + item.phase) * 3;
      item.ring.scale.setScalar(1 + Math.sin(time * 4 + item.phase) * 0.12);
      item.mesh.visible = item.age < PERK_LIFETIME_SECONDS - PERK_BLINK_SECONDS || Math.floor(item.age * 8) % 2 === 0;
      if (Math.hypot(item.mesh.position.x - player.group.position.x, item.mesh.position.y - player.group.position.y) <= pickupRadius()) {
        removeDrop(i);
        collect(item);
      }
    }
  }

  function attackRadius() {
    return ATTACK_RADIUS * state.difficulty.attackRangeMultiplier * (1 + LONG_TONGUE_BONUS) ** counts.longTongue;
  }

  function pickupRadius() { return PICKUP_RADIUS * TEA_MAGNET_MULTIPLIER ** counts.teaMagnet; }

  function onKill(position) {
    if (chainActive || counts.chainLash === 0 || Math.random() >= Math.min(1, counts.chainLash * CHAIN_LASH_CHANCE)) return;
    chainActive = true;
    try {
      onChainAttack(position, attackRadius() * CHAIN_LASH_RADIUS_MULTIPLIER);
    } finally {
      chainActive = false;
    }
  }

  function reset() {
    while (drops.length) removeDrop(drops.length - 1);
    for (const { id } of perks) counts[id] = 0;
    spawnTimer = 0;
    spawnJitter = PERK_FIRST_SPAWN_SECONDS / PERK_SPAWN_SECONDS;
    noticeLeft = 0;
    overchargeLeft = 0;
    chainActive = false;
    notice.classList.add('hidden');
    renderOwned();
  }

  return {
    update, drop, onKill, reset,
    get drops() { return drops; },
    get attackRadius() { return attackRadius(); },
    get attackDamage() { return 1 + counts.powerStrike * POWER_STRIKE_DAMAGE + Number(overchargeLeft > 0); },
    get attackCooldown() { return ATTACK_COOLDOWN * state.difficulty.attackDelayMultiplier * (1 - QUICK_TONGUE_REDUCTION) ** counts.quickTongue * (overchargeLeft > 0 ? 0.8 : 1); },
    get tongueRange() { return state.difficulty.attackRangeMultiplier * Math.min(ATTACK_RADIUS * TONGUE_MAX_RANGE_MULTIPLIER, TONGUE_RANGE * (1 + LONG_TONGUE_BONUS) ** counts.longTongue); },
    get tongueCooldown() { return Math.max(TONGUE_MIN_COOLDOWN, TONGUE_COOLDOWN_AFTER_EAT * state.difficulty.attackDelayMultiplier * (1 - QUICK_TONGUE_REDUCTION) ** counts.quickTongue * (overchargeLeft > 0 ? 0.8 : 1)); },
    get moveMultiplier() { return state.difficulty.playerSpeedMultiplier * (1 + LILY_HOP_BONUS) ** counts.lilyHop; },
    get pickupRadius() { return pickupRadius(); },
    dropChanceFor(baseChance = LEAF_DROP_CHANCE) { return Math.min(1, baseChance + LUCKY_LEAF_BONUS * counts.luckyLeaf); },
  };
}
