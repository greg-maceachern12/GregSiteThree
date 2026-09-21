import * as THREE from 'three'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'

export function buildHouse(parent: THREE.Object3D, disposal: Disposal, x: number, z: number) {
  const ground = terrainHeight(x, z)
  const group = new THREE.Group()
  group.position.set(x, ground, z)
  parent.add(group)

  const body = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(6.4, 3.3, 4.6)),
    standard(disposal, { color: '#a68462', roughness: 0.78 }),
  )
  body.position.y = 1.65
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  const windowMaterial = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.4,
    roughness: 0.35,
  })
  const windowMesh = new THREE.Mesh(disposal.geo(new THREE.PlaneGeometry(0.7, 0.9)), windowMaterial)
  windowMesh.position.set(0.9, 1.7, 2.31)
  group.add(windowMesh)

  const lamp = new THREE.PointLight('#ffb15e', 8, 9, 2)
  lamp.position.set(0.9, 1.8, 1.6)
  group.add(lamp)

  const dockLength = 6.4
  const dock = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(1.35, 0.12, dockLength)),
    standard(disposal, { color: '#8d6844', roughness: 0.84 }),
  )
  dock.position.set(0.2, WATER_Y - ground + 0.08, -2.3 - dockLength / 2)
  dock.castShadow = true
  dock.receiveShadow = true
  group.add(dock)

  const label = new THREE.Vector3(x, ground + 3.7, z)
  const focus = new THREE.Vector3(x, ground + 1.2, z)
  return { label, focus }
}
