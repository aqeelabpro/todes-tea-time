import { getDisplayedScore } from './GameState.js';

// One mutable record per run; overlays receive snapshots so later resets cannot alter them.
export function createRunStats() {
  let kills = 0;
  let time = 0;
  let leavesCollected = 0;
  let bossesDefeated = 0;
  let bossesCrashed = 0;
  let damageTaken = 0;
  const upgradesChosen = new Map();

  function reset() {
    kills = 0;
    time = 0;
    leavesCollected = 0;
    bossesDefeated = 0;
    bossesCrashed = 0;
    damageTaken = 0;
    upgradesChosen.clear();
  }

  function snapshot(state) {
    return {
      score: getDisplayedScore(state),
      kills,
      time,
      heartsLeft: state.lives,
      leavesCollected,
      bossesDefeated,
      bossesCrashed,
      damageTaken,
      upgradesChosen: [...upgradesChosen].map(([name, count]) => ({ name, count })),
    };
  }

  return {
    reset, snapshot,
    setTime(value) { time = value; },
    recordKill(type) { kills += 1; if (type === 'boss') bossesDefeated += 1; },
    recordLeaf() { leavesCollected += 1; },
    recordUpgrade(name) { upgradesChosen.set(name, (upgradesChosen.get(name) ?? 0) + 1); },
    recordDamage(amount) { damageTaken += amount; },
    recordCrash() { bossesCrashed += 1; },
    get bossesDefeated() { return bossesDefeated; },
  };
}
