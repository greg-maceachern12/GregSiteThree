import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'
import { addChimney, addDoor, addEaves, addFlowerBox, addGable, addLogWalls, addMesh, addPlanter, addSash } from '../parts'

export function buildQueens(
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

  const logs = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.88 })
  const wood = surfaceMaterial(disposal, atlas.weathered)
  const roof = surfaceMaterial(disposal, atlas.roof, { roughness: 0.94 })
  const stone = surfaceMaterial(disposal, atlas.limestone)
  const trim = standard(disposal, { color: '#efe4d2', roughness: 0.62, metalness: 0.02 })
  const chink = standard(disposal, { color: '#e7d7c2', roughness: 0.9, metalness: 0.02 })
  const doorPanel = standard(disposal, { color: '#5c3d2e', roughness: 0.74, metalness: 0.03 })
  const glass = standard(disposal, {
    color: '#8eaba6',
    roughness: 0.06,
    metalness: 0,
    envMapIntensity: 1.7,
  })
  const metal = standard(disposal, { color: '#6e675f', roughness: 0.45, metalness: 0.35 })
  const leaf = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.8 })

  const width = 3.15
  const depth = 2.4
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + 0.45, 0.22, depth + 0.4)), stone, [0, 0.12, 0])
  const top = addLogWalls(group, disposal, logs, chink, width, depth, 0.28, 8)
  addGable(group, disposal, roof, width + 0.55, depth + 0.45, top, trim, logs)
  addEaves(group, disposal, metal, width + 0.55, depth + 0.45, top, [1.45, depth / 2 + 0.2])
  addChimney(group, disposal, stone, trim, -1.15, -0.45, 0.3, top + 0.85)

  const face = depth / 2 + 0.14
  addDoor(group, disposal, trim, doorPanel, [0.72, 0.78, face], '+z', 0.52, 1.05)
  addSash(group, disposal, trim, glass, [-0.78, 1.22, face], '+z', 0.46, 0.52)
  addFlowerBox(group, disposal, wood, leaf, [-0.78, 0.84, face], '+z', 0.62)
  const shutter = disposal.geo(new THREE.BoxGeometry(0.16, 0.5, 0.04))
  addMesh(group, shutter, wood, [-1.12, 1.22, face], { rotation: [0, 0.18, 0] })
  addMesh(group, shutter, wood, [-0.44, 1.22, face], { rotation: [0, -0.18, 0] })
  addSash(group, disposal, trim, glass, [0.15, 1.28, -face], '-z', 0.4, 0.46)

  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.35, 0.08, 0.7)), wood, [0.55, 0.16, face + 0.28])
  const post = disposal.geo(new THREE.CylinderGeometry(0.05, 0.06, 1.15, 6))
  addMesh(group, post, logs, [0.05, 0.7, face + 0.5])
  addMesh(group, post, logs, [1.05, 0.7, face + 0.5])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.25, 0.06, 0.55)), roof, [0.55, 1.32, face + 0.32])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.15, 0.1, 0.36)), stone, [0.7, 0.08, face + 0.55])
  addPlanter(group, disposal, stone, leaf, [-1.4, 0, face + 0.15])

  const dockY = WATER_Y - ground + 0.06
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.95, 0.08, 2.3)), wood, [0, dockY, 2.35])
  const piling = disposal.geo(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 5))
  addMesh(group, piling, wood, [-0.35, dockY - 0.32, 3.2])
  addMesh(group, piling, wood, [0.35, dockY - 0.32, 3.2])

  return {
    label: new THREE.Vector3(x, ground + 3.7, z),
    focus: new THREE.Vector3(x, ground + 1, z),
  }
}
