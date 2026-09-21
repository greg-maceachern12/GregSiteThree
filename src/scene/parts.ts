import * as THREE from 'three'
import type { Disposal } from './disposal'

export function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  options?: { cast?: boolean; receive?: boolean; rotation?: [number, number, number] },
) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  if (options?.rotation) mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2])
  mesh.castShadow = options?.cast ?? true
  mesh.receiveShadow = options?.receive ?? true
  parent.add(mesh)
  return mesh
}

export function addGable(
  parent: THREE.Object3D,
  disposal: Disposal,
  material: THREE.Material,
  width: number,
  depth: number,
  baseY: number,
) {
  const slopeDepth = depth * 0.62
  const geometry = disposal.geo(new THREE.BoxGeometry(width, 0.1, slopeDepth))
  addMesh(parent, geometry, material, [0, baseY + depth * 0.1, -slopeDepth * 0.38], {
    rotation: [0.4, 0, 0],
  })
  addMesh(parent, geometry, material, [0, baseY + depth * 0.1, slopeDepth * 0.38], {
    rotation: [-0.4, 0, 0],
  })
}
