import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addGable, addMesh } from '../parts'

export function buildRange(
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

  const wood = surfaceMaterial(disposal, atlas.siding, { normalScale: new THREE.Vector2(0.4, 0.4) })
  const roof = surfaceMaterial(disposal, atlas.roof)
  const glass = standard(disposal, {
    color: '#d7e4e1',
    roughness: 0.05,
    metalness: 0.02,
    transparent: true,
    opacity: 0.32,
    envMapIntensity: 1.35,
    depthWrite: false,
  })
  glass.side = THREE.DoubleSide

  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.4, 1.7, 2.5)), glass, [0, 1.05, 0], {
    cast: false,
    receive: false,
  })
  const post = disposal.geo(new THREE.BoxGeometry(0.12, 1.85, 0.12))
  for (const [px, pz] of [
    [-1.65, -1.2],
    [1.65, -1.2],
    [-1.65, 1.2],
    [1.65, 1.2],
  ] as const) {
    addMesh(group, post, wood, [px, 0.95, pz])
  }
  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.5, 0.1, 2.6)), wood, [0, 0.16, 0])
  addGable(group, disposal, roof, 3.7, 2.8, 1.85)

  const lampMaterial = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.35,
    roughness: 0.3,
  })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.36, 0.46)), lampMaterial, [-1.2, 1.15, 1.26], {
    cast: false,
    receive: false,
  })
  const lamp = new THREE.PointLight('#ffb15e', 3.2, 5.5, 2)
  lamp.position.set(-0.5, 1.3, 0.4)
  group.add(lamp)

  return {
    label: new THREE.Vector3(x, ground + 2.7, z),
    focus: new THREE.Vector3(x, ground + 1, z),
  }
}
