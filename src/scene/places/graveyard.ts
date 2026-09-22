import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addMesh } from '../parts'

const LEFT = -4.7
const RIGHT = 0.28
const FRONT = 15.9
const NOTCH = 16.4
const BACK = 18.5
const NOTCH_L = -3.22
const NOTCH_R = -1.62
const GATE_X = -0.12
const GATE_HALF = 0.42

/** House steps occupy the middle of the near edge, so the fence steps back around them. */
const LOOP: Array<[number, number]> = [
  [LEFT, FRONT],
  [NOTCH_L, FRONT],
  [NOTCH_L, NOTCH],
  [NOTCH_R, NOTCH],
  [NOTCH_R, FRONT],
  [RIGHT, FRONT],
  [RIGHT, BACK],
  [LEFT, BACK],
]

const BLOOMS: Array<[number, number, string]> = [
  [-4.4, 17.6, '#e7b7c4'],
  [-2.15, 17.7, '#f0e2b0'],
  [-3.35, 17.95, '#f4efe6'],
  [-0.85, 17.85, '#e7b7c4'],
  [0.02, 17.7, '#f0e2b0'],
]

export function buildStone(
  parent: THREE.Object3D,
  disposal: Disposal,
  atlas: Atlas,
  x: number,
  z: number,
  id: string,
  icon?: THREE.Texture,
) {
  const ground = terrainHeight(x, z)
  const mesh = marker(disposal, atlas, yaw(id), icon)
  mesh.position.set(x, ground, z)
  parent.add(mesh)
  return {
    label: new THREE.Vector3(x, ground + 1.7, z),
    focus: new THREE.Vector3(x, ground + 0.55, z),
  }
}

export function buildGraveyard(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const iron = standard(disposal, { color: '#3a3834', roughness: 0.46, metalness: 0.45 })
  const wood = surfaceMaterial(disposal, atlas.weathered, { roughness: 0.9 })
  const leaf = surfaceMaterial(disposal, atlas.foliage, { color: '#6d8a52', roughness: 0.88 })
  const warm = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.55,
    roughness: 0.35,
  })

  addPlot(parent, disposal, atlas)
  addFence(parent, disposal, iron)
  addGate(parent, disposal, iron, wood)
  addBench(parent, disposal, wood)
  addLantern(parent, disposal, iron, warm)

  const bloom = disposal.geo(new THREE.SphereGeometry(0.13, 7, 5))
  for (const [x, z, color] of BLOOMS) {
    const material = standard(disposal, { color, roughness: 0.62 })
    const y = terrainHeight(x, z)
    const cluster: Array<[number, number, number]> = [
      [0, 0.15, 0],
      [0.18, 0.12, 0.07],
      [-0.15, 0.11, 0.09],
      [0.04, 0.13, -0.15],
    ]
    cluster.forEach(([dx, lift, dz], index) => {
      const mesh = addMesh(parent, bloom, material, [x + dx, y + lift, z + dz], { cast: false })
      mesh.scale.setScalar(index === 0 ? 1 : 0.7)
    })
  }

  const bush = disposal.geo(new THREE.IcosahedronGeometry(0.34, 0))
  for (const [x, z, scale] of [
    [-4.42, 18.28, 1],
    [0.05, 18.15, 0.9],
  ] as const) {
    addMesh(parent, bush, leaf, [x, terrainHeight(x, z) + 0.18 * scale, z]).scale.set(scale, scale * 0.72, scale)
  }
}

