import { START_LIVES } from './config.js';

export function createGameState() {
  return {
    mode: 'playing',
    time: 0,
    score: 0,
    kills: 0,
    survivalScore: 0,
    lives: START_LIVES,
    maxLives: START_LIVES,
    hitInvulnerableLeft: 0,
    endless: false,
    victoryShown: false,
    bossRemainingPercent: null,
  };
}

export function getDisplayedScore(state) {
  return Math.floor(state.score);
}
