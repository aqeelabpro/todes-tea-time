import * as THREE from 'three';
import {
  BOSS_DUST_COLOR, BOSS_DUST_COUNT, BOSS_DUST_HEIGHT, BOSS_DUST_LIFETIME,
  BOSS_DUST_SIZE, BOSS_DUST_SPEED, BOSS_DUST_SPEED_VARIATION,
  BOSS_DUST_SPHERE_SEGMENTS, BOSS_DUST_SPHERE_RINGS,
} from '../config.js';

export function createBossCrashEffects(scene) {
  const bursts = [];

  function dispose(burst) {
    scene.remove(burst.group);
    burst.geometry.dispose();
    burst.material.dispose();
  }

  function burst(position) {
    const group = new THREE.Group();
    const geometry = new THREE.SphereGeometry(BOSS_DUST_SIZE, BOSS_DUST_SPHERE_SEGMENTS, BOSS_DUST_SPHERE_RINGS);
    const material = new THREE.MeshBasicMaterial({
      color: BOSS_DUST_COLOR, transparent: true, opacity: 1, depthWrite: false,
    });
    const particles = [];
    for (let index = 0; index < BOSS_DUST_COUNT; index++) {
      const angle = index / BOSS_DUST_COUNT * Math.PI * 2;
      const speed = BOSS_DUST_SPEED * (1 - Math.random() * BOSS_DUST_SPEED_VARIATION);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(position.x, position.y, BOSS_DUST_HEIGHT);
      group.add(mesh);
      particles.push({ mesh, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }
    scene.add(group);
    bursts.push({ group, geometry, material, particles, age: 0 });
  }

  function update(dt) {
    for (let index = bursts.length - 1; index >= 0; index--) {
      const item = bursts[index];
      item.age += dt;
      const remaining = Math.max(0, 1 - item.age / BOSS_DUST_LIFETIME);
      item.material.opacity = remaining;
      for (const particle of item.particles) {
        particle.mesh.position.x += particle.vx * dt;
        particle.mesh.position.y += particle.vy * dt;
        particle.mesh.scale.setScalar(remaining);
      }
      if (remaining === 0) {
        dispose(item);
        bursts.splice(index, 1);
      }
    }
  }

  function reset() {
    for (const item of bursts) dispose(item);
    bursts.length = 0;
  }

  return { burst, update, reset };
}
