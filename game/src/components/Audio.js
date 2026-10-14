import * as THREE from 'three';
import {
  AMBIENT_BOSS_PULSE_SECONDS, AMBIENT_NOTE_LENGTH, AMBIENT_NOTE_SECONDS,
  AMBIENT_PENTATONIC, AMBIENT_VOICE_VOLUME, AMBIENT_VOLUME, AMBIENT_HARMONIC_MULTIPLIER,
  AMBIENT_HARMONIC_VOLUME, AMBIENT_BOSS_PULSE, CRICKET_PITCH_FALL,
  CRICKET_PULSE_GAIN, AUDIO_ATTACK_SECONDS,
  AUDIO_BOSS_DUCK_SECONDS, AUDIO_COMPRESSOR, AUDIO_DEBUG_PANS,
  AUDIO_DEBUG_SEQUENCE, AUDIO_DEBUG_STEP_SECONDS, AUDIO_DRAMA_DUCK,
  AUDIO_FADE_SECONDS, AUDIO_MUTE_STORAGE_KEY, AUDIO_NEAREST_BRUTES,
  AUDIO_NOISE_SECONDS, AUDIO_PITCH_JITTER, AUDIO_RELEASE_FLOOR,
  AUDIO_SPATIAL_MIN_GAIN, AUDIO_SPATIAL_RANGE, AUDIO_STOP_TAIL,
  BREW_NOTE_MULTIPLIERS, CRICKET_BOSS_FADE_SECONDS, CRICKET_INTERVAL,
  CRICKET_PANS, CRICKET_PITCH, CRICKET_PULSE_SECONDS, CRICKET_STAGE_LEVELS,
  CRICKET_TRILL_PULSES, CRICKET_VOLUME, FANFARE_NOTE_GAP,
  FANFARE_NOTE_LENGTH, FANFARE_NOTES, MASTER_VOLUME, MAX_VOICES,
  SFX_VOLUME, SOUND_PRESETS,
} from '../config.js';

const between = ([low, high]) => low + Math.random() * (high - low);

