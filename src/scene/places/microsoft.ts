import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addCornerBoards, addEaves, addGable, addMesh, addPlanter, addSconce } from '../parts'

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
  const trim = standard(disposal, { color: '#f4efe6', roughness: 0.55, metalness: 0.02 })
  const wood = surfaceMaterial(disposal, atlas.weathered)
  const metal = standard(disposal, { color: '#6e675f', roughness: 0.42, metalness: 0.4 })
  const glow = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.2,
    roughness: 0.3,
  })
  const leaf = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.8 })

  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.9, 0.16, 3.0)), wood, [0, 0.1, 0])
  addMesh(group, disposal.geo(new RoundedBoxGeometry(3.7, 2.15, 2.8, 2, 0.07)), siding, [0, 1.2, 0])
  addCornerBoards(group, disposal, trim, 3.72, 2.82, 0.2, 2.22)
  addGable(group, disposal, roof, 4.15, 3.25, 2.22, trim, siding)
  addEaves(group, disposal, metal, 4.15, 3.25, 2.22, [-1.85, -1.69])
  addSconce(group, disposal, metal, glow, [1.92, 1.45, 0.15], '+x')
  addPlanter(group, disposal, wood, leaf, [1.5, 0, 1.88])

  const frame = disposal.geo(new THREE.BoxGeometry(1.12, 0.07, 0.07))
  const stile = disposal.geo(new THREE.BoxGeometry(0.07, 1.05, 0.07))
  addMesh(group, frame, trim, [0, 1.68, 1.46])
  addMesh(group, frame, trim, [0, 0.64, 1.46])
  addMesh(group, stile, trim, [-0.52, 1.16, 1.46])
  addMesh(group, stile, trim, [0.52, 1.16, 1.46])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.06, 0.98, 0.05)), trim, [0, 1.16, 1.48])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.98, 0.06, 0.05)), trim, [0, 1.16, 1.48])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.2, 0.06, 0.14)), trim, [0, 0.56, 1.5])

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
      1.44,
    ], { cast: false, receive: false })
  })

  return {
    label: new THREE.Vector3(x, ground + 3.55, z),
    focus: new THREE.Vector3(x, ground + 1.1, z),
  }
}
