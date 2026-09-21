import * as THREE from 'three'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'

export function buildRange(parent: THREE.Object3D, disposal: Disposal, x: number, z: number) {
  const ground = terrainHeight(x, z)
  const group = new THREE.Group()
  group.position.set(x, ground, z)
  parent.add(group)

  const cabin = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(3.6, 2.15, 2.8)),
    standard(disposal, { color: '#d5ddd8', roughness: 0.28, transparent: true, opacity: 0.82 }),
  )
  cabin.position.y = 1.08
  cabin.castShadow = true
  cabin.receiveShadow = true
  group.add(cabin)

  const lampMesh = new THREE.Mesh(
    disposal.geo(new THREE.PlaneGeometry(0.46, 0.55)),
    standard(disposal, {
      color: '#ffb15a',
      emissive: '#ff9a3c',
      emissiveIntensity: 1.1,
      roughness: 0.4,
    }),
  )
  lampMesh.position.set(-1.2, 1.15, 1.41)
  group.add(lampMesh)

  const lamp = new THREE.PointLight('#ffb15e', 3.5, 6, 2)
  lamp.position.set(-0.4, 1.3, 0.4)
  group.add(lamp)

  return {
    label: new THREE.Vector3(x, ground + 2.6, z),
    focus: new THREE.Vector3(x, ground + 1, z),
  }
}