export function createAudio(camera, player) {
  let context = null;
  let master = null;
  let sfxBus = null;
  let ambientBus = null;
  let cricketBus = null;
  let noiseBuffer = null;
  let muted = false;
  try { muted = localStorage.getItem(AUDIO_MUTE_STORAGE_KEY) === '1'; } catch { /* Storage may be disabled. */ }
  const voices = new Set();
  let ambientClock = 0;
  let bossPulseClock = 0;
  let cricketClock = between(CRICKET_INTERVAL);
  let duckLeft = 0;
  let debugIndex = -1;
  let debugClock = 0;

  function gesture() {
    if (!context) {
      const Constructor = window.AudioContext || window.webkitAudioContext;
      if (!Constructor) return;
      context = new Constructor();
      master = context.createGain();
      master.gain.value = muted ? 0 : MASTER_VOLUME;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = AUDIO_COMPRESSOR.threshold;
      compressor.knee.value = AUDIO_COMPRESSOR.knee;
      compressor.ratio.value = AUDIO_COMPRESSOR.ratio;
      compressor.attack.value = AUDIO_COMPRESSOR.attack;
      compressor.release.value = AUDIO_COMPRESSOR.release;
      master.connect(compressor).connect(context.destination);
      sfxBus = context.createGain();
      sfxBus.gain.value = SFX_VOLUME;
      sfxBus.connect(master);
      ambientBus = context.createGain();
      ambientBus.gain.value = 0;
      ambientBus.connect(master);
      cricketBus = context.createGain();
      cricketBus.gain.value = 0;
      cricketBus.connect(master);
      noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * AUDIO_NOISE_SECONDS), context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let index = 0; index < samples.length; index++) samples[index] = Math.random() * 2 - 1;
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem(AUDIO_MUTE_STORAGE_KEY, muted ? '1' : '0'); } catch { /* Storage may be disabled. */ }
    if (context) master.gain.setTargetAtTime(muted ? 0 : MASTER_VOLUME, context.currentTime, AUDIO_FADE_SECONDS);
    return muted;
  }

  function positionMix(position, panOverride) {
    if (panOverride != null) return { pan: panOverride, gain: 1 };
    if (!position) return { pan: 0, gain: 1 };
    camera.updateMatrixWorld();
    const world = new THREE.Vector3(position.x, position.y, position.z ?? 0);
    const screen = world.clone().project(camera);
    const distance = Math.hypot(world.x - player.position.x, world.y - player.position.y);
    return {
      pan: THREE.MathUtils.clamp(screen.x, -1, 1),
      gain: Math.max(AUDIO_SPATIAL_MIN_GAIN, 1 - distance / AUDIO_SPATIAL_RANGE),
    };
  }

  function outlet(bus, position, panOverride, peak) {
    if (!context || voices.size >= MAX_VOICES) return null;
    const { pan, gain } = positionMix(position, panOverride);
    const envelope = context.createGain();
    envelope.gain.value = AUDIO_RELEASE_FLOOR;
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    envelope.connect(panner).connect(bus);
    return { envelope, panner, peak: peak * gain };
  }

  function finish(source, nodes) {
    voices.add(source);
    source.onended = () => {
      voices.delete(source);
      source.disconnect();
      for (const node of nodes) node.disconnect();
    };
  }

  function tone(start, end, duration, volume, type = 'sine', delay = 0, bus = sfxBus,
    position = null, panOverride = null, filterFrequency = null) {
    const output = outlet(bus, position, panOverride, volume);
    if (!output) return;
    const time = context.currentTime + delay;
    const source = context.createOscillator();
    source.type = type;
    const jitter = 1 + (Math.random() * 2 - 1) * AUDIO_PITCH_JITTER;
    source.frequency.setValueAtTime(Math.max(1, start * jitter), time);
    source.frequency.exponentialRampToValueAtTime(Math.max(1, end * jitter), time + duration);
    const nodes = [output.envelope, output.panner];
    if (filterFrequency) {
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFrequency;
      source.connect(filter).connect(output.envelope);
      nodes.push(filter);
    } else source.connect(output.envelope);
    output.envelope.gain.setValueAtTime(AUDIO_RELEASE_FLOOR, time);
    output.envelope.gain.linearRampToValueAtTime(Math.max(AUDIO_RELEASE_FLOOR, output.peak), time + AUDIO_ATTACK_SECONDS);
    output.envelope.gain.exponentialRampToValueAtTime(AUDIO_RELEASE_FLOOR, time + duration);
    finish(source, nodes);
    source.start(time);
    source.stop(time + duration + AUDIO_STOP_TAIL);
  }

  function noise(duration, volume, startFrequency, endFrequency, filterType,
    bus = sfxBus, position = null, panOverride = null) {
    const output = outlet(bus, position, panOverride, volume);
    if (!output) return;
    const time = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(startFrequency, time);
    filter.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), time + duration);
    source.connect(filter).connect(output.envelope);
    output.envelope.gain.setValueAtTime(AUDIO_RELEASE_FLOOR, time);
    output.envelope.gain.linearRampToValueAtTime(Math.max(AUDIO_RELEASE_FLOOR, output.peak), time + AUDIO_ATTACK_SECONDS);
    output.envelope.gain.exponentialRampToValueAtTime(AUDIO_RELEASE_FLOOR, time + duration);
    finish(source, [filter, output.envelope, output.panner]);
    source.start(time);
    source.stop(time + duration + AUDIO_STOP_TAIL);
  }

  function play(name, position = null, panOverride = null, pitch = 1) {
    if (!context || muted) return;
    const preset = SOUND_PRESETS[name];
    if (!preset) return;
    for (const [start, end, duration, volume, type, delay = 0] of preset.notes ?? []) {
      tone(start * pitch, end * pitch, duration, volume, type, delay, sfxBus, position, panOverride);
    }
    if (preset.noise) noise(...preset.noise, sfxBus, position, panOverride);
    if (['bruteGrowl', 'bossRoar', 'phase', 'crash', 'stomp', 'bossDefeat'].includes(name)) {
      duckLeft = AUDIO_BOSS_DUCK_SECONDS;
    }
  }

  function fanfare() {
    if (!context || muted) return;
    FANFARE_NOTES.forEach((frequency, index) => {
      tone(frequency, frequency, FANFARE_NOTE_LENGTH, 0.16, 'triangle',
        index * FANFARE_NOTE_GAP);
    });
  }

  function cricketTrill(pan = CRICKET_PANS[Math.floor(Math.random() * CRICKET_PANS.length)]) {
    if (!context || muted || voices.size >= MAX_VOICES - AUDIO_NEAREST_BRUTES) return;
    const pulses = Math.floor(between(CRICKET_TRILL_PULSES)) + 1;
    const pitch = between(CRICKET_PITCH);
    for (let index = 0; index < pulses; index++) {
      tone(pitch, pitch * CRICKET_PITCH_FALL, CRICKET_PULSE_SECONDS, CRICKET_PULSE_GAIN, 'sine',
        index * CRICKET_PULSE_SECONDS * 2, cricketBus, null, pan, pitch);
    }
  }

  function playDebug(name) {
    if (name === 'victory') return fanfare();
    if (name === 'cricket') return cricketTrill();
    if (name === 'panLeft') return play('bruteGrowl', null, AUDIO_DEBUG_PANS[0]);
    if (name === 'panRight') return play('bossRoar', null, AUDIO_DEBUG_PANS[1]);
    play(name);
  }

  function update(dt, mode, stage, bossAlive) {
    if (!context) return;
    const playing = mode === 'playing';
    const now = context.currentTime;
    ambientBus.gain.setTargetAtTime(playing ? AMBIENT_VOLUME : 0, now, AUDIO_FADE_SECONDS);
    const level = CRICKET_STAGE_LEVELS[Math.min(stage - 1, CRICKET_STAGE_LEVELS.length - 1)];
    const duck = duckLeft > 0 ? AUDIO_DRAMA_DUCK : 1;
    cricketBus.gain.setTargetAtTime(playing && !bossAlive ? CRICKET_VOLUME * level * duck : 0,
      now, bossAlive ? CRICKET_BOSS_FADE_SECONDS : AUDIO_FADE_SECONDS);
    if (!playing) return;
    duckLeft = Math.max(0, duckLeft - dt);
    ambientClock += dt;
    if (ambientClock >= AMBIENT_NOTE_SECONDS) {
      ambientClock -= AMBIENT_NOTE_SECONDS;
      const frequency = AMBIENT_PENTATONIC[Math.floor(Math.random() * AMBIENT_PENTATONIC.length)];
      tone(frequency, frequency, AMBIENT_NOTE_LENGTH, AMBIENT_VOICE_VOLUME, 'sine', 0, ambientBus);
      tone(frequency * AMBIENT_HARMONIC_MULTIPLIER, frequency * AMBIENT_HARMONIC_MULTIPLIER,
        AMBIENT_NOTE_LENGTH, AMBIENT_VOICE_VOLUME * AMBIENT_HARMONIC_VOLUME, 'triangle', 0, ambientBus);
    }
    bossPulseClock = bossAlive ? bossPulseClock + dt : 0;
    if (bossPulseClock >= AMBIENT_BOSS_PULSE_SECONDS) {
      bossPulseClock -= AMBIENT_BOSS_PULSE_SECONDS;
      tone(...AMBIENT_BOSS_PULSE, 'sine', 0, ambientBus);
    }
    cricketClock -= dt;
    if (cricketClock <= 0) {
      cricketClock = between(CRICKET_INTERVAL);
      if (!bossAlive) cricketTrill();
    }
    if (debugIndex >= 0) {
      debugClock -= dt;
      while (debugClock <= 0 && debugIndex < AUDIO_DEBUG_SEQUENCE.length) {
        playDebug(AUDIO_DEBUG_SEQUENCE[debugIndex++]);
        debugClock += AUDIO_DEBUG_STEP_SECONDS;
      }
      if (debugIndex >= AUDIO_DEBUG_SEQUENCE.length) debugIndex = -1;
    }
  }

  function reset() {
    ambientClock = 0;
    bossPulseClock = 0;
    cricketClock = between(CRICKET_INTERVAL);
    duckLeft = 0;
    debugIndex = -1;
    debugClock = 0;
  }

  return {
    gesture, toggleMute, update, reset, play,
    get muted() { return muted; },
    debugSequence() { debugIndex = 0; debugClock = 0; },
    jump: () => play('jump'), attack: () => play('attack'),
    tongueShot: () => play('tongueShot'), tongueEat: () => play('tongueEat'),
    gruntKill: (position) => play('gruntKill', position),
    bruteHit: (position) => { play('bruteHit', position); play('bruteGrunt', position); },
    bruteKill: (position) => { play('bruteKill', position); play('bruteGrowl', position); },
    leafPickup: (kind) => play('pickup', null, null, BREW_NOTE_MULTIPLIERS[kind] ?? 1),
    matcha: () => play('matcha'), shield: () => play('shield'),
    heart: () => play('heart'), upgradeOpen: () => play('upgradeOpen'),
    upgradePick: () => play('upgradePick'), stage: () => play('stage'),
    bossWarning: (position) => play('bossWarning', position),
    telegraph: (position) => play('telegraph', position),
    dash: (position) => play('dash', position),
    stomp: (position) => play('stomp', position),
    crash: (position) => play('crash', position),
    phase: (position) => { play('phase', position); play('bossRoar', position); },
    bossDefeat: (position) => { play('bossDefeat', position); fanfare(); },
    victory: fanfare, gameOver: () => play('gameOver'),
    bruteGrowl: (position) => play('bruteGrowl', position),
    bruteStep: (position) => play('bruteStep', position),
    bossRoar: (position) => play('bossRoar', position),
    bossStep: (position) => play('bossStep', position),
    bossHit: (position) => play('bossHit', position),
  };
}
