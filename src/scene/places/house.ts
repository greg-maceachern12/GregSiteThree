import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'
import { addCornerBoards, addDoor, addGable, addMesh, addSash } from '../parts'

export function buildHouse(
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

  const siding = surfaceMaterial(disposal, atlas.siding, { normalScale: new THREE.Vector2(0.65, 0.65) })
  const weathered = surfaceMaterial(disposal, atlas.weathered)
  const roof = surfaceMaterial(disposal, atlas.roof, { roughness: 0.92 })
  const stone = surfaceMaterial(disposal, atlas.limestone)
  const trim = standard(disposal, { color: '#f3e7d6', roughness: 0.62, metalness: 0.02 })
  const glass = standard(disposal, {
    color: '#d5e4e0',
    roughness: 0.16,
    metalness: 0.04,
    envMapIntensity: 1.15,
  })
  const warm = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.6,
    roughness: 0.28,
    metalness: 0.02,
  })
  const doorPanel = standard(disposal, { color: '#6d4a34', roughness: 0.72, metalness: 0.03 })

  addMesh(group, disposal.geo(new THREE.BoxGeometry(6.55, 0.22, 4.4)), stone, [0, 0.14, 0])
  addMesh(
    group,
    disposal.geo(new RoundedBoxGeometry(6.3, 2.45, 4.15, 2, 0.08)),
    siding,
    [0, 1.42, 0],
  )
  addCornerBoards(group, disposal, trim, 6.32, 4.18, 0.28, 2.58)
  addGable(group, disposal, roof, 6.85, 4.7, 2.58, trim, siding)

  const chimney = addMesh(
    group,
    disposal.geo(new RoundedBoxGeometry(0.62, 1.85, 0.62, 2, 0.04)),
    stone,
    [2.05, 3.35, -0.35],
  )
  chimney.castShadow = true
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.78, 0.1, 0.78)), stone, [2.05, 4.28, -0.35])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.5, 0.16, 0.5)), trim, [2.05, 4.4, -0.35])

  addMesh(group, disposal.geo(new THREE.BoxGeometry(4.4, 0.12, 1.7)), weathered, [0, 0.42, -2.85])
  const post = disposal.geo(new THREE.CylinderGeometry(0.07, 0.08, 1.7, 8))
  for (const [px, pz] of [
    [-1.9, -3.5],
    [1.9, -3.5],
    [-1.9, -2.15],
    [1.9, -2.15],
  ] as const) {
    addMesh(group, post, weathered, [px, 1.25, pz])
  }
  const rail = disposal.geo(new THREE.BoxGeometry(3.7, 0.05, 0.05))
  addMesh(group, rail, trim, [0, 1.55, -3.5])
  addMesh(group, rail, trim, [0, 1.15, -3.5])
  const sideRail = disposal.geo(new THREE.BoxGeometry(0.05, 0.05, 1.25))
  for (const px of [-1.9, 1.9]) {
    addMesh(group, sideRail, trim, [px, 1.55, -2.82])
    addMesh(group, sideRail, trim, [px, 1.15, -2.82])
  }
  addMesh(group, disposal.geo(new THREE.BoxGeometry(4.7, 0.07, 1.95)), roof, [0, 2.18, -2.9])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(4.75, 0.08, 0.06)), trim, [0, 2.12, -3.84])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.7, 0.08, 0.42)), weathered, [0, 0.22, -3.85])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.78, 0.08, 0.36)), weathered, [0, 0.14, -4.15])

  addSash(group, disposal, trim, warm, [0.95, 1.62, 2.1], '+z', 0.7, 0.92)
  addSash(group, disposal, trim, glass, [-0.95, 1.62, 2.1], '+z')
  addSash(group, disposal, trim, glass, [0, 1.55, -2.1], '-z', 0.52, 0.7)
  addDoor(group, disposal, trim, doorPanel, [-1.15, 0.78, -2.1], '-z', 0.58, 1.12)
  addSash(group, disposal, trim, glass, [3.18, 1.55, 0.35], '+x', 0.5, 0.68)
  addSash(group, disposal, trim, glass, [-3.18, 1.55, -0.2], '-x', 0.5, 0.68)

  const lamp = new THREE.PointLight('#ffb15e', 2.2, 5.5, 2)
  lamp.position.set(0.6, 1.8, 1.2)
  group.add(lamp)

  const dockY = WATER_Y - ground + 0.08
  const dockLength = 6.2
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.45, 0.1, dockLength)), weathered, [
    0.15,
    dockY,
    -2.15 - dockLength / 2,
  ])
  const piling = disposal.geo(new THREE.CylinderGeometry(0.06, 0.07, 0.85, 6))
  for (const step of [0.2, 0.55, 0.9]) {
    const pz = -2.15 - dockLength * step
    addMesh(group, piling, weathered, [-0.5, dockY - 0.4, pz])
    addMesh(group, piling, weathered, [0.8, dockY - 0.4, pz])
  }

  return {
    label: new THREE.Vector3(x, ground + 5.05, z),
    focus: new THREE.Vector3(x, ground + 1.2, z),
  }
}
