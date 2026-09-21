import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'
import { addGable, addMesh } from '../parts'

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

  const stone = surfaceMaterial(disposal, atlas.limestone)
  const roof = surfaceMaterial(disposal, atlas.roof)
  const wood = surfaceMaterial(disposal, atlas.weathered)
  const opening = standard(disposal, { color: '#24302f', roughness: 0.9, metalness: 0.02 })

  addMesh(group, disposal.geo(new RoundedBoxGeometry(3.3, 2.05, 2.5, 2, 0.06)), stone, [0, 1.12, 0])
  addGable(group, disposal, roof, 3.6, 2.8, 2.05)
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.15, 1.35, 0.08)), opening, [0, 0.78, 1.28], {
    cast: false,
  })

  const dockY = WATER_Y - ground + 0.06
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.95, 0.08, 2.3)), wood, [0, dockY, 2.35])
  const piling = disposal.geo(new THREE.CylinderGeometry(0.05, 0.06, 0.7, 5))
  addMesh(group, piling, wood, [-0.35, dockY - 0.32, 3.2])
  addMesh(group, piling, wood, [0.35, dockY - 0.32, 3.2])

  return {
    label: new THREE.Vector3(x, ground + 2.7, z),
    focus: new THREE.Vector3(x, ground + 1, z),
  }
}
