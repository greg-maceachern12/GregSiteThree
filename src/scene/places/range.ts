import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addChimney, addDoor, addEaves, addGable, addLogWalls, addMesh, addPlanter, addSash } from '../parts'

export function buildRange(
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
  const trim = standard(disposal, { color: '#f3e7d6', roughness: 0.6, metalness: 0.02 })
  const chink = standard(disposal, { color: '#e7d7c2', roughness: 0.9, metalness: 0.02 })
  const doorPanel = standard(disposal, { color: '#6d4a34', roughness: 0.74, metalness: 0.03 })
  const glass = standard(disposal, {
    color: '#8eaba6',
    roughness: 0.06,
    metalness: 0,
    envMapIntensity: 1.7,
  })
  const warm = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.35,
    roughness: 0.3,
  })
  const metal = standard(disposal, { color: '#6e675f', roughness: 0.45, metalness: 0.35 })
  const leaf = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.8 })

  const width = 3.35
  const depth = 2.5
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + 0.5, 0.2, depth + 0.35)), stone, [0, 0.12, 0])
  const top = addLogWalls(group, disposal, logs, chink, width, depth, 0.26, 8)
  addGable(group, disposal, roof, width + 0.55, depth + 0.45, top, trim, logs)
  addEaves(group, disposal, metal, width + 0.55, depth + 0.45, top, [1.55, depth / 2 + 0.18])
  addChimney(group, disposal, stone, trim, 1.2, -0.4, 0.28, top + 0.75)

  const face = depth / 2 + 0.14
  addDoor(group, disposal, trim, doorPanel, [-0.7, 0.78, face], '+z', 0.5, 1.05)
  addSash(group, disposal, trim, warm, [0.55, 1.2, face], '+z', 0.48, 0.55)
  const shutter = disposal.geo(new THREE.BoxGeometry(0.14, 0.52, 0.04))
  addMesh(group, shutter, wood, [0.18, 1.2, face], { rotation: [0, 0.16, 0] })
  addMesh(group, shutter, wood, [0.92, 1.2, face], { rotation: [0, -0.16, 0] })
  addSash(group, disposal, trim, glass, [0.2, 1.22, -face], '-z', 0.42, 0.48)

  addMesh(group, disposal.geo(new THREE.BoxGeometry(2.4, 0.08, 0.85)), wood, [0, 0.16, face + 0.32])
  const post = disposal.geo(new THREE.CylinderGeometry(0.055, 0.065, 1.2, 6))
  addMesh(group, post, logs, [-1.05, 0.72, face + 0.62])
  addMesh(group, post, logs, [1.05, 0.72, face + 0.62])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(2.35, 0.06, 0.7)), roof, [0, 1.38, face + 0.4])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(2.2, 0.04, 0.04)), trim, [0, 0.95, face + 0.66])
  addPlanter(group, disposal, wood, leaf, [1.7, 0, face + 0.15])

  const lamp = new THREE.PointLight('#ffb15e', 2.4, 5.2, 2)
  lamp.position.set(0.3, 1.35, 0.4)
  group.add(lamp)

  return {
    label: new THREE.Vector3(x, ground + 3.65, z),
    focus: new THREE.Vector3(x, ground + 1, z),
  }
}
