import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'
import { addMesh, addPlanter } from '../parts'

export function buildHouse(
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

  const wood = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.78 })
  const deck = surfaceMaterial(disposal, atlas.weathered, { roughness: 0.84 })
  const stone = surfaceMaterial(disposal, atlas.limestone)
  const metal = standard(disposal, { color: '#2a2826', roughness: 0.42, metalness: 0.55 })
  const roof = standard(disposal, { color: '#322e2b', roughness: 0.58, metalness: 0.22 })
  const glass = standard(disposal, {
    color: '#9eb8b4',
    roughness: 0.05,
    metalness: 0,
    envMapIntensity: 1.85,
  })
  const warm = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.35,
    roughness: 0.3,
  })
  const leaf = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.8 })

  addMesh(group, disposal.geo(new THREE.BoxGeometry(6.7, 0.16, 4.55)), stone, [0, 0.1, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.22, 2.35, 4.05)), wood, [-3.15, 1.32, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.22, 2.35, 4.05)), wood, [3.15, 1.32, 0])

  const wall = disposal.geo(new THREE.PlaneGeometry(5.85, 2.15))
  addMesh(group, wall, glass, [0, 1.28, 2.02], { cast: false, receive: false })
  addMesh(group, wall, glass, [0, 1.28, -2.02], { cast: false, receive: false, rotation: [0, Math.PI, 0] })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(4.6, 1.7)), warm, [0, 1.28, 1.55], { cast: false, receive: false })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(4.6, 1.7)), warm, [0, 1.28, -1.55], {
    cast: false,
    receive: false,
    rotation: [0, Math.PI, 0],
  })

  const mullion = disposal.geo(new THREE.BoxGeometry(0.045, 2.15, 0.05))
  for (const mx of [-2.2, -1.1, 0, 1.1, 2.2]) {
    addMesh(group, mullion, metal, [mx, 1.28, 2.06])
    addMesh(group, mullion, metal, [mx, 1.28, -2.06])
  }
  const rail = disposal.geo(new THREE.BoxGeometry(5.85, 0.045, 0.05))
  addMesh(group, rail, metal, [0, 1.28, 2.06])
  addMesh(group, rail, metal, [0, 1.28, -2.06])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(5.9, 0.06, 0.08)), metal, [0, 0.28, 2.06])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(5.9, 0.06, 0.08)), metal, [0, 0.28, -2.06])

  const roofY = 2.58
  addMesh(group, disposal.geo(new THREE.BoxGeometry(7.05, 0.1, 5.05)), roof, [0, roofY, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(6.7, 0.04, 0.06)), metal, [0, roofY - 0.04, 2.52])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(6.7, 0.04, 0.06)), metal, [0, roofY - 0.04, -2.52])

  const lantern = 0.34
  addMesh(group, disposal.geo(new THREE.BoxGeometry(2.5, lantern, 0.05)), metal, [0, roofY + lantern / 2, 0.7])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(2.5, lantern, 0.05)), metal, [0, roofY + lantern / 2, -0.7])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.05, lantern, 1.4)), metal, [-1.25, roofY + lantern / 2, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.05, lantern, 1.4)), metal, [1.25, roofY + lantern / 2, 0])
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(2.35, 1.25)), glass, [0, roofY + lantern, 0], {
    cast: false,
    receive: false,
    rotation: [-Math.PI / 2, 0, 0],
  })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(2.1, 1.05)), warm, [0, roofY + 0.08, 0], {
    cast: false,
    receive: false,
    rotation: [-Math.PI / 2, 0, 0],
  })
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.07, 0.08, 0.48, 8)), metal, [2.35, roofY + 0.28, -1.35])

  addMesh(group, disposal.geo(new THREE.BoxGeometry(4.6, 0.08, 1.85)), deck, [0, 0.32, -2.95])
  const post = disposal.geo(new THREE.CylinderGeometry(0.04, 0.045, 2.15, 6))
  for (const px of [-2.05, 2.05]) {
    addMesh(group, post, metal, [px, 1.35, -3.55])
  }
  addMesh(group, disposal.geo(new THREE.BoxGeometry(4.3, 0.03, 0.03)), metal, [0, 1.05, -3.55])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(4.3, 0.03, 0.03)), metal, [0, 1.55, -3.55])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.15, 0.06, 0.42)), stone, [0, 0.14, 2.42])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.28, 0.06, 0.38)), stone, [0, 0.08, 2.78])
  addPlanter(group, disposal, wood, leaf, [2.7, 0, 2.35])

  const lamp = new THREE.PointLight('#ffb15e', 2.2, 5.5, 2)
  lamp.position.set(0.2, 1.7, 0.2)
  group.add(lamp)

  const dockY = WATER_Y - ground + 0.08
  const dockLength = 6.2
  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.45, 0.1, dockLength)), deck, [
    0.15,
    dockY,
    -2.15 - dockLength / 2,
  ])
  const piling = disposal.geo(new THREE.CylinderGeometry(0.06, 0.07, 0.85, 6))
  for (const step of [0.2, 0.55, 0.9]) {
    const pz = -2.15 - dockLength * step
    addMesh(group, piling, metal, [-0.5, dockY - 0.4, pz])
    addMesh(group, piling, metal, [0.8, dockY - 0.4, pz])
  }

  return {
    label: new THREE.Vector3(x, ground + 3.85, z),
    focus: new THREE.Vector3(x, ground + 1.2, z),
  }
}
