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
    color: '#8ea8ad',
    roughness: 0.07,
    metalness: 0,
    envMapIntensity: 1.6,
  })

  const ferry = new THREE.Group()
  ferry.position.set(x, WATER_Y, z)
  parent.add(ferry)
  const trim = standard(disposal, { color: '#d9cfc2', roughness: 0.6, metalness: 0.04 })
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(1.7, 0.55, 4.2)), dark, [0, 0.38, 0])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(1.15, 0.22, 4.4)), dark, [0, 0.68, 0])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(1.35, 0.85, 1.7)), dark, [0, 1.15, -0.35])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(1.48, 0.06, 1.84)), trim, [0, 1.58, -0.35])
  addMesh(ferry, disposal.geo(new THREE.PlaneGeometry(0.62, 0.28)), glass, [0, 1.22, 0.52], { cast: false })
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(0.7, 0.04, 0.04)), trim, [0, 1.38, 0.54])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(0.7, 0.04, 0.04)), trim, [0, 1.06, 0.54])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(0.04, 0.34, 0.04)), trim, [-0.34, 1.22, 0.54])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(0.04, 0.34, 0.04)), trim, [0.34, 1.22, 0.54])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(0.22, 0.55, 0.22)), dark, [0, 1.88, -0.7])
  addMesh(ferry, disposal.geo(new THREE.BoxGeometry(0.32, 0.06, 0.32)), trim, [0, 2.16, -0.7])
  const rail = disposal.geo(new THREE.BoxGeometry(0.04, 0.04, 4.15))
  addMesh(ferry, rail, trim, [-0.78, 0.92, 0])
  addMesh(ferry, rail, trim, [0.78, 0.92, 0])
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
