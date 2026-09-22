import * as THREE from 'three'
import type { Disposal } from './disposal'

export function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  options?: { cast?: boolean; receive?: boolean; rotation?: [number, number, number] },
) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  if (options?.rotation) mesh.rotation.set(options.rotation[0], options.rotation[1], options.rotation[2])
  mesh.castShadow = options?.cast ?? true
  mesh.receiveShadow = options?.receive ?? true
  parent.add(mesh)
  return mesh
}

type Face = '+z' | '-z' | '+x' | '-x'

const FACE_YAW: Record<Face, number> = {
  '+z': 0,
  '-z': Math.PI,
  '+x': Math.PI / 2,
  '-x': -Math.PI / 2,
}

/** Closed gable: two slopes, a ridge, eaves, and filled ends. */
export function addGable(
  parent: THREE.Object3D,
  disposal: Disposal,
  material: THREE.Material,
  width: number,
  depth: number,
  baseY: number,
  trim: THREE.Material = material,
  ends: THREE.Material = material,
) {
  const run = depth / 2
  const rise = Math.min(1.45, depth * 0.34)
  const angle = Math.atan2(rise, run)
  const slopeLength = Math.hypot(run, rise) + 0.05
  const slope = disposal.geo(new THREE.BoxGeometry(width, 0.09, slopeLength))
  const midY = baseY + rise / 2
  addMesh(parent, slope, material, [0, midY, run / 2], { rotation: [angle, 0, 0] })
  addMesh(parent, slope, material, [0, midY, -run / 2], { rotation: [-angle, 0, 0] })

  addMesh(parent, disposal.geo(new THREE.BoxGeometry(width + 0.06, 0.1, 0.16)), trim, [
    0,
    baseY + rise + 0.02,
    0,
  ])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(width, 0.05, depth - 0.28)), ends, [
    0,
    baseY - 0.02,
    0,
  ], { cast: false })

  const fascia = disposal.geo(new THREE.BoxGeometry(width + 0.04, 0.12, 0.06))
  addMesh(parent, fascia, trim, [0, baseY + 0.02, run - 0.02])
  addMesh(parent, fascia, trim, [0, baseY + 0.02, -run + 0.02])

  const barge = disposal.geo(new THREE.BoxGeometry(0.07, 0.11, slopeLength))
  for (const end of [-1, 1]) {
    const x = end * (width / 2 - 0.01)
    addMesh(parent, barge, trim, [x, midY, run / 2], { rotation: [angle, 0, 0] })
    addMesh(parent, barge, trim, [x, midY, -run / 2], { rotation: [-angle, 0, 0] })
  }

  const courses = disposal.geo(new THREE.BoxGeometry(width - 0.14, 0.03, 0.08))
  for (const sign of [1, -1] as const) {
    const slopeGroup = new THREE.Group()
    slopeGroup.position.set(0, midY, (sign * run) / 2)
    slopeGroup.rotation.x = sign * angle
    parent.add(slopeGroup)
    for (let i = 0; i < 4; i++) {
      const along = -slopeLength / 2 + ((i + 1) / 5) * slopeLength
      addMesh(slopeGroup, courses, material, [0, 0.07, along])
    }
  }

  // Ridge cap and exposed rafter tails under both eaves.
  const cap = disposal.geo(new THREE.BoxGeometry(width + 0.1, 0.06, 0.26))
  addMesh(parent, cap, trim, [0, baseY + rise + 0.07, 0])
  const tail = disposal.geo(new THREE.BoxGeometry(0.05, 0.07, 0.24))
  const tails = Math.max(3, Math.round(width / 0.42))
  for (let i = 0; i <= tails; i++) {
    const tx = -width / 2 + 0.12 + (i / tails) * (width - 0.24)
    for (const sign of [1, -1]) {
      addMesh(parent, tail, ends, [tx, baseY - 0.07, sign * (run - 0.14)], { rotation: [sign * angle, 0, 0] })
    }
  }

  const gable = gableGeometry(disposal, run - 0.16, rise - 0.04)
  addMesh(parent, gable, ends, [width / 2 - 0.08, baseY, 0], { cast: false, receive: false })
  addMesh(parent, gable, ends, [-width / 2 + 0.08, baseY, 0], {
    cast: false,
    receive: false,
    rotation: [0, Math.PI, 0],
  })
}

function gableGeometry(disposal: Disposal, run: number, rise: number) {
  const shape = new THREE.Shape()
  shape.moveTo(-run, 0)
  shape.lineTo(0, rise)
  shape.lineTo(run, 0)
  shape.closePath()
  const geometry = disposal.geo(new THREE.ShapeGeometry(shape))
  geometry.rotateY(Math.PI / 2)
  return geometry
}

