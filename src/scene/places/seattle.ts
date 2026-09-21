import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'
import { addMesh } from '../parts'

export function buildSeattle(
  parent: THREE.Object3D,
  disposal: Disposal,
  atlas: Atlas,
  x: number,
  z: number,
  bob: (object: THREE.Object3D, amplitude?: number) => void,
) {
  const dark = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.72, metalness: 0.06 })
  const glass = standard(disposal, {
    color: '#c5d5d8',
    roughness: 0.12,
    metalness: 0.04,
    envMapIntensity: 0.8,
  })

  const ferry = new THREE.Group()
  ferry.position.set(x, WATER_Y, z)
  parent.add(ferry)
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(1.7, 0.55, 4.2)), dark, [0, 0.38, 0])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(1.15, 0.22, 4.4)), dark, [0, 0.68, 0])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(1.35, 0.85, 1.7)), dark, [0, 1.15, -0.35])
  addMesh(ferry, disposal.geo(new THREE.PlaneGeometry(0.7, 0.32)), glass, [0, 1.2, 0.51], { cast: false })
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(0.28, 0.45, 0.28)), dark, [0, 1.75, -0.7])
  bob(ferry, 0.035)

  const slipZ = -13.15
  const slipY = terrainHeight(x, slipZ)
  const slip = new THREE.Group()
  slip.position.set(x, 0, 0)
  parent.add(slip)
  const pierY = Math.max(WATER_Y + 0.08, slipY)
  addMesh(slip, disposal.geo(new THREE.BoxGeometry(1.3, 0.1, 2.4)), dark, [0, pierY, slipZ])
  const piling = disposal.geo(new THREE.CylinderGeometry(0.07, 0.08, 1.1, 6))
  for (const pz of [slipZ - 0.9, slipZ + 0.9]) {
    addMesh(slip, piling, dark, [-0.5, pierY - 0.45, pz])
    addMesh(slip, piling, dark, [0.5, pierY - 0.45, pz])
  }

  return {
    label: new THREE.Vector3(x, WATER_Y + 2.3, z),
    focus: new THREE.Vector3(x, WATER_Y + 0.7, z),
  }
}
