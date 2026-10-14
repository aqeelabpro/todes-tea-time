import { ACHIEVEMENTS } from '../config.js';

// Gameplay emits facts; this listener alone decides when achievements unlock.
export function createAchievements(save, onUnlock) {
  const byId = new Map(ACHIEVEMENTS.map((item) => [item.id, item]));

  function unlock(id) {
    const item = byId.get(id);
    if (!item || !save.unlockAchievement(id)) return false;
    onUnlock(item);
    return true;
  }

  function emit(event, progress = {}) {
    switch (event) {
      case 'leafCollected':
        if (progress.leavesCollected >= byId.get('first-sip').goal) unlock('first-sip');
        break;
      case 'enemyKilled':
        if (progress.tongueEats >= byId.get('frog-chef').goal) unlock('frog-chef');
        if (progress.kills >= byId.get('centurion').goal) unlock('centurion');
        break;
      case 'brewActiveCountChanged':
        if (progress.activeBrews >= byId.get('tea-party').goal) unlock('tea-party');
        break;
      case 'timeAdvanced':
        if (progress.unhurtTime >= byId.get('untouchable').goal) unlock('untouchable');
        break;
      case 'bossCrash': unlock('crash-test'); break;
      case 'bossDefeated': unlock('monster-king-slayer'); break;
      case 'upgradePicked':
        if (progress.upgradeCount >= byId.get('fully-brewed').goal) unlock('fully-brewed');
        break;
      default: break;
    }
  }

  function debugRandom() {
    const unlocked = new Set(save.data.achievements.map(({ id }) => id));
    const locked = ACHIEVEMENTS.filter(({ id }) => !unlocked.has(id));
    if (locked.length) unlock(locked[Math.floor(Math.random() * locked.length)].id);
  }

  return { emit, debugRandom };
}
