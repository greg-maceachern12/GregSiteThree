import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addMesh } from '../parts'

export function buildVillageGreen(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const gravel = surfaceMaterial(disposal, atlas.gravel, { color: '#c4b39a', roughness: 0.94 })
  const iron = standard(disposal, { color: '#5c564e', roughness: 0.48, metalness: 0.35 })
  const warm = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.4,
    roughness: 0.35,
  })
  const stone = disposal.geo(new THREE.BoxGeometry(0.42, 0.05, 0.3))
  for (const [x, z] of [
    [8.55, 10.85],
    [9.15, 10.55],
    [9.7, 11.05],
    [8.35, 11.35],
    [9.85, 11.7],
  ] as const) {
    addMesh(parent, stone, gravel, [x, terrainHeight(x, z) + 0.04, z], { cast: false })
  }

  const x = 8.85
  const z = 10.35
  const y = terrainHeight(x, z)
  addMesh(parent, disposal.geo(new THREE.CylinderGeometry(0.04, 0.05, 0.95, 6)), iron, [x, y + 0.48, z])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.18, 0.2, 0.18)), warm, [x, y + 1.02, z], { cast: false })
  addMesh(parent, disposal.geo(new THREE.ConeGeometry(0.12, 0.12, 5)), iron, [x, y + 1.16, z])
}

export function buildCottage(
  parent: THREE.Object3D,
  disposal: Disposal,
  atlas: Atlas,
  x: number,
  z: number,
  icon?: THREE.Texture,
) {
  const ground = terrainHeight(x, z)
  const group = new THREE.Group()
  group.position.set(x, ground, z)
  group.rotation.y = ((x * 1.7 + z) % 1) * 0.12 - 0.04
  parent.add(group)

  const logs = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.84 })
  const roof = surfaceMaterial(disposal, atlas.roof, { roughness: 0.92 })
  const stone = surfaceMaterial(disposal, atlas.limestone, { roughness: 0.9 })
  const trim = standard(disposal, { color: '#f3e7d6', roughness: 0.62, metalness: 0.02 })
  const door = standard(disposal, { color: '#6d4a34', roughness: 0.74, metalness: 0.03 })
  const warm = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.2,
    roughness: 0.32,
  })

  const width = 0.92
  const depth = 0.72
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + 0.16, 0.08, depth + 0.12)), stone, [0, 0.05, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width, 0.58, depth)), logs, [0, 0.38, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.28, 0.36, 0.04)), door, [ -0.16, 0.26, depth / 2 + 0.02])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.22, 0.18, 0.03)), warm, [0.22, 0.42, depth / 2 + 0.02], {
    cast: false,
  })

  const run = depth / 2
  const rise = 0.28
  const angle = Math.atan2(rise, run)
  const slopeLength = Math.hypot(run, rise) + 0.06
  const slope = disposal.geo(new THREE.BoxGeometry(width + 0.16, 0.06, slopeLength))
  addMesh(group, slope, roof, [0, 0.78, run / 2], { rotation: [angle, 0, 0] })
  addMesh(group, slope, roof, [0, 0.78, -run / 2], { rotation: [-angle, 0, 0] })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + 0.18, 0.05, 0.08)), trim, [0, 0.96, 0])

  if (x < 9) {
    addMesh(group, disposal.geo(new THREE.BoxGeometry(0.14, 0.28, 0.14)), stone, [0.28, 1.05, -0.08])
  }

  if (icon) {
    const sign = new THREE.Group()
    sign.position.set(0, 1.12, 0.22)
    sign.rotation.x = -1.02
    group.add(sign)
    addMesh(sign, disposal.geo(new THREE.BoxGeometry(0.58, 0.58, 0.04)), trim, [0, 0, 0], { cast: false })
    addMesh(sign, disposal.geo(new THREE.PlaneGeometry(0.48, 0.48)), iconMaterial(disposal, icon), [0, 0, 0.03], {
      cast: false,
      receive: false,
    })
  }

  return {
    label: new THREE.Vector3(x, ground + 1.85, z),
    focus: new THREE.Vector3(x, ground + 0.7, z),
  }
}

function iconMaterial(disposal: Disposal, map: THREE.Texture) {
  return disposal.mat(
    new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      alphaTest: 0.15,
      toneMapped: true,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  )
}