function addPlot(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const gravel: Array<[number, number]> = [
    [LEFT + 0.22, FRONT + 0.2],
    [NOTCH_L - 0.16, FRONT + 0.2],
    [NOTCH_L - 0.16, NOTCH + 0.16],
    [NOTCH_R + 0.16, NOTCH + 0.16],
    [NOTCH_R + 0.16, FRONT + 0.2],
    [RIGHT - 0.22, FRONT + 0.2],
    [RIGHT - 0.22, BACK - 0.22],
    [LEFT + 0.22, BACK - 0.22],
  ]
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const [x, z] of gravel) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z)
  }
  const step = 0.28
  const columns = Math.ceil((maxX - minX) / step)
  const rows = Math.ceil((maxZ - minZ) / step)
  const indexAt: number[][] = []
  const position: number[] = []
  const uv: number[] = []
  for (let row = 0; row <= rows; row++) {
    const line: number[] = []
    const z = Math.min(maxZ, minZ + row * step)
    for (let column = 0; column <= columns; column++) {
      const x = Math.min(maxX, minX + column * step)
      if (!contains(x, z, gravel)) {
        line.push(-1)
        continue
      }
      line.push(position.length / 3)
      position.push(x, terrainHeight(x, z) + 0.04, z)
      uv.push((x - minX) / (maxX - minX), (z - minZ) / (maxZ - minZ))
    }
    indexAt.push(line)
  }
  const index: number[] = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = indexAt[row][column]
      const b = indexAt[row][column + 1]
      const c = indexAt[row + 1][column]
      const d = indexAt[row + 1][column + 1]
      if (a < 0 || b < 0 || c < 0 || d < 0) continue
      index.push(a, c, b, b, c, d)
    }
  }
  const geometry = disposal.geo(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  const material = surfaceMaterial(disposal, atlas.gravel, {
    color: '#6e5c48',
    roughness: 0.96,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = false
  parent.add(mesh)
}

function addFence(parent: THREE.Object3D, disposal: Disposal, iron: THREE.Material) {
  const post = disposal.geo(new THREE.BoxGeometry(0.14, 1.02, 0.14))
  const finial = disposal.geo(new THREE.ConeGeometry(0.09, 0.18, 4))
  const rail = disposal.geo(new THREE.BoxGeometry(1, 0.06, 0.08))
  const placed = new Set<string>()
  for (let edge = 0; edge < LOOP.length; edge++) {
    const [x0, z0] = LOOP[edge]
    const [x1, z1] = LOOP[(edge + 1) % LOOP.length]
    const gateEdge = z0 === FRONT && z1 === FRONT && x0 < GATE_X && x1 > GATE_X
    addRun(parent, post, finial, rail, iron, placed, x0, z0, x1, z1, gateEdge)
  }
}

function addRun(
  parent: THREE.Object3D,
  post: THREE.BufferGeometry,
  finial: THREE.BufferGeometry,
  rail: THREE.BufferGeometry,
  iron: THREE.Material,
  placed: Set<string>,
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  gateEdge: boolean,
) {
  const dx = x1 - x0
  const dz = z1 - z0
  const steps = Math.max(1, Math.round(Math.hypot(dx, dz) / 0.9))
  const points: Array<[number, number]> = []
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (dx * i) / steps
    const z = z0 + (dz * i) / steps
    if (gateEdge && Math.abs(x - GATE_X) < GATE_HALF + 0.12) continue
    points.push([x, z])
    const key = `${x.toFixed(2)},${z.toFixed(2)}`
    if (placed.has(key)) continue
    placed.add(key)
    const y = terrainHeight(x, z)
    addMesh(parent, post, iron, [x, y + 0.51, z])
    addMesh(parent, finial, iron, [x, y + 1.1, z])
  }

  const segments: Array<[[number, number], [number, number]]> = []
  for (let i = 0; i < points.length - 1; i++) {
    const span = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1])
    if (span > 1.35) continue
    segments.push([points[i], points[i + 1]])
  }
  if (gateEdge) {
    const left = [...points].reverse().find(([x]) => x < GATE_X)
    const right = points.find(([x]) => x > GATE_X)
    if (left) segments.push([left, [GATE_X - GATE_HALF, z0]])
    if (right) segments.push([[GATE_X + GATE_HALF, z0], right])
  }

  for (const [[ax, az], [bx, bz]] of segments) {
    const span = Math.hypot(bx - ax, bz - az)
    if (span < 0.08) continue
    const mx = (ax + bx) / 2
    const mz = (az + bz) / 2
    const y = terrainHeight(mx, mz)
    const yaw = Math.atan2(-(bz - az), bx - ax)
    for (const height of [0.34, 0.72]) {
      const bar = addMesh(parent, rail, iron, [mx, y + height, mz], { rotation: [0, yaw, 0] })
      bar.scale.x = span
    }
  }
}

