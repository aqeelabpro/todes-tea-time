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
export const ENEMY_HIT_FLASH_SECONDS = 0.15;
export const ENEMY_HIT_FLASH_EMISSIVE = 0.7;
export const ENEMY_HIT_SQUASH = 1.08;
export const BRUTE_HIT_KNOCKBACK_FRACTION = 0.4;
export const BRUTE_KNOCKBACK_SECONDS = 0.12;
export const BRUTE_STAGGER_TIME = 0.4;
export const BRUTE_ATTACK_RECOVERY = 1;
export const HEAVY_CONTACT_KNOCKBACK = 22;
export const ENEMY_CONTACT_CLEARANCE = 4;
export const ENEMY_KNOCKBACK_STEP = 4;
export const ENEMY_PLACEHOLDER_RADIUS_FACTOR = 0.9;
export const CONTACT_RADIUS = 21;
export const START_LIVES = 3;
export const MAX_LIVES = 5;
export const HIT_INVULNERABILITY = 1.2;
export const HIT_FLASH_SECONDS = 0.25;
export const ATTACK_RADIUS = 45;
export const ATTACK_COOLDOWN = 0.62;
export const ATTACK_EFFECT_SECONDS = 0.35;
export const TONGUE_COOLDOWN_AFTER_EAT = 3;
export const TONGUE_MIN_COOLDOWN = 1.5;
export const TONGUE_RANGE_MULTIPLIER = 1.8;
export const TONGUE_MAX_RANGE_MULTIPLIER = 2.6;
export const TONGUE_RANGE = ATTACK_RADIUS * TONGUE_RANGE_MULTIPLIER;
export const TONGUE_EXTENSION_SECONDS = 0.08;
export const TONGUE_RETRACTION_SECONDS = 0.1;
export const TONGUE_LEAF_BONUS = 2;
export const TONGUE_MOUTH_FORWARD = 8;
export const TONGUE_HEIGHT = 8;
export const TONGUE_RADIUS = 1.8;
export const TONGUE_TIP_RADIUS = 2.7;
export const TONGUE_CAUGHT_RADIUS = 4;
export const TONGUE_CYLINDER_SIDES = 8;
export const TONGUE_SPHERE_SEGMENTS = 12;
export const TONGUE_SPHERE_RINGS = 8;
export const TONGUE_COLOR = '#f878ab';
export const TONGUE_CAUGHT_COLOR = '#a45462';
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
export const ENEMY_TYPES = {
  grunt: {
    scale: 5, speedMultiplier: 1, hp: 1, scoreValue: 10,
    leafDropChance: 0.25, tint: '#ffffff', placeholderTint: '#a45462', radius: 11,
  },
  brute: {
    scale: 10, speedMultiplier: 0.8, hp: 3, scoreValue: 50,
    leafDropChance: 1, tint: '#8e3d62', radius: 22,
  },
  boss: {
    scale: 20, speedMultiplier: 0.6, hp: 20, scoreValue: 0,
    leafDropChance: 1, tint: '#aa78d2', enragedTint: '#ff5b31', radius: 30,
  },
};
// Spawn progression. Stage 2 introduces one Brute, then delays the mixed spawns.
// Stage 3 linearly raises the Brute share until its cap.
export const STAGES = [
  { number: 1, score: 0, bruteShare: 0, maxBrutes: 0 },
  { number: 2, score: 150, bruteShare: 0.15, maxBrutes: 2 },
  { number: 3, score: 350, bruteShare: 0.15, maxBrutes: 4 },
];
export const STAGE_THREE_BRUTE_SHARE_CAP = 0.4;
export const STAGE_THREE_BRUTE_SHARE_GROWTH = 0.025;
export const STAGE_THREE_BRUTE_SHARE_SCORE_STEP = 50;
export const BRUTE_INTRO_COOLDOWN = 15;
export const STAGE_PULSE_SECONDS = 0.9;
export const BOSS_SCORE_STEP = 500;
export const WIN_BOSS_COUNT = 1;
export const VICTORY_STEAM_SECONDS = 2.4;
export const BOSS_KILL_SCORE = 300;
export const BOSS_HUD_NAME = 'Monster King';
export const BOSS_NORMAL_SPAWN_RATE = 0.5;
export const BOSS_HP = 20;
export const BOSS_DIFFICULTY = 1;
export const BOSS_HP_GROWTH = 0.2;
export const BOSS_PHASE_TWO_THRESHOLD = 0.66;
export const BOSS_PHASE_THREE_THRESHOLD = 0.33;
export const BOSS_ENRAGE_SPEED = 1.3;
export const BOSS_PHASE_BEAT_SECONDS = 0.4;
export const BOSS_PHASE_BEAT_SCALE = 0.4;
export const BOSS_PHASE_SHAKE_SECONDS = 0.4;
export const BOSS_PHASE_SHAKE_DISTANCE = 8;
export const BOSS_DEFEAT_SHAKE_SECONDS = 0.5;
export const BOSS_DEFEAT_SHAKE_DISTANCE = 12;
export const BOSS_STAGGER_SECONDS = 0.1;
export const BOSS_REST_DAMAGE_MULTIPLIER = 2;
export const BOSS_CRASH_DAMAGE = 0.15;
export const BOSS_STUN_TIME = 3;
export const BOSS_CRASH_COOLDOWN = 8;
export const BOSS_STUN_DAMAGE_MULTIPLIER = 3;
export const BOSS_STUN_TINT = '#c8ecff';
export const BOSS_STUN_WHITE_MIX = 0.45;
export const BOSS_CRASH_SHAKE_SECONDS = 0.4;
export const BOSS_CRASH_SHAKE_DISTANCE = 10;
export const BOSS_HOUSE_FLASH_SECONDS = 0.35;
export const BOSS_HOUSE_FLASH_COLOR = '#e4f5ff';
export const BOSS_HOUSE_FLASH_EMISSIVE = 0.7;
export const BOSS_DUST_COUNT = 14;
export const BOSS_DUST_LIFETIME = 0.55;
export const BOSS_DUST_SPEED = 32;
export const BOSS_DUST_SPEED_VARIATION = 0.3;
export const BOSS_DUST_SIZE = 3.5;
export const BOSS_DUST_SPHERE_SEGMENTS = 6;
export const BOSS_DUST_SPHERE_RINGS = 4;
export const BOSS_DUST_HEIGHT = 3;
export const BOSS_DUST_COLOR = '#e2d2af';
export const BOSS_CRASH_HINT_SECONDS = 6;
export const BOSS_CRASH_HINT = 'Tip: lure the charge into a house!';
export const BOSS_MIN_ATTACK_GAP = 0.8;
export const BOSS_CHARGE_INTERVAL = 5;
export const BOSS_TELEGRAPH_SECONDS = 1;
export const BOSS_CHAIN_TELEGRAPH_SECONDS = 0.6;
export const BOSS_TELEGRAPH_WIDTH = 80;
export const BOSS_TELEGRAPH_COLOR = '#f44141';
export const BOSS_TELEGRAPH_BASE_OPACITY = 0.3;
export const BOSS_TELEGRAPH_PULSE_OPACITY = 0.25;
export const BOSS_TELEGRAPH_PULSE_SPEED = 12;
export const BOSS_DASH_SPEED = 190;
export const BOSS_DASH_STEP = 4;
export const BOSS_DASH_DAMAGE = 2;
export const BOSS_REST_SECONDS = 1.5;
export const BOSS_ENRAGED_REST_MULTIPLIER = 0.7;
export const BOSS_STOMP_SECONDS = 1.2;
export const BOSS_STOMP_RADIUS = 72;
export const BOSS_ENRAGED_STOMP_MULTIPLIER = 1.3;
export const BOSS_STOMP_DAMAGE = 1;
export const BOSS_SUMMON_COUNT = 3;
export const BOSS_SUMMON_INTERVAL = 15;
export const BOSS_SUMMON_CORNER_OFFSETS = [[0, 0], [30, 0], [0, 30], [30, 30]];
export const BOSS_BLOCK_CANCEL_SECONDS = 1;
export const BOSS_REST_PULSE_SPEED = 8;
export const BOSS_REST_PULSE_BASE = 0.2;
export const BOSS_REST_PULSE_AMPLITUDE = 0.2;
export const BOSS_LEAF_OFFSETS = [[-18, 0], [18, 0], [0, 18]];
export const BOSS_PHASE_LEAF_OFFSETS = [[35, 0], [-35, 0], [0, 35], [0, -35], [0, 0]];
export const DEBUG_ENEMY_SPAWN_DISTANCES = [80, 110, 145];
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
