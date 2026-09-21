import * as THREE from 'three'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y } from '../ground'

export function buildSeattle(parent: THREE.Object3D, disposal: Disposal, x: number, z: number) {
  const group = new THREE.Group()
  group.position.set(x, WATER_Y, z)
  parent.add(group)

  const hull = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(2.1, 0.7, 4.4)),
    standard(disposal, { color: '#3e3834', roughness: 0.72 }),
  )
  hull.position.y = 0.42
  hull.castShadow = true
  hull.receiveShadow = true
  group.add(hull)

  const cabin = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(1.5, 0.85, 1.8)),
    standard(disposal, { color: '#4a433e', roughness: 0.7 }),
  )
  cabin.position.set(0, 1.05, -0.3)
  cabin.castShadow = true
  group.add(cabin)

  return {
    label: new THREE.Vector3(x, WATER_Y + 2.2, z),
    focus: new THREE.Vector3(x, WATER_Y + 0.6, z),
    bob: group,
  }
}
