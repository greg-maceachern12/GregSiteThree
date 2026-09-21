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
