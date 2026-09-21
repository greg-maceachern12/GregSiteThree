import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { terrainHeight } from '../ground'
import { addMesh } from '../parts'

const SCENERY: Array<[number, number, 'slate' | 'wood']> = [
  [-3.6, 17.5, 'wood'],
  [-1.7, 18.5, 'slate'],
  [-4.8, 16.9, 'slate'],
  [-2.5, 19.3, 'wood'],
  [-5.4, 18.5, 'slate'],
]

export function buildStone(
  parent: THREE.Object3D,
  disposal: Disposal,
  atlas: Atlas,
  x: number,
  z: number,
  id: string,
) {
  const ground = terrainHeight(x, z)
  const mesh = marker(disposal, atlas, 'slate', yaw(id))
  mesh.position.set(x, ground, z)
  parent.add(mesh)
  return {
    label: new THREE.Vector3(x, ground + 1.2, z),
    focus: new THREE.Vector3(x, ground + 0.45, z),
  }
}

export function buildGraveyard(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const wood = surfaceMaterial(disposal, atlas.weathered)
  const gateX = -1.15
  const gateZ = 15.35
  const gateY = terrainHeight(gateX, gateZ)
  const post = disposal.geo(new THREE.BoxGeometry(0.12, 1.05, 0.12))
  addMesh(parent, post, wood, [gateX - 0.55, gateY + 0.52, gateZ])
  addMesh(parent, post, wood, [gateX + 0.55, gateY + 0.52, gateZ])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(1.35, 0.08, 0.1)), wood, [gateX, gateY + 1.02, gateZ])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(1.35, 0.06, 0.08)), wood, [gateX, gateY + 0.48, gateZ])

  for (const [x, z, kind] of SCENERY) {
    const mesh = marker(disposal, atlas, kind, ((x * 13.1 + z * 7.7) % 1) * 0.35 - 0.15)
    mesh.position.set(x, terrainHeight(x, z), z)
    parent.add(mesh)
  }
}

function marker(disposal: Disposal, atlas: Atlas, kind: 'slate' | 'wood', rotation: number) {
  const group = new THREE.Group()
  group.rotation.y = rotation
  if (kind === 'slate') {
    const geometry = disposal.geo(new THREE.BoxGeometry(0.46, 0.95, 0.14, 1, 4, 1))
    const position = geometry.attributes.position
    const colors = new Float32Array(position.count * 3)
    for (let i = 0; i < position.count; i++) {
      const height = position.getY(i)
      const moss = Math.min(1, Math.max(0, (height + 0.48) / 0.55))
      colors[i * 3] = 0.78 + moss * 0.22
      colors[i * 3 + 1] = 0.9 + moss * 0.1
      colors[i * 3 + 2] = 0.7 + moss * 0.3
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const material = surfaceMaterial(disposal, atlas.slate, {
      vertexColors: true,
      normalScale: new THREE.Vector2(0.8, 0.8),
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 0.5
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  } else {
    const mesh = new THREE.Mesh(
      disposal.geo(new THREE.BoxGeometry(0.16, 0.82, 0.42)),
      surfaceMaterial(disposal, atlas.weathered),
    )
    mesh.position.y = 0.42
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  return group
}

function yaw(id: string) {
  let hash = 2166136261
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (((hash >>> 0) % 1000) / 1000 - 0.5) * 0.45
}
