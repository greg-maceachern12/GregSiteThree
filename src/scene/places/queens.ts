import * as THREE from 'three'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'

export function buildQueens(parent: THREE.Object3D, disposal: Disposal, x: number, z: number) {
  const ground = terrainHeight(x, z)
  const group = new THREE.Group()
  group.position.set(x, ground, z)
  parent.add(group)

  const house = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(3.2, 2.2, 2.4)),
    standard(disposal, { color: '#d9d4c6', roughness: 0.88 }),
  )
  house.position.y = 1.1
  house.castShadow = true
  house.receiveShadow = true
  group.add(house)

  const dock = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(0.9, 0.1, 2.4)),
    standard(disposal, { color: '#b7b1a4', roughness: 0.84 }),
  )
  dock.position.set(0, WATER_Y - ground + 0.06, 2.2)
  dock.castShadow = true
  dock.receiveShadow = true
  group.add(dock)

  return {
    label: new THREE.Vector3(x, ground + 2.6, z),
    focus: new THREE.Vector3(x, ground + 1, z),
  }
}