/** A sash: frame, cross mullion, sill, and a pane sitting just proud of the wall. */
export function addSash(
  parent: THREE.Object3D,
  disposal: Disposal,
  trim: THREE.Material,
  glass: THREE.Material,
  position: [number, number, number],
  face: Face,
  width = 0.58,
  height = 0.78,
) {
  const group = new THREE.Group()
  group.position.set(position[0], position[1], position[2])
  group.rotation.y = FACE_YAW[face]
  parent.add(group)

  const thick = 0.055
  const depth = 0.06
  const rail = disposal.geo(new THREE.BoxGeometry(width + thick * 2, thick, depth))
  const stile = disposal.geo(new THREE.BoxGeometry(thick, height, depth))
  addMesh(group, rail, trim, [0, height / 2, 0])
  addMesh(group, rail, trim, [0, -height / 2, 0])
  addMesh(group, stile, trim, [-width / 2, 0, 0])
  addMesh(group, stile, trim, [width / 2, 0, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(thick * 0.62, height, depth * 0.7)), trim, [0, 0, 0.012])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width, thick * 0.62, depth * 0.7)), trim, [0, 0, 0.012])
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(width - 0.03, height - 0.03)), glass, [0, 0, -0.008], {
    cast: false,
    receive: false,
  })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + thick * 2.4, thick * 0.7, depth * 2.4)), trim, [
    0,
    -height / 2 - thick * 0.15,
    depth * 0.55,
  ])
}

export function addDoor(
  parent: THREE.Object3D,
  disposal: Disposal,
  trim: THREE.Material,
  panel: THREE.Material,
  position: [number, number, number],
  face: Face,
  width = 0.62,
  height = 1.15,
) {
  const group = new THREE.Group()
  group.position.set(position[0], position[1], position[2])
  group.rotation.y = FACE_YAW[face]
  parent.add(group)
  const thick = 0.06
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + thick * 2, thick, 0.07)), trim, [0, height / 2, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(thick, height, 0.07)), trim, [-width / 2, 0, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(thick, height, 0.07)), trim, [width / 2, 0, 0])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width - 0.06, height - 0.08, 0.04)), panel, [0, -0.02, 0.01])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width * 0.55, height * 0.28, 0.03)), trim, [0, height * 0.16, 0.03])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width + 0.2, 0.08, 0.22)), trim, [0, -height / 2 - 0.02, 0.08])
}

export function addEaves(
  parent: THREE.Object3D,
  disposal: Disposal,
  metal: THREE.Material,
  width: number,
  depth: number,
  baseY: number,
  spout: [number, number],
) {
  const run = depth / 2
  const gutter = disposal.geo(new THREE.BoxGeometry(width, 0.07, 0.1))
  addMesh(parent, gutter, metal, [0, baseY - 0.06, run + 0.06])
  addMesh(parent, gutter, metal, [0, baseY - 0.06, -run - 0.06])
  const top = baseY - 0.06
  const bottom = 0.18
  addMesh(
    parent,
    disposal.geo(new THREE.CylinderGeometry(0.04, 0.045, top - bottom, 6)),
    metal,
    [spout[0], (top + bottom) / 2, spout[1]],
  )
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.1, 0.05, 0.12)), metal, [spout[0], top, spout[1]])
}

export function addSconce(
  parent: THREE.Object3D,
  disposal: Disposal,
  metal: THREE.Material,
  glow: THREE.Material,
  position: [number, number, number],
  face: Face,
  lit = false,
) {
  const group = new THREE.Group()
  group.position.set(position[0], position[1], position[2])
  group.rotation.y = FACE_YAW[face]
  parent.add(group)
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.08, 0.16, 0.06)), metal, [0, 0, 0])
  addMesh(group, disposal.geo(new THREE.SphereGeometry(0.07, 8, 6)), glow, [0, -0.02, 0.08], {
    cast: false,
  })
  if (!lit) return
  const light = new THREE.PointLight('#ffb15e', 1.1, 3.2, 2)
  light.position.set(0, -0.02, 0.12)
  group.add(light)
}

export function addPlanter(
  parent: THREE.Object3D,
  disposal: Disposal,
  pot: THREE.Material,
  leaf: THREE.Material,
  position: [number, number, number],
) {
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.42, 0.28, 0.42)), pot, [
    position[0],
    position[1] + 0.14,
    position[2],
  ])
  addMesh(parent, disposal.geo(new THREE.SphereGeometry(0.22, 8, 6)), leaf, [
    position[0],
    position[1] + 0.38,
    position[2],
  ])
}

