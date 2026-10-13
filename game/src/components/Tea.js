import * as THREE from 'three';
import {
  ATTACK_EFFECT_SECONDS, GREEN_TEA_SECONDS, LEAF_BLINK_SECONDS, LEAF_DROP_CHANCE,
  LEAF_LIFETIME_SECONDS, LEAF_VISUAL_SCALE, LEAF_HEIGHT, LEAF_BOB_HEIGHT,
  MATCHA_RADIUS, PICKUP_RADIUS, SHIELD_INVULNERABILITY_SECONDS, SHIELD_RING_RADIUS,
} from '../config.js';

function makeLeaf() {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.32);
  shape.bezierCurveTo(-0.37, -0.12, -0.28, 0.24, 0, 0.39);
  shape.bezierCurveTo(0.28, 0.24, 0.37, -0.12, 0, -0.32);
  const leaf = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshStandardMaterial({ color: '#8bdd5c', side: THREE.DoubleSide, emissive: '#254a16', emissiveIntensity: 0.2 }),
  );
  group.add(leaf);
  const vein = new THREE.Mesh(
    new THREE.BoxGeometry(0.025, 0.51, 0.025),
    new THREE.MeshBasicMaterial({ color: '#d6f6a0' }),
  );
  vein.position.y = 0.015;
  vein.position.z = 0.02;
  group.add(vein);
  group.scale.setScalar(LEAF_VISUAL_SCALE);
  return group;
}

function makeRing(radius, color) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(radius - 1.5, radius, 64), material);
  mesh.position.z = 0.25;
  return mesh;
}

export function createTea(scene, player, enemies, onChange) {
  const drops = [];
  const effects = [];
  const shieldRing = makeRing(SHIELD_RING_RADIUS, '#e9efac');
  shieldRing.visible = false;
  scene.add(shieldRing);
  let greenTeaLeft = 0;
  let shield = false;
  let invulnerableLeft = 0;
  let lastBrew = '';

  function drop(position, guaranteed = false) {
    if (!guaranteed && Math.random() >= LEAF_DROP_CHANCE) return;
    const mesh = makeLeaf();
    mesh.position.set(position.x, position.y, LEAF_HEIGHT);
    scene.add(mesh);
    drops.push({ mesh, age: 0, phase: Math.random() * Math.PI * 2 });
  }

  function effect(radius, color, center) {
    const ring = makeRing(radius, color);
    ring.position.set(center.x, center.y, 0.25);
    ring.scale.setScalar(0.05);
    scene.add(ring);
    effects.push({ ring, age: 0 });
  }

  function brew(kind) {
    lastBrew = kind;
    if (kind === 'Green Tea') greenTeaLeft = GREEN_TEA_SECONDS;
    if (kind === 'Chamomile') {
      shield = true;
      const center = player.group.getWorldPosition(new THREE.Vector3());
      shieldRing.position.set(center.x, center.y, 0.25);
      shieldRing.visible = true;
    }
    if (kind === 'Matcha Burst') {
      const center = player.group.getWorldPosition(new THREE.Vector3());
      effect(MATCHA_RADIUS, '#b5ed70', center);
      for (const enemy of [...enemies.enemies]) {
        const enemyPosition = enemy.group.getWorldPosition(new THREE.Vector3());
        if (Math.hypot(enemyPosition.x - center.x, enemyPosition.y - center.y) <= MATCHA_RADIUS) enemies.remove(enemy);
      }
    }
    onChange();
  }

  function update(dt, time) {
    if (shield) {
      const center = player.group.getWorldPosition(new THREE.Vector3());
      shieldRing.position.set(center.x, center.y, 0.25);
    }
    if (greenTeaLeft > 0) greenTeaLeft = Math.max(0, greenTeaLeft - dt);
    if (invulnerableLeft > 0) invulnerableLeft = Math.max(0, invulnerableLeft - dt);
    for (let i = drops.length - 1; i >= 0; i--) {
      const item = drops[i];
      item.age += dt;
      item.mesh.rotation.z += dt * 1.2;
      item.mesh.position.z = LEAF_HEIGHT + Math.sin(time * 3 + item.phase) * LEAF_BOB_HEIGHT;
      item.mesh.visible = item.age < LEAF_LIFETIME_SECONDS - LEAF_BLINK_SECONDS || Math.floor(item.age * 8) % 2 === 0;
      if (Math.hypot(item.mesh.position.x - player.group.position.x, item.mesh.position.y - player.group.position.y) <= PICKUP_RADIUS) {
        const kind = ['Green Tea', 'Chamomile', 'Matcha Burst'][Math.floor(Math.random() * 3)];
        removeDrop(i);
        brew(kind);
      } else if (item.age >= LEAF_LIFETIME_SECONDS) removeDrop(i);
    }
    for (let i = effects.length - 1; i >= 0; i--) {
      const item = effects[i];
      item.age += dt;
      const progress = Math.min(1, item.age / ATTACK_EFFECT_SECONDS);
      item.ring.scale.setScalar(progress);
      item.ring.material.opacity = 0.85 * (1 - progress);
      if (progress >= 1) {
        scene.remove(item.ring);
        item.ring.geometry.dispose();
        item.ring.material.dispose();
        effects.splice(i, 1);
      }
    }
    onChange();
  }

  function removeDrop(index) {
    const [item] = drops.splice(index, 1);
    scene.remove(item.mesh);
    item.mesh.traverse((part) => {
      if (part.isMesh) {
        part.geometry.dispose();
        part.material.dispose();
      }
    });
  }

  function contact(enemy) {
    if (invulnerableLeft > 0) return 'safe';
    if (shield) {
      shield = false;
      shieldRing.visible = false;
      invulnerableLeft = SHIELD_INVULNERABILITY_SECONDS;
      enemies.remove(enemy);
      onChange();
      return 'shielded';
    }
    return 'fatal';
  }

  function reset() {
    while (drops.length) removeDrop(drops.length - 1);
    for (const item of effects) {
      scene.remove(item.ring);
      item.ring.geometry.dispose();
      item.ring.material.dispose();
    }
    effects.length = 0;
    greenTeaLeft = 0;
    invulnerableLeft = 0;
    shield = false;
    shieldRing.visible = false;
    lastBrew = '';
    onChange();
  }

  return {
    drop, update, contact, reset, effect,
    get greenTeaLeft() { return greenTeaLeft; },
    get hasShield() { return shield; },
    get invulnerableLeft() { return invulnerableLeft; },
    get lastBrew() { return lastBrew; },
  };
}
