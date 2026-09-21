import * as THREE from 'three'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'

export function buildStone(parent: THREE.Object3D, disposal: Disposal, x: number, z: number) {
  const ground = terrainHeight(x, z)
  const mesh = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(0.46, 0.95, 0.16)),
    standard(disposal, { color: '#5e675f', roughness: 0.9 }),
  )
  mesh.position.set(x, ground + 0.48, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return {
    label: new THREE.Vector3(x, ground + 1.25, z),
    focus: new THREE.Vector3(x, ground + 0.5, z),
  }
}

/** Unnamed yard masses so the rise reads in the greybox. Not biography. */
export function buildYardBoxes(parent: THREE.Object3D, disposal: Disposal) {
  const spots: Array<[number, number]> = [
    [-4.2, 17.4],
    [-2.4, 18.3],
  ]
  for (const [x, z] of spots) {
    const ground = terrainHeight(x, z)
    const mesh = new THREE.Mesh(
      disposal.geo(new THREE.BoxGeometry(0.4, 0.8, 0.14)),
      standard(disposal, { color: '#6a6358', roughness: 0.9 }),
    )
    mesh.position.set(x, ground + 0.4, z)
    mesh.castShadow = true
    parent.add(mesh)
  }
}
