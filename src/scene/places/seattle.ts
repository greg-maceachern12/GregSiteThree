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
  const deckWood = surfaceMaterial(disposal, atlas.weathered, { roughness: 0.84 })
  const dark = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.72, metalness: 0.06 })
  const hullPaint = standard(disposal, { color: '#1e4c56', roughness: 0.42, metalness: 0.08 })
  const stripe = standard(disposal, { color: '#f4efe6', roughness: 0.5, metalness: 0.04 })
  const rig = standard(disposal, { color: '#6a5644', roughness: 0.68, metalness: 0.05 })
  const cloth = standard(disposal, {
    color: '#fffaf4',
    roughness: 0.62,
    metalness: 0.02,
    envMapIntensity: 0.55,
    emissive: '#fff6ec',
    emissiveIntensity: 0.28,
  })
  cloth.side = THREE.DoubleSide
  cloth.vertexColors = true
  const glass = standard(disposal, {
    color: '#9eb8b4',
    roughness: 0.08,
    metalness: 0,
    envMapIntensity: 1.5,
  })
  const pennant = standard(disposal, { color: '#c4523a', roughness: 0.7, metalness: 0.02 })
  pennant.side = THREE.DoubleSide

  const boat = new THREE.Group()
  boat.position.set(x, WATER_Y, z)
  boat.rotation.y = 0.42
  parent.add(boat)

  const hull = new THREE.Mesh(hullGeometry(disposal), hullPaint)
  hull.scale.set(2.9, 1.22, 10.6)
  hull.position.y = 0.08
  hull.castShadow = true
  hull.receiveShadow = true
  boat.add(hull)

  addMesh(boat, disposal.geo(new THREE.BoxGeometry(0.1, 0.42, 1.55)), hullPaint, [0, -0.16, -0.15])
  addMesh(boat, disposal.geo(new THREE.BoxGeometry(1.15, 0.06, 3.7)), stripe, [0, 0.22, 0.05])

  const plank = disposal.geo(new THREE.BoxGeometry(0.22, 0.04, 3.35))
  for (let i = 0; i < 5; i++) {
    addMesh(boat, plank, deckWood, [-0.44 + i * 0.22, 0.34, 0.05])
  }

  addMesh(boat, disposal.geo(new THREE.BoxGeometry(1.15, 0.4, 1.28)), dark, [0, 0.54, -0.15])
  addMesh(boat, disposal.geo(new THREE.BoxGeometry(1.28, 0.06, 1.42)), deckWood, [0, 0.76, -0.15])
  addMesh(boat, disposal.geo(new THREE.PlaneGeometry(0.42, 0.28)), glass, [0, 0.8, -0.15], {
    cast: false,
    receive: false,
    rotation: [-Math.PI / 2, 0, 0],
  })
  addMesh(boat, disposal.geo(new THREE.BoxGeometry(0.36, 0.05, 0.28)), rig, [0, 0.8, -0.72])

  addMesh(boat, disposal.geo(new THREE.BoxGeometry(0.95, 0.05, 1.05)), dark, [0, 0.32, -1.15])
  const bench = disposal.geo(new THREE.BoxGeometry(0.22, 0.1, 0.85))
  addMesh(boat, bench, deckWood, [-0.32, 0.38, -1.15])
  addMesh(boat, bench, deckWood, [0.32, 0.38, -1.15])

  const stanchion = disposal.geo(new THREE.CylinderGeometry(0.025, 0.028, 0.28, 5))
  const rail = disposal.geo(new THREE.BoxGeometry(0.04, 0.035, 3.5))
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      addMesh(boat, stanchion, rig, [side * 0.58, 0.48, -1.2 + i * 0.7])
    }
    addMesh(boat, rail, rig, [side * 0.58, 0.62, 0.15])
  }

  addMesh(boat, disposal.geo(new THREE.CylinderGeometry(0.045, 0.07, 3.15, 8)), rig, [0, 1.88, 0.42])
  addMesh(boat, disposal.geo(new THREE.BoxGeometry(0.85, 0.04, 0.05)), rig, [0, 2.55, 0.42])
  addMesh(boat, disposal.geo(new THREE.CylinderGeometry(0.03, 0.045, 1.35, 6)), rig, [0, 0.55, 1.85])
  addMesh(boat, disposal.geo(new THREE.BoxGeometry(0.55, 0.04, 0.28)), rig, [0, 0.62, 2.05])

  const main = new THREE.Mesh(sailGeometry(disposal, 2.15, 3.05, 0.28), cloth)
  main.position.set(0.02, 0.36, 0.42)
  main.rotation.x = -0.48
  main.rotation.y = -0.34
  main.castShadow = true
  main.receiveShadow = false
  boat.add(main)
  const boom = addMesh(main, disposal.geo(new THREE.CylinderGeometry(0.032, 0.04, 2.12, 6)), rig, [1.06, 0.04, 0.04])
  boom.rotation.z = Math.PI / 2
  const batten = disposal.geo(new THREE.BoxGeometry(1.45, 0.045, 0.025))
  addMesh(main, batten, rig, [0.9, 0.92, 0.04])
  addMesh(main, batten, rig, [0.62, 1.7, 0.04])

  const jib = new THREE.Mesh(sailGeometry(disposal, 1.35, 2.15, 0.16), cloth)
  jib.position.set(0, 0.62, 1.35)
  jib.scale.x = -1
  jib.rotation.x = -0.48
  jib.rotation.y = -0.22
  jib.castShadow = true
  jib.receiveShadow = false
  boat.add(jib)

  const head = new THREE.Vector3(0, 3.4, 0.42)
  boat.add(stay(disposal, rig, head, new THREE.Vector3(0, 0.62, 2.15)))
  boat.add(stay(disposal, rig, head, new THREE.Vector3(0, 0.4, -1.85)))
  boat.add(stay(disposal, rig, new THREE.Vector3(0, 2.55, 0.42), new THREE.Vector3(0.7, 0.55, 0.15)))
  boat.add(stay(disposal, rig, new THREE.Vector3(0, 2.55, 0.42), new THREE.Vector3(-0.7, 0.55, 0.15)))

  addMesh(boat, disposal.geo(new THREE.BoxGeometry(0.06, 0.72, 0.38)), dark, [0, 0.12, -2.05])
  addMesh(boat, disposal.geo(new THREE.BoxGeometry(0.42, 0.04, 0.06)), rig, [-0.16, 0.42, -1.55])

  const flag = addMesh(boat, disposal.geo(new THREE.PlaneGeometry(0.48, 0.26)), pennant, [0.26, 3.38, 0.42])
  flag.rotation.x = -0.48
  flag.rotation.y = -0.42

  bob(boat, 0.03)

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
    label: new THREE.Vector3(x, WATER_Y + 3.7, z),
    focus: new THREE.Vector3(x, WATER_Y + 1.35, z),
    boat,
    flag,
  }
}