/** Stacked round logs with alternating corner overhangs and a pale chink line. Returns the wall top. */
export function addLogWalls(
  parent: THREE.Object3D,
  disposal: Disposal,
  logs: THREE.Material,
  chink: THREE.Material,
  width: number,
  depth: number,
  baseY: number,
  courses = 8,
) {
  const logH = 0.2
  const radius = logH * 0.5
  const along = disposal.geo(new THREE.CylinderGeometry(radius, radius, 1, 10))
  along.rotateZ(Math.PI / 2)
  const across = disposal.geo(new THREE.CylinderGeometry(radius, radius, 1, 10))
  across.rotateX(Math.PI / 2)
  const endCap = disposal.geo(new THREE.CircleGeometry(radius * 0.8, 10))
  const endGrain = disposal.mat(new THREE.MeshStandardMaterial({ color: '#c4a27a', roughness: 0.92, metalness: 0.02 }))
  const chinkAlong = disposal.geo(new THREE.BoxGeometry(1, 0.035, radius * 1.1))
  const chinkAcross = disposal.geo(new THREE.BoxGeometry(radius * 1.1, 0.035, 1))
  const overhang = 0.42
  for (let i = 0; i < courses; i++) {
    const y = baseY + logH * (i + 0.5)
    const longOver = i % 2 === 0
    // Every course runs past the corner; alternating courses sit a half-log higher in reality,
    // which is suggested here by staggering which pair sticks out further.
    const spanX = width + (longOver ? overhang : overhang * 0.55)
    const spanZ = depth + (longOver ? overhang * 0.55 : overhang)
    const jitter = ((i * 37) % 7) * 0.012
    for (const side of [1, -1]) {
      const run = addMesh(parent, along, logs, [0, y, (side * depth) / 2])
      run.scale.x = spanX + jitter
      const cross = addMesh(parent, across, logs, [(side * width) / 2, y, 0])
      cross.scale.z = spanZ - jitter
      for (const end of [1, -1]) {
        addMesh(parent, endCap, endGrain, [(end * (spanX + jitter)) / 2 + end * 0.001, y, (side * depth) / 2], {
          cast: false,
          rotation: [0, (end * Math.PI) / 2, 0],
        })
        addMesh(parent, endCap, endGrain, [(side * width) / 2, y, (end * (spanZ - jitter)) / 2 + end * 0.001], {
          cast: false,
          rotation: [0, end > 0 ? 0 : Math.PI, 0],
        })
      }
    }
    if (i === 0) continue
    const cy = y - logH * 0.5
    for (const side of [1, -1]) {
      const cf = addMesh(parent, chinkAlong, chink, [0, cy, (side * depth) / 2], { cast: false })
      cf.scale.x = width * 0.96
      const cl = addMesh(parent, chinkAcross, chink, [(side * width) / 2, cy, 0], { cast: false })
      cl.scale.z = depth * 0.96
    }
  }
  return baseY + courses * logH
}

export function addChimney(
  parent: THREE.Object3D,
  disposal: Disposal,
  stone: THREE.Material,
  cap: THREE.Material,
  x: number,
  z: number,
  base: number,
  height: number,
) {
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.42, height, 0.42)), stone, [x, base + height / 2, z])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.58, 0.08, 0.58)), stone, [x, base + height + 0.04, z])
  addMesh(parent, disposal.geo(new THREE.BoxGeometry(0.26, 0.12, 0.26)), cap, [x, base + height + 0.14, z])
}

export function addCornerBoards(
  parent: THREE.Object3D,
  disposal: Disposal,
  trim: THREE.Material,
  width: number,
  depth: number,
  baseY: number,
  topY: number,
) {
  const board = disposal.geo(new THREE.BoxGeometry(0.09, topY - baseY, 0.09))
  const y = (baseY + topY) / 2
  const hx = width / 2
  const hz = depth / 2
  for (const [x, z] of [
    [-hx, -hz],
    [hx, -hz],
    [-hx, hz],
    [hx, hz],
  ] as const) {
    addMesh(parent, board, trim, [x, y, z])
  }
}

/** A painted window box with a row of blooms, hung just under a sash. */
export function addFlowerBox(
  parent: THREE.Object3D,
  disposal: Disposal,
  box: THREE.Material,
  leaf: THREE.Material,
  position: [number, number, number],
  face: Face,
  width = 0.6,
) {
  const group = new THREE.Group()
  group.position.set(position[0], position[1], position[2])
  group.rotation.y = FACE_YAW[face]
  parent.add(group)
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width, 0.14, 0.16)), box, [0, 0, 0.08])
  const bud = disposal.geo(new THREE.IcosahedronGeometry(0.075, 0))
  const colors = ['#e7a0b4', '#f2d27a', '#f4efe6', '#d86a58']
  const count = Math.max(3, Math.round(width / 0.13))
  for (let i = 0; i < count; i++) {
    const bx = -width / 2 + 0.07 + (i / (count - 1)) * (width - 0.14)
    const foliage = addMesh(group, bud, leaf, [bx, 0.09, 0.08], { cast: false })
    foliage.scale.set(1, 0.8, 0.9)
    if (i % 2 === 0) continue
    const bloom = BLOOM_CACHE.get(disposal)?.[i % colors.length] ?? bloomMaterials(disposal, colors)[i % colors.length]
    addMesh(group, disposal.geo(new THREE.SphereGeometry(0.035, 6, 4)), bloom, [bx, 0.16, 0.12], { cast: false })
  }
}

const BLOOM_CACHE = new WeakMap<Disposal, THREE.Material[]>()

function bloomMaterials(disposal: Disposal, colors: string[]) {
  const materials = colors.map((color) =>
    disposal.mat(new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.02 })),
  )
  BLOOM_CACHE.set(disposal, materials)
  return materials
}
