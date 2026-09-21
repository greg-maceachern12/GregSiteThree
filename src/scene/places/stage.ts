import * as THREE from 'three'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'

export function buildStage(parent: THREE.Object3D, disposal: Disposal, x: number, z: number) {
  const ground = terrainHeight(x, z)
  const mesh = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(3.4, 0.42, 2.2)),
    standard(disposal, { color: '#b08960', roughness: 0.8 }),
  )
  mesh.position.set(x, ground + 0.21, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return {
    label: new THREE.Vector3(x, ground + 1.3, z),
    focus: new THREE.Vector3(x, ground + 0.4, z),
  }
}
