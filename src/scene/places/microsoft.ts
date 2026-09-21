import * as THREE from 'three'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'

const PANES = ['#4aa3e0', '#7dbb42', '#f0c43a', '#e15b4a']

export function buildMicrosoft(parent: THREE.Object3D, disposal: Disposal, x: number, z: number) {
  const ground = terrainHeight(x, z)
  const group = new THREE.Group()
  group.position.set(x, ground, z)
  parent.add(group)

  const cabin = new THREE.Mesh(
    disposal.geo(new THREE.BoxGeometry(3.8, 2.3, 2.9)),
    standard(disposal, { color: '#9a7b5c', roughness: 0.8 }),
  )
  cabin.position.y = 1.15
  cabin.castShadow = true
  cabin.receiveShadow = true
  group.add(cabin)

  PANES.forEach((color, index) => {
    const pane = new THREE.Mesh(
      disposal.geo(new THREE.PlaneGeometry(0.38, 0.38)),
      standard(disposal, { color, roughness: 0.35, emissive: color, emissiveIntensity: 0.25 }),
    )
    const col = index % 2
    const row = Math.floor(index / 2)
    pane.position.set(-0.24 + col * 0.46, 1.35 - row * 0.46, 1.46)
    group.add(pane)
  })

  return {
    label: new THREE.Vector3(x, ground + 2.7, z),
    focus: new THREE.Vector3(x, ground + 1, z),
  }
}
