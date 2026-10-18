import {
  COMPLEXITY_GROWTH_RATE, DIFFICULTY_SPEED_STEP, DIFFICULTY_SPAWN_STEP,
  DIFFICULTY_PLAYER_SPEED_STEP, DIFFICULTY_ATTACK_DELAY_STEP,
  DIFFICULTY_ATTACK_RANGE_STEP, ENEMY_SPAWN_SECONDS, MIN_SPAWN_SECONDS,
  MIN_ATTACK_DELAY_MULTIPLIER,
  DIFFICULTY_TIME_SECONDS, DIFFICULTY_MAX_ENEMY_SPEED, DIFFICULTY_BATCH_STEP,
  DIFFICULTY_MAX_BATCH, DIFFICULTY_INITIAL_ENEMY_LIMIT, DIFFICULTY_ENEMY_LIMIT_STEP,
  DIFFICULTY_HEALTH_STEP, DIFFICULTY_MAX_HEALTH_BONUS, DIFFICULTY_BOSS_HEALTH_STEP,
  ENEMY_LIMIT, MAX_PLAYER_SPEED_MULTIPLIER, MAX_ATTACK_RANGE_MULTIPLIER,
  SWARM_FIRST_SECONDS, SWARM_INTERVAL_SECONDS, SWARM_DURATION_SECONDS,
  SWARM_WARNING_SECONDS, SWARM_SPAWN_MULTIPLIER,
} from './config.js';

export function getDifficulty(score, time = 0) {
  const elapsed = Math.max(0, time);
  // Surviving keeps the pressure rising even when the player stops scoring.
  const factor = Math.max(Math.max(0, score) * COMPLEXITY_GROWTH_RATE, elapsed / DIFFICULTY_TIME_SECONDS);
  const cycleTime = elapsed < SWARM_FIRST_SECONDS ? null : (elapsed - SWARM_FIRST_SECONDS) % SWARM_INTERVAL_SECONDS;
  const swarmActive = cycleTime !== null && cycleTime < SWARM_DURATION_SECONDS;
  const untilSwarm = cycleTime === null ? SWARM_FIRST_SECONDS - elapsed : SWARM_INTERVAL_SECONDS - cycleTime;
  return {
    factor,
    progressionScore: factor / COMPLEXITY_GROWTH_RATE,
    swarmActive,
    swarmWarning: !swarmActive && untilSwarm <= SWARM_WARNING_SECONDS,
    swarmSeconds: swarmActive ? SWARM_DURATION_SECONDS - cycleTime : untilSwarm,
    enemySpawnSeconds: Math.max(MIN_SPAWN_SECONDS, ENEMY_SPAWN_SECONDS - factor * DIFFICULTY_SPAWN_STEP) * (swarmActive ? SWARM_SPAWN_MULTIPLIER : 1),
    enemySpawnCount: Math.min(DIFFICULTY_MAX_BATCH, 1 + Math.floor(factor / DIFFICULTY_BATCH_STEP)) + Number(swarmActive),
    enemyLimit: Math.min(ENEMY_LIMIT, DIFFICULTY_INITIAL_ENEMY_LIMIT + Math.floor(factor * DIFFICULTY_ENEMY_LIMIT_STEP)),
    enemyHealthBonus: Math.min(DIFFICULTY_MAX_HEALTH_BONUS, Math.floor(factor / DIFFICULTY_HEALTH_STEP)),
    bossHealthMultiplier: 1 + factor * DIFFICULTY_BOSS_HEALTH_STEP,
    enemySpeedMultiplier: Math.min(DIFFICULTY_MAX_ENEMY_SPEED, 1 + factor * DIFFICULTY_SPEED_STEP),
    playerSpeedMultiplier: Math.min(MAX_PLAYER_SPEED_MULTIPLIER, 1 + factor * DIFFICULTY_PLAYER_SPEED_STEP),
    attackDelayMultiplier: Math.max(MIN_ATTACK_DELAY_MULTIPLIER, 1 - factor * DIFFICULTY_ATTACK_DELAY_STEP),
    attackRangeMultiplier: Math.min(MAX_ATTACK_RANGE_MULTIPLIER, 1 + factor * DIFFICULTY_ATTACK_RANGE_STEP),
  };
}
