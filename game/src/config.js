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
export const HOUSE_DOOR_ROTATIONS = [Math.PI, Math.PI * 1.5];
export const HOUSE_FADE_OPACITY = 0.55;
export const HOUSE_FADE_OUT_SECONDS = 0.2;
export const HOUSE_FADE_IN_SECONDS = 0.3;
export const HOUSE_FADE_ENTER_DELAY_SECONDS = 0.05;
export const HOUSE_FADE_HOLD_SECONDS = 0.15;
export const HOUSE_FADE_MAX_CAMERA_DISTANCE = 650;
export const HOUSE_FADE_PLAYER_HEIGHT = 12;
export const HOUSE_OCCLUSION_EPSILON = 0.001;
export const GROUND_EFFECT_RENDER_ORDER = 20;
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
// The boss model extends beyond its pathing radius; use its visible footprint
// for contact with Tode without changing house or enemy separation rules.
export const BOSS_CONTACT_RADIUS = ENEMY_TYPES.grunt.radius * ENEMY_TYPES.boss.scale / ENEMY_TYPES.grunt.scale;
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
export const BOSS_SCORE_STEP = 750;
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

// Phase 4 visual feedback. Particle presets share one capped THREE.Points pool.
export const PARTICLE_CAP = 240;
export const SCREEN_SHAKE_ENABLED = true;
export const SHAKE_KILL = [2.5, 0.12];
export const SHAKE_HEART = [6, 0.24];
export const SHAKE_STOMP = [11, 0.35];
export const SHAKE_BOSS_STEP = [1.8, 0.1];
export const HITSTOP_BRUTE_SECONDS = 0.04;
export const HITSTOP_BOSS_SECONDS = 0.04;
export const PLAYER_HIT_TINT_SECONDS = 0.22;
export const PLAYER_HIT_TINT_COLOR = '#f24858';
export const PLAYER_HIT_EMISSIVE_MIX = 0.45;
export const SPACE_RING_SECONDS = 0.25;
export const SPACE_RING_START_SCALE = 1;
export const SPACE_RING_END_SCALE = 1.13;
export const EFFECT_RING_SEGMENTS = 64;
export const EFFECT_RING_THICKNESS = 1.5;
export const EFFECT_RING_HEIGHT = 0.25;
export const EFFECT_RING_OPACITY = 0.85;
export const PARTICLE_GRAVITY = 55;
export const PARTICLE_POINT_SIZE = 5;
export const PARTICLE_HEIGHT = 8;
export const PARTICLE_SPEED_VARIATION = 0.35;
export const PARTICLE_PRESETS = {
  grunt: { count: 10, life: 0.48, speed: 28, color: '#dd8b95', lift: 20 },
  brute: { count: 22, life: 0.72, speed: 34, color: '#8e3d62', lift: 27 },
  boss: { count: 34, life: 0.78, speed: 42, color: '#a67abb', lift: 34 },
  tongue: { count: 8, life: 0.44, speed: 22, color: '#f878ab', lift: 15 },
  leaf: { count: 7, life: 0.62, speed: 17, color: '#a7f075', lift: 29 },
  shield: { count: 9, life: 0.55, speed: 24, color: '#ffe183', lift: 20 },
  matcha: { count: 32, life: 0.7, speed: 48, color: '#d9a4ff', lift: 5 },
  dust: { count: BOSS_DUST_COUNT, life: BOSS_DUST_LIFETIME, speed: BOSS_DUST_SPEED, color: BOSS_DUST_COLOR, lift: 14 },
  stomp: { count: 28, life: 0.62, speed: 52, color: '#d3b79b', lift: 12 },
};

// Lighting colors and intensities are intentionally bright enough to keep the
// unlit checkerboard and all lit models readable throughout the run.
export const ATMOSPHERE_ENABLED = true;
export const ATMOSPHERE_TRANSITION_SECONDS = 3;
export const ATMOSPHERE_MIN_AMBIENT = 1.05;
export const ATMOSPHERE_MIN_DIRECTIONAL = 0.95;
export const ATMOSPHERE_STAGES = [
  { background: '#28503c', ambient: '#fff0dc', ambientPower: 1.45, sun: '#ffe0b8', sunPower: 1.4, fireflies: 0.15, windows: 0.12 },
  { background: '#203746', ambient: '#c9dcff', ambientPower: 1.26, sun: '#b9d1ff', sunPower: 1.18, fireflies: 0.65, windows: 0.5 },
  { background: '#17263e', ambient: '#a9c8ff', ambientPower: 1.1, sun: '#a0bdff', sunPower: 1.0, fireflies: 1, windows: 0.9 },
];
export const ATMOSPHERE_BOSS_RED_BLEND = 0.18;
export const ATMOSPHERE_BOSS_RED_COLOR = '#d76c74';
export const WINDOW_GLOW_COLOR = '#ffbd67';
export const WINDOW_LIGHT_HEIGHT = 24;
export const WINDOW_LIGHT_DISTANCE = 90;
export const WINDOW_LIGHT_POWER = 1.4;
export const FIREFLY_COUNT = 25;
export const FIREFLY_COLOR = '#f8eca1';
export const FIREFLY_SIZE = 3;
export const FIREFLY_MIN_HEIGHT = 12;
export const FIREFLY_HEIGHT_RANGE = 24;
export const FIREFLY_DRIFT = 5;
export const FIREFLY_SPEED = 0.65;
export const FIREFLY_MAP_INSET = 18;

