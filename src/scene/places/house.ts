import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'
import { addGable, addMesh } from '../parts'

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

  addMesh(
    group,
    disposal.geo(new RoundedBoxGeometry(6.3, 2.45, 4.15, 2, 0.08)),
    siding,
    [0, 1.42, 0],
  )
  addGable(group, disposal, roof, 6.7, 4.5, 2.55)

  const chimney = addMesh(
    group,
    disposal.geo(new RoundedBoxGeometry(0.7, 1.7, 0.7, 2, 0.04)),
    stone,
    [2.15, 3.15, -0.4],
  )
  chimney.castShadow = true
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.86, 0.12, 0.86)), stone, [2.15, 4.02, -0.4], {
    cast: true,
  })

  addMesh(group, disposal.geo(new THREE.BoxGeometry(4.4, 0.12, 1.7)), weathered, [0, 0.42, -2.85])
  const post = disposal.geo(new THREE.CylinderGeometry(0.07, 0.08, 1.7, 6))
  for (const [px, pz] of [
    [-1.9, -3.5],
    [1.9, -3.5],
    [-1.9, -2.15],
    [1.9, -2.15],
  ] as const) {
    addMesh(group, post, weathered, [px, 1.25, pz])
  }
  addMesh(group, disposal.geo(new THREE.BoxGeometry(4.6, 0.08, 1.9)), roof, [0, 2.15, -2.9])

  const windowMaterial = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.6,
    roughness: 0.28,
    metalness: 0.02,
  })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.72, 0.92)), windowMaterial, [1.05, 1.65, 2.09], {
    cast: false,
    receive: false,
  })

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
    label: new THREE.Vector3(x, ground + 4.3, z),
    focus: new THREE.Vector3(x, ground + 1.2, z),
  }
}
