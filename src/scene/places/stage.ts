import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addMesh, addRailing, addStep } from '../parts'

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
  group.rotation.y = 0.35
  parent.add(group)

  const wood = surfaceMaterial(disposal, atlas.weathered)
  const dark = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.82 })
  const metal = standard(disposal, { color: '#4a4540', roughness: 0.42, metalness: 0.5 })
  const bulb = standard(disposal, {
    color: '#ffe8c8',
    emissive: '#ffb15a',
    emissiveIntensity: 1.25,
    roughness: 0.35,
  })

  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.8, 0.32, 2.45)), wood, [0, 0.22, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.5, 0.12, 0.18)), wood, [0, 0.42, -1.05])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.5, 1.05, 0.08)), dark, [0, 0.92, -1.12], { cast: false })

  addStep(group, disposal, wood, [-0.55, 0.1, 1.35], 1.1, 0.32, 0.1)
  addStep(group, disposal, wood, [-0.55, 0.2, 1.12], 1.1, 0.32, 0.1)
  addStep(group, disposal, wood, [-0.55, 0.3, 0.88], 1.1, 0.32, 0.1)

  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.48, 0.42, 0.48)), wood, [1.35, 0.52, 0.85])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.42, 0.38, 0.42)), wood, [-1.25, 0.5, 0.72])

  const post = disposal.geo(new THREE.CylinderGeometry(0.05, 0.06, 1.45, 6))
  addMesh(group, post, metal, [-1.35, 1.02, -0.15])
  addMesh(group, disposal.geo(new THREE.SphereGeometry(0.07, 6, 5)), metal, [-1.35, 1.72, -0.15])
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.018, 0.02, 0.38, 5)), metal, [-1.35, 1.52, -0.15])

  const posterA = standard(disposal, { color: '#b85a48', roughness: 0.84, metalness: 0.02 })
  const posterB = standard(disposal, { color: '#d9c7a2', roughness: 0.84, metalness: 0.02 })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.42, 0.58)), posterA, [-1.35, 1.15, 0.08], {
    cast: false,
  })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.38, 0.5)), posterB, [-1.02, 1.05, 0.08], {
    cast: false,
    rotation: [0, 0.08, 0],
  })

  const truss = disposal.geo(new THREE.BoxGeometry(0.05, 0.05, 2.2))
  addMesh(group, truss, metal, [-0.9, 1.85, 0.15], { rotation: [0.12, 0, 0] })
  addMesh(group, truss, metal, [0.9, 1.85, 0.15], { rotation: [-0.12, 0, 0] })
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    addMesh(group, disposal.geo(new THREE.SphereGeometry(0.055, 6, 5)), bulb, [
      -0.85 + t * 1.7,
      1.78 - Math.abs(t - 0.5) * 0.12,
      0.18,
    ], { cast: false })
  }

  addRailing(group, disposal, metal, [-1.55, 0.38, 1.05], [1.55, 0.38, 1.05], 0.48)

  return {
    label: new THREE.Vector3(x, ground + 2.1, z),
    focus: new THREE.Vector3(x, ground + 0.45, z),
  }
}
