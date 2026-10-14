import { ACHIEVEMENTS, SAVE_STORAGE_KEY } from '../config.js';

const defaults = () => ({
  bestScore: 0,
  bestTime: 0,
  bestKills: 0,
  totalRuns: 0,
  totalBossesDefeated: 0,
  wins: 0,
  achievements: [],
});
const validCount = (value) => Number.isSafeInteger(value) && value >= 0;
const validTime = (value) => Number.isFinite(value) && value >= 0;

function load() {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY));
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaults();
    const data = defaults();
    for (const key of ['bestScore', 'bestKills', 'totalRuns', 'totalBossesDefeated', 'wins']) {
      if (validCount(stored[key])) data[key] = stored[key];
    }
    if (validTime(stored.bestTime)) data.bestTime = stored.bestTime;
    if (Array.isArray(stored.achievements)) {
      const known = new Set(ACHIEVEMENTS.map(({ id }) => id));
      const seen = new Set();
      data.achievements = stored.achievements.filter((item) => {
        if (!item || !known.has(item.id) || seen.has(item.id) ||
            typeof item.date !== 'string' || !Number.isFinite(Date.parse(item.date))) return false;
        seen.add(item.id);
        return true;
      }).map(({ id, date }) => ({ id, date }));
    }
    return data;
  } catch { return defaults(); }
}

export function createSave() {
  let data = load();
  let runCounted = false;
  let winCounted = false;
  let savedBosses = 0;

  function write() {
    try { localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data)); } catch { /* Keep in-memory progress. */ }
  }

  function recordRun(stats, victory = false) {
    const newHighScore = stats.score > data.bestScore;
    data.bestScore = Math.max(data.bestScore, stats.score);
    data.bestTime = Math.max(data.bestTime, stats.time);
    data.bestKills = Math.max(data.bestKills, stats.kills);
    if (!runCounted) {
      data.totalRuns += 1;
      runCounted = true;
    }
    if (victory && !winCounted) {
      data.wins += 1;
      winCounted = true;
    }
    // A victory can be followed by Endless Mode; count only newly defeated bosses.
    data.totalBossesDefeated += Math.max(0, stats.bossesDefeated - savedBosses);
    savedBosses = stats.bossesDefeated;
    write();
    return { bestScore: data.bestScore, newHighScore };
  }

  function unlockAchievement(id) {
    if (data.achievements.some((entry) => entry.id === id)) return false;
    data.achievements.push({ id, date: new Date().toISOString() });
    write();
    return true;
  }

  function resetRun() {
    runCounted = false;
    winCounted = false;
    savedBosses = 0;
  }

  function clear() {
    data = defaults();
    resetRun();
    try { localStorage.removeItem(SAVE_STORAGE_KEY); } catch { /* Storage may be disabled. */ }
  }

  return { get data() { return data; }, recordRun, unlockAchievement, resetRun, clear };
}
