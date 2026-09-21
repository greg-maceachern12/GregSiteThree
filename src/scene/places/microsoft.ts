import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addChimney, addEaves, addGable, addLogWalls, addMesh, addPlanter, addSash } from '../parts'

const PANES = ['#4aa3e0', '#7dbb42', '#f0c43a', '#e15b4a']

export function buildMicrosoft(
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

  const logs = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.86 })
  const wood = surfaceMaterial(disposal, atlas.weathered)
  const roof = surfaceMaterial(disposal, atlas.roof, { roughness: 0.94 })
  const stone = surfaceMaterial(disposal, atlas.limestone)
  const trim = standard(disposal, { color: '#f3eadc', roughness: 0.6, metalness: 0.02 })
  const chink = standard(disposal, { color: '#e7d7c2', roughness: 0.9, metalness: 0.02 })
  const glass = standard(disposal, {
    color: '#8eaba6',
    roughness: 0.06,
    metalness: 0,
    envMapIntensity: 1.7,
  })
  const metal = standard(disposal, { color: '#6e675f', roughness: 0.45, metalness: 0.35 })
  const leaf = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.8 })

  const width = 3.55
  const depth = 2.65
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + 0.5, 0.2, depth + 0.4)), stone, [0, 0.12, 0])
  const top = addLogWalls(group, disposal, logs, chink, width, depth, 0.26, 9)
  addGable(group, disposal, roof, width + 0.6, depth + 0.5, top, trim, logs)
  addEaves(group, disposal, metal, width + 0.6, depth + 0.5, top, [-1.7, -depth / 2 - 0.18])
  addChimney(group, disposal, stone, trim, -1.35, -0.55, 0.28, top + 0.7)

  const face = depth / 2 + 0.16
  const frame = disposal.geo(new THREE.BoxGeometry(1.12, 0.07, 0.07))
  const stile = disposal.geo(new THREE.BoxGeometry(0.07, 1.05, 0.07))
  addMesh(group, frame, trim, [0.15, 1.62, face])
  addMesh(group, frame, trim, [0.15, 0.58, face])
  addMesh(group, stile, trim, [-0.37, 1.1, face])
  addMesh(group, stile, trim, [0.67, 1.1, face])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.06, 0.98, 0.05)), trim, [0.15, 1.1, face + 0.02])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.98, 0.06, 0.05)), trim, [0.15, 1.1, face + 0.02])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.22, 0.07, 0.12)), wood, [0.15, 0.48, face + 0.04])

  PANES.forEach((color, index) => {
    const pane = standard(disposal, {
      color,
      emissive: color,
      emissiveIntensity: 0.28,
      roughness: 0.32,
      metalness: 0.02,
    })
    const column = index % 2
    const row = Math.floor(index / 2)
    addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.4, 0.4)), pane, [
      -0.09 + column * 0.48,
      1.36 - row * 0.48,
      face - 0.01,
    ], { cast: false, receive: false })
  })

  addSash(group, disposal, trim, glass, [-1.15, 1.25, -face], '-z', 0.42, 0.48)
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.2, 0.1, 0.42)), stone, [0.15, 0.08, face + 0.28])
  addPlanter(group, disposal, wood, leaf, [1.55, 0, face + 0.2])

  return {
    label: new THREE.Vector3(x, ground + 3.9, z),
    focus: new THREE.Vector3(x, ground + 1.1, z),
  }
}