// All sounds are built from these oscillator/noise envelopes at runtime.
export const MASTER_VOLUME = 0.58;
export const SFX_VOLUME = 0.85;
export const AMBIENT_VOLUME = 0.16;
export const CRICKET_VOLUME = 0.075;
export const MAX_VOICES = 24;
export const AUDIO_PITCH_JITTER = 0.045;
export const AUDIO_ATTACK_SECONDS = 0.008;
export const AUDIO_RELEASE_FLOOR = 0.0001;
export const AUDIO_STOP_TAIL = 0.02;
export const AUDIO_FADE_SECONDS = 0.25;
export const AUDIO_GAME_OVER_CUE_SECONDS = 1.25;
export const AUDIO_NOISE_SECONDS = 1;
export const AUDIO_SPATIAL_RANGE = 230;
export const AUDIO_SPATIAL_MIN_GAIN = 0.12;
export const AUDIO_BRUTE_HEARING_RANGE = 190;
export const AUDIO_NEAREST_BRUTES = 3;
export const BRUTE_STEP_SECONDS = 0.5;
export const BOSS_STEP_SECONDS = 0.62;
export const AUDIO_BOSS_DUCK_SECONDS = 0.7;
export const AUDIO_DRAMA_DUCK = 0.28;
export const AMBIENT_NOTE_SECONDS = 3.2;
export const AMBIENT_NOTE_LENGTH = 4.5;
export const AMBIENT_VOICE_VOLUME = 0.075;
export const AMBIENT_PENTATONIC = [130.81, 146.83, 164.81, 196, 220, 261.63, 293.66];
export const AMBIENT_BOSS_PULSE_SECONDS = 0.82;
export const CRICKET_STAGE_LEVELS = [0.16, 0.55, 1];
export const CRICKET_BOSS_FADE_SECONDS = 2;
export const CRICKET_INTERVAL = [1.4, 3.5];
export const CRICKET_TRILL_PULSES = [3, 5];
export const CRICKET_PULSE_SECONDS = 0.055;
export const CRICKET_PITCH = [4000, 5000];
export const CRICKET_PANS = [-0.75, 0.65, -0.3];
export const AUDIO_MUTE_STORAGE_KEY = 'todes-tea-time-muted';
export const AUDIO_COMPRESSOR = { threshold: -18, knee: 18, ratio: 3, attack: 0.008, release: 0.18 };
export const SOUND_PRESETS = {
  jump: { notes: [[360, 550, 0.11, 0.12, 'sine']] },
  attack: { noise: [0.24, 0.3, 2400, 300, 'bandpass'] },
  tongueShot: { notes: [[440, 1000, 0.11, 0.16, 'sawtooth']] },
  tongueEat: { notes: [[240, 90, 0.15, 0.22, 'sine']], noise: [0.11, 0.07, 550, 180, 'lowpass'] },
  gruntKill: { notes: [[460, 130, 0.16, 0.16, 'triangle']] },
  bruteHit: { notes: [[115, 68, 0.22, 0.24, 'sawtooth']], noise: [0.15, 0.12, 180, 90, 'lowpass'] },
  bruteGrunt: { notes: [[132, 73, 0.31, 0.16, 'sawtooth']] },
  bruteKill: { notes: [[105, 42, 0.65, 0.26, 'sawtooth']] },
  pickup: { notes: [[650, 880, 0.21, 0.13, 'sine'], [980, 1250, 0.25, 0.08, 'sine', 0.09]] },
  matcha: { notes: [[110, 48, 0.5, 0.3, 'sine']], noise: [0.48, 0.16, 1800, 300, 'bandpass'] },
  shield: { notes: [[880, 650, 0.42, 0.17, 'sine'], [1320, 920, 0.38, 0.07, 'triangle']] },
  heart: { notes: [[95, 48, 0.28, 0.34, 'sine']] },
  upgradeOpen: { noise: [0.35, 0.09, 380, 2200, 'bandpass'] },
  upgradePick: { notes: [[392, 392, 0.23, 0.14, 'sine', 0], [493.88, 493.88, 0.23, 0.14, 'sine', 0.1], [587.33, 587.33, 0.35, 0.15, 'sine', 0.2]] },
  stage: { notes: [[330, 330, 0.24, 0.12, 'triangle'], [440, 440, 0.31, 0.15, 'triangle', 0.16]] },
  bossWarning: { notes: [[68, 83, 1.1, 0.19, 'sawtooth'], [210, 480, 0.8, 0.1, 'triangle', 0.18]] },
  telegraph: { notes: [[650, 520, 0.13, 0.13, 'square'], [650, 520, 0.13, 0.13, 'square', 0.29]] },
  dash: { noise: [0.48, 0.26, 2400, 190, 'bandpass'] },
  stomp: { notes: [[74, 36, 0.56, 0.36, 'sine']], noise: [0.38, 0.15, 380, 90, 'lowpass'] },
  crash: { noise: [0.52, 0.31, 1800, 160, 'bandpass'], notes: [[920, 430, 0.68, 0.15, 'triangle']] },
  phase: { notes: [[82, 48, 0.72, 0.28, 'sawtooth'], [330, 550, 0.5, 0.12, 'triangle', 0.12]] },
  gameOver: { notes: [[392, 392, 0.33, 0.16, 'sine'], [293.66, 293.66, 0.33, 0.16, 'sine', 0.3], [196, 196, 0.55, 0.18, 'sine', 0.6]] },
  bruteGrowl: { notes: [[105, 58, 0.67, 0.19, 'sawtooth']], noise: [0.52, 0.1, 400, 130, 'lowpass'] },
  bruteStep: { notes: [[83, 51, 0.17, 0.15, 'sine']] },
  bossRoar: { notes: [[68, 44, 1.5, 0.24, 'sawtooth']], noise: [1.35, 0.18, 180, 1250, 'bandpass'] },
  bossStep: { notes: [[63, 39, 0.27, 0.24, 'sine']] },
  bossHit: { notes: [[140, 70, 0.18, 0.22, 'triangle']] },
  achievement: { notes: [[523.25, 523.25, 0.22, 0.13, 'sine'], [659.25, 659.25, 0.28, 0.13, 'sine', 0.12], [783.99, 783.99, 0.38, 0.15, 'sine', 0.24]] },
  bossDefeat: { notes: [[61, 34, 1.1, 0.24, 'sawtooth']] },
};
export const BREW_NOTE_MULTIPLIERS = { 'Green Tea': 1, Chamomile: 1.19, 'Matcha Burst': 0.85 };
export const FANFARE_NOTES = [261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5];
export const FANFARE_NOTE_GAP = 0.38;
export const FANFARE_NOTE_LENGTH = 0.65;
export const HUD_PULSE_SECONDS = 0.22;
export const HUD_HEART_SHAKE_SECONDS = 0.3;
export const HUD_BREW_SLIDE_SECONDS = 0.25;
export const HUD_BOSS_HIT_SECONDS = 0.2;
export const HUD_BOSS_PHASE_SECONDS = 0.5;
export const START_STORY = 'Defend Tode’s home so he can finish his tea in peace.';
export const START_CONTROLS = 'WASD or arrows: hop · Space: ring attack · E: tongue · P: pause · M: mute';
export const AMBIENT_HARMONIC_MULTIPLIER = 2;
export const AMBIENT_HARMONIC_VOLUME = 0.4;
export const AMBIENT_BOSS_PULSE = [65, 58, 0.24, 0.1];
export const CRICKET_PITCH_FALL = 0.96;
export const CRICKET_PULSE_GAIN = 0.11;

