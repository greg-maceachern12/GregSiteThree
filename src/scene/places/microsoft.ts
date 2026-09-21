import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addGable, addMesh } from '../parts'

const PANES = ['#4aa3e0', '#7dbb42', '#f0c43a', '#e15b4a']

export function buildMicrosoft(
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

  const siding = surfaceMaterial(disposal, atlas.siding, { normalScale: new THREE.Vector2(0.55, 0.55) })
  const roof = surfaceMaterial(disposal, atlas.roof)
  addMesh(group, disposal.geo(new RoundedBoxGeometry(3.7, 2.15, 2.8, 2, 0.07)), siding, [0, 1.2, 0])
  addGable(group, disposal, roof, 4, 3.1, 2.2)

  PANES.forEach((color, index) => {
    const pane = standard(disposal, {
      color,
      emissive: color,
      emissiveIntensity: 0.28,
      roughness: 0.32,
      metalness: 0.02,
    })
    const column = index % 2
    const row = Math.floor(index / 2)
    addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.4, 0.4)), pane, [
      -0.24 + column * 0.48,
      1.42 - row * 0.48,
      1.42,
    ], { cast: false, receive: false })
  })

  return {
    label: new THREE.Vector3(x, ground + 2.9, z),
    focus: new THREE.Vector3(x, ground + 1.1, z),
  }
}
