import * as THREE from 'three'
import type { Atlas } from './assets'
import { surfaceMaterial } from './assets'
import type { Disposal } from './disposal'
import { fadeAtRim } from './edgeFade'
import { lakeRadius, terrainHeight } from './ground'
import { distanceToPath } from './paths'

const CLEARINGS: Array<[number, number, number]> = [
  [-2.4, 13.2, 10.5],
  [4.8, 14.6, 4.2],
  [14.4, 9.1, 3.4],
  [-12.6, -13.4, 3.4],
  [11.2, -15.4, 3.6],
  [-3.2, 17.8, 5.8],
]

export function buildShore(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const geometry = disposal.geo(new THREE.PlaneGeometry(78, 78, 150, 150))
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    position.setY(i, terrainHeight(position.getX(i), position.getZ(i)))
  }
  geometry.computeVertexNormals()

  const material = surfaceMaterial(disposal, atlas.terrain, { roughness: 1, metalness: 0.02 })
  fadeAtRim(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  parent.add(mesh)
  addPines(parent, disposal, atlas)
  return mesh
}

function addPines(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const rand = mulberry32(27)
  const spots: Array<{ x: number; z: number; scale: number; yaw: number }> = []
  let guard = 0
  while (spots.length < 32 && guard < 5000) {
    guard += 1
    const x = (rand() * 2 - 1) * 30
    const z = (rand() * 2 - 1) * 30
    const radius = lakeRadius(x, z)
    if (radius < 1.08 || radius > 1.58) continue
    if (CLEARINGS.some(([cx, cz, reach]) => Math.hypot(x - cx, z - cz) < reach)) continue
    if (distanceToPath(x, z) < 1.5) continue
    if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < 1.65)) continue
    spots.push({ x, z, scale: 0.78 + rand() * 0.5, yaw: rand() * Math.PI * 2 })
  }
  if (spots.length < 20) {
    throw new Error(`Expected at least 20 shore pines, found ${spots.length}`)
  }

  const trunkGeo = disposal.geo(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6))
  trunkGeo.translate(0, 0.4, 0)
  const crownGeo = disposal.geo(new THREE.ConeGeometry(0.58, 1.65, 7))
  crownGeo.translate(0, 1.55, 0)
  const bark = surfaceMaterial(disposal, atlas.weathered)
  const needles = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.92 })
  const trunks = new THREE.InstancedMesh(trunkGeo, bark, spots.length)
  const crowns = new THREE.InstancedMesh(crownGeo, needles, spots.length)
  trunks.castShadow = true
  trunks.receiveShadow = true
  crowns.castShadow = true
  crowns.receiveShadow = true
  const dummy = new THREE.Object3D()
  spots.forEach((spot, index) => {
    dummy.position.set(spot.x, terrainHeight(spot.x, spot.z), spot.z)
    dummy.rotation.set(0, spot.yaw, 0)
    dummy.scale.set(spot.scale, spot.scale, spot.scale)
    dummy.updateMatrix()
    trunks.setMatrixAt(index, dummy.matrix)
    crowns.setMatrixAt(index, dummy.matrix)
  })
  parent.add(trunks, crowns)
}

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
