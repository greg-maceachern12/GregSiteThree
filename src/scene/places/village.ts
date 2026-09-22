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
    [-12.2, 11.0],
    [-11.6, 11.7],
    [-10.8, 11.9],
    [-10.1, 11.5],
    [-11.3, 11.15],
  ] as const) {
    addMesh(parent, stone, gravel, [x, terrainHeight(x, z) + 0.04, z], { cast: false })
  }

  const x = -11.0
  const z = 10.75
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
  // Turned toward the near shore so the project signs read from the default view.
  group.rotation.y = 0.5 + ((Math.abs(x * 1.7 + z) % 1) - 0.5) * 0.18
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
  const face = depth / 2
  const chink = standard(disposal, { color: '#e2d3bd', roughness: 0.9, metalness: 0.02 })
  const leaf = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.85 })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + 0.16, 0.08, depth + 0.12)), stone, [0, 0.05, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width, 0.58, depth)), logs, [0, 0.38, 0])

  // Log courses picked out with chinking, and corner boards.
  const groove = disposal.geo(new THREE.BoxGeometry(width + 0.01, 0.018, depth + 0.01))
  for (const gy of [0.24, 0.38, 0.52]) addMesh(group, groove, chink, [0, gy, 0], { cast: false })
  const corner = disposal.geo(new THREE.BoxGeometry(0.06, 0.6, 0.06))
  for (const [cx, cz] of [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const) {
    addMesh(group, corner, logs, [(cx * width) / 2, 0.38, (cz * depth) / 2])
  }

  // Door with a trim surround and a step.
  const frameV = disposal.geo(new THREE.BoxGeometry(0.035, 0.4, 0.03))
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.26, 0.34, 0.03)), door, [-0.16, 0.26, face + 0.012])
  addMesh(group, frameV, trim, [-0.305, 0.28, face + 0.02])
  addMesh(group, frameV, trim, [-0.015, 0.28, face + 0.02])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.33, 0.035, 0.03)), trim, [-0.16, 0.47, face + 0.02])
  addMesh(group, disposal.geo(new THREE.SphereGeometry(0.014, 6, 4)), trim, [-0.07, 0.26, face + 0.035], { cast: false })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.34, 0.05, 0.14)), stone, [-0.16, 0.04, face + 0.1])

  // Lit window with a cross mullion, trim, and a window box.
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.2, 0.17, 0.02)), warm, [0.22, 0.42, face + 0.01], { cast: false })
  const rail = disposal.geo(new THREE.BoxGeometry(0.25, 0.03, 0.03))
  const stile = disposal.geo(new THREE.BoxGeometry(0.03, 0.2, 0.03))
  addMesh(group, rail, trim, [0.22, 0.52, face + 0.02])
  addMesh(group, rail, trim, [0.22, 0.32, face + 0.02])
  addMesh(group, stile, trim, [0.105, 0.42, face + 0.02])
  addMesh(group, stile, trim, [0.335, 0.42, face + 0.02])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.015, 0.17, 0.02)), trim, [0.22, 0.42, face + 0.025], { cast: false })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.2, 0.015, 0.02)), trim, [0.22, 0.42, face + 0.025], { cast: false })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.26, 0.06, 0.07)), door, [0.22, 0.28, face + 0.04])
  const bud = disposal.geo(new THREE.IcosahedronGeometry(0.035, 0))
  const petals = standard(disposal, { color: '#e7a0b4', roughness: 0.62 })
  for (const bx of [-0.08, 0, 0.08]) {
    addMesh(group, bud, bx === 0 ? petals : leaf, [0.22 + bx, 0.33, face + 0.045], { cast: false })
  }

  const run = depth / 2
  const rise = 0.28
  const angle = Math.atan2(rise, run)
  const slopeLength = Math.hypot(run, rise) + 0.06
  const slope = disposal.geo(new THREE.BoxGeometry(width + 0.16, 0.06, slopeLength))
  addMesh(group, slope, roof, [0, 0.78, run / 2], { rotation: [angle, 0, 0] })
  addMesh(group, slope, roof, [0, 0.78, -run / 2], { rotation: [-angle, 0, 0] })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + 0.18, 0.05, 0.08)), trim, [0, 0.96, 0])

  // Close the gable ends and trim the barge boards.
  const gableShape = new THREE.Shape()
  gableShape.moveTo(-run, 0)
  gableShape.lineTo(0, rise)
  gableShape.lineTo(run, 0)
  gableShape.closePath()
  const gable = disposal.geo(new THREE.ShapeGeometry(gableShape))
  gable.rotateY(Math.PI / 2)
  addMesh(group, gable, logs, [width / 2, 0.67, 0], { cast: false })
  addMesh(group, gable, logs, [-width / 2, 0.67, 0], { cast: false, rotation: [0, Math.PI, 0] })
  const barge = disposal.geo(new THREE.BoxGeometry(0.035, 0.05, slopeLength))
  for (const end of [-1, 1]) {
    const bx = end * (width / 2 + 0.08)
    addMesh(group, barge, trim, [bx, 0.8, run / 2], { rotation: [angle, 0, 0] })
    addMesh(group, barge, trim, [bx, 0.8, -run / 2], { rotation: [-angle, 0, 0] })
  }

  if (Math.round(x * 10) % 3 === 0) {
    addMesh(group, disposal.geo(new THREE.BoxGeometry(0.14, 0.28, 0.14)), stone, [0.28, 1.05, -0.08])
    addMesh(group, disposal.geo(new THREE.BoxGeometry(0.18, 0.04, 0.18)), stone, [0.28, 1.2, -0.08])
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
