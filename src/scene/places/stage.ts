import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addMesh } from '../parts'

export function buildStage(
  parent: THREE.Object3D,
  disposal: Disposal,
  atlas: Atlas,
  x: number,
  z: number,
) {
  const ground = terrainHeight(x, z)
  const group = new THREE.Group()
  group.position.set(x, ground, z)
  parent.add(group)

  const wood = surfaceMaterial(disposal, atlas.weathered)
  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.6, 0.28, 2.3)), wood, [0, 0.2, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.48, 0.42, 0.48)), wood, [1.35, 0.5, 0.85])

  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.06, 0.07, 1.35, 6)), wood, [-1.35, 0.95, -0.15])
  const posterA = standard(disposal, { color: '#b85a48', roughness: 0.84, metalness: 0.02 })
  const posterB = standard(disposal, { color: '#d9c7a2', roughness: 0.84, metalness: 0.02 })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.42, 0.58)), posterA, [-1.35, 1.15, 0.08], {
    cast: false,
  })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.38, 0.5)), posterB, [-1.02, 1.05, 0.08], {
    cast: false,
    rotation: [0, 0.08, 0],
  })

  return {
    label: new THREE.Vector3(x, ground + 1.7, z),
    focus: new THREE.Vector3(x, ground + 0.4, z),
  }
}
