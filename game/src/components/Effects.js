import * as THREE from 'three';
import {
  ATTACK_EFFECT_SECONDS, CAMERA_POSITION, EFFECT_RING_HEIGHT, EFFECT_RING_OPACITY,
  EFFECT_RING_SEGMENTS, EFFECT_RING_THICKNESS, GROUND_EFFECT_RENDER_ORDER, HITSTOP_BOSS_SECONDS,
  HITSTOP_BRUTE_SECONDS, PARTICLE_CAP, PARTICLE_GRAVITY, PARTICLE_HEIGHT,
  PARTICLE_POINT_SIZE, PARTICLE_PRESETS, PARTICLE_SPEED_VARIATION,
  PLAYER_HIT_TINT_SECONDS, SCREEN_SHAKE_ENABLED, SPACE_RING_END_SCALE,
  SPACE_RING_SECONDS, SPACE_RING_START_SCALE,
} from '../config.js';

export function createEffects(scene, camera, player) {
  const positions = new Float32Array(PARTICLE_CAP * 3);
  const colors = new Float32Array(PARTICLE_CAP * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({
    size: PARTICLE_POINT_SIZE, vertexColors: true, transparent: true,
    opacity: 0.95, depthWrite: false, sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  const particles = [];
  const free = [];
  const rings = [];
  let shakeLeft = 0;
  let shakeDuration = 0;
  let shakePower = 0;
  let slowLeft = 0;
  let slowScale = 1;
  let hitstopLeft = 0;
  let tintLeft = 0;

  function shake(power, duration) {
    if (!SCREEN_SHAKE_ENABLED) return;
    shakePower = Math.max(shakePower, power);
    shakeDuration = Math.max(shakeDuration, duration);
    shakeLeft = Math.max(shakeLeft, duration);
  }

  function slowMotion(duration, scale) {
    slowLeft = Math.max(slowLeft, duration);
    slowScale = scale;
  }

  function hitStop(type) {
    hitstopLeft = Math.max(hitstopLeft, type === 'boss' ? HITSTOP_BOSS_SECONDS : HITSTOP_BRUTE_SECONDS);
  }

  function playerHit() {
    tintLeft = PLAYER_HIT_TINT_SECONDS;
  }

  function emit(kind, center, color = null, radius = 0) {
    const preset = PARTICLE_PRESETS[kind];
    if (!preset) return;
    const tint = new THREE.Color(color ?? preset.color);
    for (let index = 0; index < preset.count && particles.length < PARTICLE_CAP; index++) {
      const angle = index / preset.count * Math.PI * 2 + Math.random() * 0.3;
      const speed = preset.speed * (1 - Math.random() * PARTICLE_SPEED_VARIATION);
      const particle = free.pop() ?? {};
      particle.x = center.x;
      particle.y = center.y;
      particle.z = center.z + PARTICLE_HEIGHT;
      particle.vx = Math.cos(angle) * (radius ? radius / preset.life : speed);
      particle.vy = Math.sin(angle) * (radius ? radius / preset.life : speed);
      particle.vz = preset.lift * (0.55 + Math.random() * 0.45);
      particle.life = preset.life;
      particle.maxLife = preset.life;
      particle.color = tint;
      particles.push(particle);
    }
  }

  function ring(center, radius, color, space = false) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(radius - EFFECT_RING_THICKNESS, radius, EFFECT_RING_SEGMENTS),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: EFFECT_RING_OPACITY,
        depthWrite: false, depthTest: false, side: THREE.DoubleSide,
      }),
    );
    mesh.position.set(center.x, center.y, EFFECT_RING_HEIGHT);
    mesh.renderOrder = GROUND_EFFECT_RENDER_ORDER;
    mesh.scale.setScalar(space ? SPACE_RING_START_SCALE : 0.05);
    scene.add(mesh);
    rings.push({ mesh, age: 0, duration: space ? SPACE_RING_SECONDS : ATTACK_EFFECT_SECONDS, space });
  }

  function updateVisual(simDt, realDt) {
    if (shakeLeft > 0) {
      shakeLeft = Math.max(0, shakeLeft - realDt);
      const power = shakePower * shakeLeft / shakeDuration;
      camera.position.set(CAMERA_POSITION[0] + (Math.random() * 2 - 1) * power,
        CAMERA_POSITION[1] + (Math.random() * 2 - 1) * power, CAMERA_POSITION[2]);
      if (shakeLeft === 0) shakePower = 0;
    } else camera.position.set(...CAMERA_POSITION);

    tintLeft = Math.max(0, tintLeft - simDt);
    player.setHitTint(tintLeft / PLAYER_HIT_TINT_SECONDS);

    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      particle.life -= simDt;
      if (particle.life <= 0) {
        free.push(particle);
        particles.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * simDt;
      particle.y += particle.vy * simDt;
      particle.z = Math.max(EFFECT_RING_HEIGHT, particle.z + particle.vz * simDt);
      particle.vz -= PARTICLE_GRAVITY * simDt;
    }
    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      const offset = index * 3;
      const fade = particle.life / particle.maxLife;
      positions[offset] = particle.x;
      positions[offset + 1] = particle.y;
      positions[offset + 2] = particle.z;
      colors[offset] = particle.color.r * fade;
      colors[offset + 1] = particle.color.g * fade;
      colors[offset + 2] = particle.color.b * fade;
    }
    geometry.setDrawRange(0, particles.length);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    for (let index = rings.length - 1; index >= 0; index--) {
      const item = rings[index];
      item.age += simDt;
      const progress = Math.min(1, item.age / item.duration);
      item.mesh.scale.setScalar(item.space
        ? THREE.MathUtils.lerp(SPACE_RING_START_SCALE, SPACE_RING_END_SCALE, progress) : progress);
      item.mesh.material.opacity = EFFECT_RING_OPACITY * (1 - progress);
      if (progress === 1) {
        scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        rings.splice(index, 1);
      }
    }
  }

  function step(realDt) {
    const stopped = hitstopLeft > 0;
    hitstopLeft = Math.max(0, hitstopLeft - realDt);
    const scale = slowLeft > 0 ? slowScale : 1;
    slowLeft = Math.max(0, slowLeft - realDt);
    const simDt = stopped ? 0 : realDt * scale;
    updateVisual(simDt, realDt);
    return simDt;
  }

  function reset() {
    for (const item of rings) {
      scene.remove(item.mesh);
      item.mesh.geometry.dispose();
      item.mesh.material.dispose();
    }
    rings.length = 0;
    free.push(...particles);
    particles.length = 0;
    geometry.setDrawRange(0, 0);
    shakeLeft = 0;
    shakePower = 0;
    shakeDuration = 0;
    slowLeft = 0;
    hitstopLeft = 0;
    tintLeft = 0;
    player.setHitTint(0);
    camera.position.set(...CAMERA_POSITION);
  }

  function dispose() {
    reset();
    scene.remove(points);
    geometry.dispose();
    material.dispose();
  }

  return { shake, slowMotion, hitStop, playerHit, emit, ring, step, reset, dispose };
}
