import * as THREE from 'three';
import {
  TONGUE_CAUGHT_COLOR, TONGUE_CAUGHT_RADIUS, TONGUE_COLOR,
  TONGUE_CYLINDER_SIDES, TONGUE_SPHERE_SEGMENTS, TONGUE_SPHERE_RINGS,
  TONGUE_EXTENSION_SECONDS, TONGUE_HEIGHT, TONGUE_MOUTH_FORWARD,
  TONGUE_RADIUS, TONGUE_RETRACTION_SECONDS, TONGUE_TIP_RADIUS,
} from '../config.js';

// The target is reserved during the short extension, then removed through the
// normal enemy kill path. The small shrinking orb shows it returning to Tode.
export function createTongue(scene, player, enemies, upgrades, hooks = {}) {
  const group = new THREE.Group();
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(TONGUE_RADIUS, TONGUE_RADIUS, 1, TONGUE_CYLINDER_SIDES),
    new THREE.MeshBasicMaterial({ color: TONGUE_COLOR }),
  );
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(TONGUE_TIP_RADIUS, TONGUE_SPHERE_SEGMENTS, TONGUE_SPHERE_RINGS),
    tube.material.clone(),
  );
  const caught = new THREE.Mesh(
    new THREE.SphereGeometry(TONGUE_CAUGHT_RADIUS, TONGUE_SPHERE_SEGMENTS, TONGUE_SPHERE_RINGS),
    new THREE.MeshBasicMaterial({ color: TONGUE_CAUGHT_COLOR }),
  );
  group.add(tube, tip, caught);
  group.visible = false;
  caught.visible = false;
  scene.add(group);

  let cooldownLeft = 0;
  let phase = 'idle';
  let age = 0;
  let target = null;
  let targetPosition = null;

  function mouthPosition() {
    const position = player.group.getWorldPosition(new THREE.Vector3());
    const [x, y] = player.facing;
    position.x += x * TONGUE_MOUTH_FORWARD;
    position.y += y * TONGUE_MOUTH_FORWARD;
    position.z += TONGUE_HEIGHT;
    return position;
  }

  function draw(progress) {
    const mouth = mouthPosition();
    const dx = targetPosition.x - mouth.x;
    const dy = targetPosition.y - mouth.y;
    const distance = Math.hypot(dx, dy);
    const length = distance * progress;
    tube.scale.y = Math.max(0.001, length);
    tube.rotation.z = -Math.atan2(dx, dy);
    tube.position.set(mouth.x + dx * progress / 2, mouth.y + dy * progress / 2, mouth.z);
    tip.position.set(mouth.x + dx * progress, mouth.y + dy * progress, mouth.z);
    if (caught.visible) {
      const retreat = 1 - progress;
      caught.position.set(
        THREE.MathUtils.lerp(targetPosition.x, mouth.x, retreat),
        THREE.MathUtils.lerp(targetPosition.y, mouth.y, retreat),
        mouth.z,
      );
      caught.scale.setScalar(progress);
    }
  }

  function fire() {
    if (cooldownLeft > 0 || phase !== 'idle') return false;
    const position = player.group.getWorldPosition(new THREE.Vector3());
    let nearest = null;
    let nearestDistance = Infinity;
    for (const enemy of enemies.enemies) {
      if (enemy.type !== 'grunt' || enemy.tongueCaptured) continue;
      const distance = Math.hypot(enemy.group.position.x - position.x, enemy.group.position.y - position.y);
      if (distance - enemy.radius <= upgrades.tongueRange && distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    }
    if (!nearest) return false;
    target = nearest;
    target.tongueCaptured = true;
    targetPosition = nearest.group.getWorldPosition(new THREE.Vector3());
    phase = 'extend';
    age = 0;
    group.visible = true;
    caught.visible = false;
    draw(0);
    hooks.onTongueFired?.(targetPosition.clone());
    return true;
  }

  function update(dt) {
    cooldownLeft = Math.max(0, cooldownLeft - dt);
    if (phase === 'idle') return;
    age += dt;
    if (phase === 'extend') {
      draw(Math.min(1, age / TONGUE_EXTENSION_SECONDS));
      if (age >= TONGUE_EXTENSION_SECONDS) {
        if (enemies.enemies.includes(target)) {
          enemies.remove(target, true, 'tongue');
          cooldownLeft = upgrades.tongueCooldown;
          caught.visible = true;
          hooks.onTongueEat?.(targetPosition.clone());
        }
        phase = 'retract';
        age -= TONGUE_EXTENSION_SECONDS;
      }
    }
    if (phase === 'retract') {
      draw(Math.max(0, 1 - age / TONGUE_RETRACTION_SECONDS));
      if (age >= TONGUE_RETRACTION_SECONDS) {
        phase = 'idle';
        group.visible = false;
        caught.visible = false;
        target = null;
        targetPosition = null;
      }
    }
  }

  function reset() {
    if (target && enemies.enemies.includes(target)) target.tongueCaptured = false;
    cooldownLeft = 0;
    phase = 'idle';
    age = 0;
    target = null;
    targetPosition = null;
    group.visible = false;
    caught.visible = false;
  }

  return {
    fire, update, reset,
    get cooldownLeft() { return cooldownLeft; },
    get cooldown() { return upgrades.tongueCooldown; },
  };
}
