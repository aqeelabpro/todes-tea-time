import * as THREE from 'three';
import {
  ATMOSPHERE_ENABLED, ATMOSPHERE_STAGES, ATMOSPHERE_TRANSITION_SECONDS,
  ATMOSPHERE_MIN_AMBIENT, ATMOSPHERE_MIN_DIRECTIONAL,
  ATMOSPHERE_BOSS_RED_BLEND, ATMOSPHERE_BOSS_RED_COLOR,
  FIREFLY_COUNT, FIREFLY_COLOR, FIREFLY_SIZE, FIREFLY_MIN_HEIGHT,
  FIREFLY_HEIGHT_RANGE, FIREFLY_DRIFT, FIREFLY_SPEED, FIREFLY_MAP_INSET,
  HOUSE_POSITIONS, MAP_HALF_SIZE, WINDOW_GLOW_COLOR, WINDOW_LIGHT_HEIGHT,
  WINDOW_LIGHT_DISTANCE, WINDOW_LIGHT_POWER,
} from '../config.js';

export function createAtmosphere(scene, renderer, world) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(FIREFLY_COUNT * 3);
  const seeds = Array.from({ length: FIREFLY_COUNT }, () => ({
    x: (Math.random() * 2 - 1) * (MAP_HALF_SIZE - FIREFLY_MAP_INSET),
    y: (Math.random() * 2 - 1) * (MAP_HALF_SIZE - FIREFLY_MAP_INSET),
    z: FIREFLY_MIN_HEIGHT + Math.random() * FIREFLY_HEIGHT_RANGE,
    phase: Math.random() * Math.PI * 2,
  }));
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.PointsMaterial({ color: FIREFLY_COLOR, size: FIREFLY_SIZE,
    transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const fireflies = new THREE.Points(geometry, material);
  fireflies.frustumCulled = false;
  scene.add(fireflies);
  const windows = HOUSE_POSITIONS.map(([x, y]) => {
    const light = new THREE.PointLight(WINDOW_GLOW_COLOR, 0, WINDOW_LIGHT_DISTANCE);
    light.position.set(x, y, WINDOW_LIGHT_HEIGHT);
    scene.add(light);
    return light;
  });
  const red = new THREE.Color(ATMOSPHERE_BOSS_RED_COLOR);
  const background = new THREE.Color();
  const ambientColor = new THREE.Color();
  const sunColor = new THREE.Color();
  let stageBlend = 0;
  let bossBlend = 0;
  let elapsed = 0;
  const approach = (current, target, step) => current < target
    ? Math.min(target, current + step) : Math.max(target, current - step);

  function apply() {
    if (!ATMOSPHERE_ENABLED) return;
    const lower = Math.floor(stageBlend);
    const upper = Math.min(ATMOSPHERE_STAGES.length - 1, lower + 1);
    const fraction = stageBlend - lower;
    const a = ATMOSPHERE_STAGES[lower];
    const b = ATMOSPHERE_STAGES[upper];
    background.set(a.background).lerp(new THREE.Color(b.background), fraction).lerp(red, bossBlend);
    ambientColor.set(a.ambient).lerp(new THREE.Color(b.ambient), fraction).lerp(red, bossBlend);
    sunColor.set(a.sun).lerp(new THREE.Color(b.sun), fraction).lerp(red, bossBlend);
    scene.background.copy(background);
    renderer.setClearColor(background);
    world.ambient.color.copy(ambientColor);
    world.sun.color.copy(sunColor);
    world.ambient.intensity = Math.max(ATMOSPHERE_MIN_AMBIENT, THREE.MathUtils.lerp(a.ambientPower, b.ambientPower, fraction));
    world.sun.intensity = Math.max(ATMOSPHERE_MIN_DIRECTIONAL, THREE.MathUtils.lerp(a.sunPower, b.sunPower, fraction));
    const glow = THREE.MathUtils.lerp(a.windows, b.windows, fraction);
    for (const light of windows) light.intensity = WINDOW_LIGHT_POWER * glow;
    material.opacity = THREE.MathUtils.lerp(a.fireflies, b.fireflies, fraction);
  }

  function update(dt, stage, bossAlive) {
    if (!ATMOSPHERE_ENABLED) return;
    const target = Math.min(ATMOSPHERE_STAGES.length - 1, Math.max(0, stage - 1));
    stageBlend = approach(stageBlend, target, dt / ATMOSPHERE_TRANSITION_SECONDS);
    bossBlend = approach(bossBlend, bossAlive ? ATMOSPHERE_BOSS_RED_BLEND : 0,
      dt * ATMOSPHERE_BOSS_RED_BLEND / ATMOSPHERE_TRANSITION_SECONDS);
    elapsed += dt;
    seeds.forEach((seed, index) => {
      positions[index * 3] = seed.x + Math.sin(elapsed * FIREFLY_SPEED + seed.phase) * FIREFLY_DRIFT;
      positions[index * 3 + 1] = seed.y + Math.cos(elapsed * FIREFLY_SPEED + seed.phase) * FIREFLY_DRIFT;
      positions[index * 3 + 2] = seed.z + Math.sin(elapsed * FIREFLY_SPEED + seed.phase) * FIREFLY_DRIFT;
    });
    geometry.attributes.position.needsUpdate = true;
    apply();
  }

  function reset() {
    stageBlend = 0;
    bossBlend = 0;
    elapsed = 0;
    apply();
  }
  reset();
  return { update, reset, dispose() {
    scene.remove(fireflies);
    geometry.dispose();
    material.dispose();
    for (const light of windows) scene.remove(light);
  } };
}