function addGate(parent: THREE.Object3D, disposal: Disposal, iron: THREE.Material, wood: THREE.Material) {
  const z = FRONT
  const y = terrainHeight(GATE_X, z)
  const jamb = disposal.geo(new THREE.BoxGeometry(0.12, 1.28, 0.12))
  addMesh(parent, jamb, iron, [GATE_X - GATE_HALF, y + 0.64, z])
  addMesh(parent, jamb, iron, [GATE_X + GATE_HALF, y + 0.64, z])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(GATE_HALF * 2 + 0.16, 0.08, 0.1)), iron, [
    GATE_X,
    y + 1.26,
    z,
  ])
  addMesh(parent, disposal.geo(new THREE.ConeGeometry(0.08, 0.16, 4)), iron, [GATE_X, y + 1.38, z])

  const picket = disposal.geo(new THREE.BoxGeometry(0.08, 0.82, 0.06))
  const brace = disposal.geo(new THREE.BoxGeometry(0.5, 0.05, 0.05))
  for (const side of [-1, 1]) {
    const door = new THREE.Group()
    door.position.set(GATE_X + side * GATE_HALF, y, z)
    door.rotation.y = side * 0.85
    parent.add(door)
    for (let i = 0; i < 3; i++) {
      addMesh(door, picket, wood, [side * -(0.1 + i * 0.16), 0.46, 0])
    }
    addMesh(door, brace, iron, [side * -0.26, 0.32, 0])
    addMesh(door, brace, iron, [side * -0.26, 0.64, 0])
  }
}

function addBench(parent: THREE.Object3D, disposal: Disposal, wood: THREE.Material) {
  const x = -0.35
  const z = 18.12
  const y = terrainHeight(x, z)
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.95, 0.07, 0.34)), wood, [x, y + 0.42, z])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.95, 0.32, 0.06)), wood, [x, y + 0.6, z - 0.14])
  const leg = disposal.geo(new THREE.BoxGeometry(0.07, 0.4, 0.28))
  addMesh(parent, leg, wood, [x - 0.36, y + 0.2, z])
  addMesh(parent, leg, wood, [x + 0.36, y + 0.2, z])
}

function addLantern(parent: THREE.Object3D, disposal: Disposal, iron: THREE.Material, warm: THREE.Material) {
  const x = -4.35
  const z = 18.05
  const y = terrainHeight(x, z)
  addMesh(parent, disposal.geo(new THREE.CylinderGeometry(0.045, 0.05, 1.05, 6)), iron, [x, y + 0.52, z])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.22, 0.26, 0.22)), warm, [x, y + 1.12, z], { cast: false })
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.28, 0.05, 0.28)), iron, [x, y + 1.28, z])
}

function marker(disposal: Disposal, atlas: Atlas, rotation: number, icon?: THREE.Texture) {
  const group = new THREE.Group()
  group.rotation.y = rotation
  const slate = surfaceMaterial(disposal, atlas.slate, { roughness: 0.9 })
  const plaque = standard(disposal, { color: '#f4efe6', roughness: 0.62, metalness: 0.02 })

  addMesh(group, disposal.geo(new THREE.BoxGeometry(1.05, 0.08, 0.82)), slate, [0, 0.02, 0])
  const border = disposal.geo(new THREE.BoxGeometry(0.06, 0.12, 0.06))
  for (const [bx, bz] of [
    [-0.48, -0.36],
    [0.48, -0.36],
    [-0.48, 0.36],
    [0.48, 0.36],
  ] as const) {
    addMesh(group, border, slate, [bx, 0.06, bz])
  }
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.72, 0.1, 0.32)), slate, [0, 0.1, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.56, 1.05, 0.14)), slate, [0, 0.58, 0])
  const cap = addMesh(group, disposal.geo(new THREE.SphereGeometry(0.28, 8, 6)), slate, [0, 1.05, 0])
  cap.scale.set(1, 0.42, 0.5)

  if (icon) {
    const sign = new THREE.Group()
    sign.position.set(0, 0.72, 0.2)
    sign.rotation.x = -1.05
    group.add(sign)
    addMesh(sign, disposal.geo(new THREE.BoxGeometry(0.58, 0.58, 0.04)), plaque, [0, 0, 0], { cast: false })
    addMesh(sign, disposal.geo(new THREE.PlaneGeometry(0.5, 0.5)), iconMaterial(disposal, icon), [0, 0, 0.03], {
      cast: false,
      receive: false,
    })
  }
  return group
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

function contains(x: number, z: number, polygon: Array<[number, number]>) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i]
    const [xj, zj] = polygon[j]
    const crosses = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi + 0.00001) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function yaw(id: string) {
  let hash = 2166136261
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (((hash >>> 0) % 1000) / 1000 - 0.5) * 0.45
}
