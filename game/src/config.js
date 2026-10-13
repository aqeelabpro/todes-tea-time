// Shared tuning for the game. World coordinates use Z as up.
export const MAP_HALF_SIZE = 200;
export const MAP_BOUNDARY_INSET = 2;
export const FLOOR_TILE_SIZE = 20;
export const PLAYER_MODEL_SCALE = 20;
export const ENEMY_MODEL_SCALE = 5;
export const HOUSE_MODEL_SCALE = 65;
export const CAMERA_FOV = 30;
export const CAMERA_FAR = 9000;
export const CAMERA_POSITION = [300, -300, 300];
export const PLAYER_RADIUS = 10;
export const PLAYER_STEP = 20;
export const PLAYER_HOP_SECONDS = 0.19;
export const PLAYER_HOP_HEIGHT = 10.4;
export const INPUT_QUEUE_LIMIT = 2;
export const ENEMY_RADIUS = 11;
export const ENEMY_SPEED = 30;
export const ENEMY_SPAWN_INSET = 25;
export const ENEMY_SPAWN_JITTER = 10;
export const ENEMY_SEPARATION_DISTANCE = 32;
export const ENEMY_SEPARATION_STRENGTH = 1.8;
export const ENEMY_SIDEWAYS_BIAS = 0.55;
export const ENEMY_DETOUR_MARGIN = 4;
export const ENEMY_WAYPOINT_RADIUS = 3;
export const ENEMY_SPAWN_SECONDS = 2.7;
export const ENEMY_LIMIT = 32;
export const CONTACT_RADIUS = 21;
export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const HIT_INVULNERABILITY = 1.2;
export const HIT_FLASH_SECONDS = 0.25;
export const ATTACK_RADIUS = 45;
export const ATTACK_COOLDOWN = 0.62;
export const ATTACK_EFFECT_SECONDS = 0.35;
export const KILL_SCORE = 10;
export const SURVIVAL_SCORE_PER_SECOND = 1;
export const DIFFICULTY_SCORE_INTERVAL = 75;
export const DIFFICULTY_SPEED_STEP = 0.065;
export const DIFFICULTY_SPAWN_STEP = 0.11;
export const MIN_SPAWN_SECONDS = 0.85;
export const HOUSE_POSITIONS = [[-60, 60], [66, 48], [0, -80]];
export const HOUSE_HALF_WIDTH = 34;
export const HOUSE_HALF_HEIGHT = 34;
export const LEAF_DROP_CHANCE = 0.25;
export const LEAF_LIFETIME_SECONDS = 8;
export const LEAF_BLINK_SECONDS = 2;
export const PICKUP_RADIUS = 15;
export const LEAF_VISUAL_SCALE = 14;
export const LEAF_HEIGHT = 7;
export const LEAF_BOB_HEIGHT = 2.4;
export const SHIELD_RING_RADIUS = 15;
export const GREEN_TEA_SECONDS = 6;
export const GREEN_TEA_SPEED_MULTIPLIER = 1.4;
export const SHIELD_DURATION = 10;
export const SHIELD_INVULNERABILITY_SECONDS = 1;
export const INVULNERABILITY_BLINK_SECONDS = 0.1;
export const MATCHA_RADIUS = 105;
export const MATCHA_HUD_SECONDS = 1.5;
export const MATCHA_HUD_FADE_SECONDS = 0.5;
export const BREW_HUD = {
  'Green Tea': { color: '#a7f075', icon: '❧', description: 'Faster hops' },
  Chamomile: { color: '#ffe183', icon: '✿', description: 'Blocks the next hit' },
  'Matcha Burst': { color: '#d9a4ff', icon: '✦', description: 'Blasts nearby enemies', result: (kills) => kills === 0 ? 'no enemies in range' : `${kills} ${kills === 1 ? 'enemy' : 'enemies'} blasted` },
};
export const UPGRADE_SCORE_STEP = 100;
export const UPGRADE_SCORE_GROWTH = 50;
export const UPGRADE_CARD_COUNT = 3;
export const LONG_TONGUE_BONUS = 0.15;
export const QUICK_TONGUE_REDUCTION = 0.12;
export const LILY_HOP_BONUS = 0.10;
export const TEA_MAGNET_MULTIPLIER = 2;
export const LUCKY_LEAF_BONUS = 0.10;
export const CHAIN_LASH_CHANCE = 0.30;
export const CHAIN_LASH_RADIUS_MULTIPLIER = 0.55;
export const UPGRADE_CAPS = {
  longTongue: 5,
  quickTongue: 5,
  lilyHop: 5,
  teaMagnet: 2,
  luckyLeaf: 5,
  chainLash: 3,
  thickSkin: 2,
};