// Phase 5 save data and achievement presentation.
export const SAVE_STORAGE_KEY = 'todeTeaTime.v1';
export const ACHIEVEMENT_TOAST_SECONDS = 3;
export const ACHIEVEMENT_TOAST_EXIT_SECONDS = 0.35;
export const ACHIEVEMENT_BADGE_PULSE_SECONDS = 0.7;
export const ACHIEVEMENTS = [
  { id: 'first-sip', name: 'First Sip', description: 'Collect your first tea leaf.', goal: 1 },
  { id: 'frog-chef', name: 'Frog Chef', description: 'Eat 10 Grunts with the tongue in one run.', goal: 10 },
  { id: 'centurion', name: 'Centurion', description: 'Reach 100 kills in one run.', goal: 100 },
  { id: 'tea-party', name: 'Tea Party', description: 'Have all 3 brews active together.', goal: 3 },
  { id: 'untouchable', name: 'Untouchable', description: 'Survive 60 seconds without losing a heart.', goal: 60 },
  { id: 'crash-test', name: 'Crash Test', description: 'Make the boss crash into a house.', goal: 1 },
  { id: 'monster-king-slayer', name: 'Monster King Slayer', description: 'Defeat the boss.', goal: 1 },
  { id: 'fully-brewed', name: 'Fully Brewed', description: 'Take 6 upgrade cards in one run.', goal: 6 },
];