function hullGeometry(disposal: Disposal) {
  const profile = [
    new THREE.Vector2(0.06, 0.24),
    new THREE.Vector2(0.2, 0.16),
    new THREE.Vector2(0.26, 0.04),
    new THREE.Vector2(0.2, -0.08),
    new THREE.Vector2(0.07, -0.18),
    new THREE.Vector2(0, -0.22),
  ]
  const geometry = new THREE.LatheGeometry(profile, 18)
  geometry.rotateX(Math.PI / 2)
  const position = geometry.attributes.position
  let maxZ = 0
  for (let i = 0; i < position.count; i++) maxZ = Math.max(maxZ, Math.abs(position.getZ(i)))
  for (let i = 0; i < position.count; i++) {
    const taper = Math.cos((Math.abs(position.getZ(i)) / maxZ) * Math.PI * 0.5)
    position.setX(i, position.getX(i) * Math.max(0.08, taper))
  }
  geometry.computeVertexNormals()
  return disposal.geo(geometry)
}

function sailGeometry(disposal: Disposal, width: number, height: number, belly: number) {
  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(width, height * 0.04)
  shape.bezierCurveTo(width * 0.84, height * 0.38, width * 0.48, height * 0.72, width * 0.05, height)
  shape.lineTo(0, height)
  shape.closePath()
  const geometry = new THREE.ShapeGeometry(shape, 16)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const u = THREE.MathUtils.clamp(position.getX(i) / width, 0, 1)
    const v = THREE.MathUtils.clamp(position.getY(i) / height, 0, 1)
    const fill = Math.sin(u * Math.PI) * Math.sin(v * Math.PI)
    position.setZ(i, fill * belly)
    const light = 1.02 + fill * 0.16
    colors[i * 3] = light
    colors[i * 3 + 1] = light * 0.985
    colors[i * 3 + 2] = light * 0.94
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return disposal.geo(geometry)
}

function stay(disposal: Disposal, material: THREE.Material, from: THREE.Vector3, to: THREE.Vector3) {
  const direction = new THREE.Vector3().subVectors(to, from)
  const length = direction.length()
  const mesh = new THREE.Mesh(disposal.geo(new THREE.CylinderGeometry(0.028, 0.028, length, 5)), material)
  mesh.position.copy(from).add(to).multiplyScalar(0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize())
  return mesh
}
