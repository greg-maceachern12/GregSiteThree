import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addGable, addMesh, addSash } from '../parts'

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
  const trim = standard(disposal, { color: '#f3e7d6', roughness: 0.58, metalness: 0.02 })
  const glass = standard(disposal, {
    color: '#7f9e9a',
    roughness: 0.05,
    metalness: 0,
    transparent: true,
    opacity: 0.55,
    envMapIntensity: 1.8,
    depthWrite: false,
  })
  glass.side = THREE.DoubleSide

  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.55, 0.12, 2.7)), wood, [0, 0.12, 0])
  const pane = disposal.geo(new THREE.PlaneGeometry(3.2, 1.55))
  addMesh(group, pane, glass, [0, 1.05, 1.2], { cast: false, receive: false })
  addMesh(group, pane, glass, [0, 1.05, -1.2], { cast: false, receive: false, rotation: [0, Math.PI, 0] })
  const sidePane = disposal.geo(new THREE.PlaneGeometry(2.2, 1.55))
  addMesh(group, sidePane, glass, [1.65, 1.05, 0], { cast: false, receive: false, rotation: [0, Math.PI / 2, 0] })
  addMesh(group, sidePane, glass, [-1.65, 1.05, 0], { cast: false, receive: false, rotation: [0, -Math.PI / 2, 0] })

  const post = disposal.geo(new THREE.BoxGeometry(0.1, 1.85, 0.1))
  for (const [px, pz] of [
    [-1.65, -1.2],
    [1.65, -1.2],
    [-1.65, 1.2],
    [1.65, 1.2],
  ] as const) {
    addMesh(group, post, wood, [px, 0.95, pz])
  }
  const mullion = disposal.geo(new THREE.BoxGeometry(0.045, 1.55, 0.045))
  for (const x of [-0.55, 0.55]) addMesh(group, mullion, trim, [x, 1.05, 1.24])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(3.2, 0.045, 0.045)), trim, [0, 1.05, 1.24])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.045, 1.55, 2.3)), trim, [0, 1.05, 0])
  addGable(group, disposal, roof, 3.9, 3.05, 1.9, trim, wood)

  const lampMaterial = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.35,
    roughness: 0.3,
  })
  addSash(group, disposal, trim, lampMaterial, [-1.05, 1.15, 1.28], '+z', 0.42, 0.52)
  const lamp = new THREE.PointLight('#ffb15e', 3.2, 5.5, 2)
  lamp.position.set(-0.5, 1.3, 0.4)
  group.add(lamp)

  return {
    label: new THREE.Vector3(x, ground + 3.2, z),
    focus: new THREE.Vector3(x, ground + 1, z),
  }
}
