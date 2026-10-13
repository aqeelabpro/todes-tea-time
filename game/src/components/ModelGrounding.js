import * as THREE from 'three';

// Bounding after every transform also accounts for offsets baked into the GLB.
export function groundModel(model) {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  // Use the parent's ground plane so a model loading during a hop stays grounded afterward.
  const parentZ = model.parent?.getWorldPosition(new THREE.Vector3()).z ?? 0;
  model.position.z -= bounds.min.z - parentZ;
}
