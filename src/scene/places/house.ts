import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { WATER_Y, terrainHeight } from '../ground'
import { addMesh, addPlanter } from '../parts'

type Vec3 = [number, number, number]

/** Glass pavilion on the near shore: cedar ends, a lived-in interior, lake deck, and a pier. */
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

  const boxes = new Map<string, THREE.BoxGeometry>()
  const box = (
    target: THREE.Object3D,
    size: Vec3,
    material: THREE.Material,
    position: Vec3,
    options?: { cast?: boolean; receive?: boolean; rotation?: Vec3 },
  ) => {
    const key = size.map((value) => value.toFixed(3)).join('x')
    let geometry = boxes.get(key)
    if (!geometry) {
      geometry = disposal.geo(new THREE.BoxGeometry(size[0], size[1], size[2]))
      boxes.set(key, geometry)
    }
    return addMesh(target, geometry, material, position, options)
  }

  const cedar = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.78 })
  const batten = surfaceMaterial(disposal, atlas.darkWood, { color: '#8a6a50', roughness: 0.8 })
  const deck = surfaceMaterial(disposal, atlas.weathered, { roughness: 0.84 })
  const oak = surfaceMaterial(disposal, atlas.weathered, { color: '#d8b98f', roughness: 0.7 })
  const stone = surfaceMaterial(disposal, atlas.limestone)
  const hearth = surfaceMaterial(disposal, atlas.slate, { color: '#9c948a', roughness: 0.9 })
  const membrane = standard(disposal, {
    color: '#55524e',
    normalMap: atlas.gravel.normal,
    roughness: 0.94,
    metalness: 0.02,
  })
  const metal = standard(disposal, { color: '#2a2826', roughness: 0.42, metalness: 0.55 })
  const steel = standard(disposal, { color: '#b9bcbb', roughness: 0.28, metalness: 0.85 })
  const roof = standard(disposal, { color: '#322e2b', roughness: 0.58, metalness: 0.22 })
  const plaster = standard(disposal, { color: '#ece6dc', roughness: 0.7, metalness: 0.02 })
  const fabric = standard(disposal, { color: '#8f9f8e', roughness: 0.95, metalness: 0 })
  const accent = standard(disposal, { color: '#c9764f', roughness: 0.9, metalness: 0 })
  const rugMat = standard(disposal, { color: '#d9cbb4', roughness: 1, metalness: 0 })
  const chairPaint = standard(disposal, { color: '#3f6f7a', roughness: 0.6, metalness: 0.03 })
  const solar = standard(disposal, { color: '#141d2a', roughness: 0.3, metalness: 0.4, envMapIntensity: 0.7 })
  const glass = standard(disposal, {
    color: '#b7d0cc',
    roughness: 0.04,
    metalness: 0.1,
    envMapIntensity: 1.6,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  })
  const railGlass = disposal.mat(glass.clone())
  railGlass.opacity = 0.18
  const warm = standard(disposal, {
    color: '#ffb15a',
    emissive: '#ff9a3c',
    emissiveIntensity: 1.35,
    roughness: 0.3,
  })
  const ember = standard(disposal, {
    color: '#ff8a3a',
    emissive: '#ff6a1c',
    emissiveIntensity: 2.2,
    roughness: 0.4,
  })
  const glow = standard(disposal, {
    color: '#fff1d6',
    emissive: '#ffd49a',
    emissiveIntensity: 0.9,
    roughness: 0.5,
  })
  const well = standard(disposal, {
    color: '#d9c29e',
    emissive: '#ffc98a',
    emissiveIntensity: 0.32,
    roughness: 0.7,
  })
  const leaf = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.8 })

  const floorY = 0.19
  const roofY = 2.58

  // Plinth, interior floor, and ceiling.
  box(group, [6.7, 0.16, 4.55], stone, [0, 0.1, 0])
  box(group, [6.1, 0.02, 4.0], oak, [0, floorY, 0], { cast: false })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(6.1, 4.0)), oak, [0, roofY - 0.08, 0], {
    cast: false,
    rotation: [Math.PI / 2, 0, 0],
  })

  // Cedar end walls with vertical battens.
  for (const side of [-1, 1]) {
    box(group, [0.22, 2.35, 4.05], cedar, [side * 3.15, 1.32, 0])
    for (let i = 0; i < 14; i++) {
      const bz = -1.95 + i * 0.3
      box(group, [0.035, 2.3, 0.05], batten, [side * 3.275, 1.32, bz])
    }
  }

  // Glass walls, mullions, sills and heads.
  const wall = disposal.geo(new THREE.PlaneGeometry(5.85, 2.15))
  addMesh(group, wall, glass, [0, 1.28, 2.02], { cast: false, receive: false })
  addMesh(group, wall, glass, [0, 1.28, -2.02], { cast: false, receive: false, rotation: [0, Math.PI, 0] })
  for (const face of [-1, 1]) {
    const fz = face * 2.06
    for (const mx of [-2.2, -1.1, 0, 1.1, 2.2]) box(group, [0.05, 2.15, 0.06], metal, [mx, 1.28, fz])
    box(group, [5.85, 0.04, 0.05], metal, [0, 1.95, fz])
    box(group, [5.95, 0.08, 0.1], metal, [0, 0.24, fz])
    box(group, [5.95, 0.1, 0.1], metal, [0, 2.4, fz])
  }
  // Front door: a wider frame and a pull.
  box(group, [0.08, 2.15, 0.08], metal, [0.55, 1.28, 2.08])
  box(group, [0.03, 0.62, 0.05], steel, [0.47, 1.1, 2.13])

  // Roof: slab, fascia band, gravel membrane, parapet cap, soffit lights.
  box(group, [7.05, 0.2, 5.05], roof, [0, roofY + 0.04, 0])
  box(group, [7.11, 0.24, 0.05], metal, [0, roofY + 0.04, 2.55])
  box(group, [7.11, 0.24, 0.05], metal, [0, roofY + 0.04, -2.55])
  box(group, [0.05, 0.24, 5.11], metal, [3.555, roofY + 0.04, 0])
  box(group, [0.05, 0.24, 5.11], metal, [-3.555, roofY + 0.04, 0])
  box(group, [6.85, 0.02, 4.85], membrane, [0, roofY + 0.15, 0], { cast: false })
  addSedumRoof(group, disposal, roofY + 0.165)
  for (const side of [-1, 1]) {
    box(group, [7.11, 0.08, 0.1], roof, [0, roofY + 0.19, side * 2.51])
    box(group, [0.1, 0.08, 4.95], roof, [side * 3.51, roofY + 0.19, 0])
  }
  const downlight = disposal.geo(new THREE.CircleGeometry(0.06, 10))
  for (const face of [-1, 1]) {
    for (const lx of [-2.4, -1.2, 0, 1.2, 2.4]) {
      addMesh(group, downlight, glow, [lx, roofY - 0.065, face * 2.3], {
        cast: false,
        receive: false,
        rotation: [Math.PI / 2, 0, 0],
      })
    }
  }

  // Skylight: curb, glazing bars, and the warm well below.
  const skyY = roofY + 0.16
  box(group, [2.5, 0.2, 0.08], metal, [0, skyY + 0.1, 0.7])
  box(group, [2.5, 0.2, 0.08], metal, [0, skyY + 0.1, -0.7])
  box(group, [0.08, 0.2, 1.48], metal, [-1.25, skyY + 0.1, 0])
  box(group, [0.08, 0.2, 1.48], metal, [1.25, skyY + 0.1, 0])
  for (const gx of [-0.62, 0, 0.62]) box(group, [0.04, 0.04, 1.4], metal, [gx, skyY + 0.2, 0])
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(2.42, 1.32)), glass, [0, skyY + 0.19, 0], {
    cast: false,
    receive: false,
    rotation: [-Math.PI / 2, 0, 0],
  })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(2.3, 1.25)), well, [0, skyY + 0.01, 0], {
    cast: false,
    receive: false,
    rotation: [-Math.PI / 2, 0, 0],
  })

  // Solar array on the east half.
  const panels = new THREE.Group()
  panels.position.set(2.45, skyY + 0.02, -0.55)
  group.add(panels)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const panel = new THREE.Group()
      panel.position.set(-0.66 + col * 0.66, 0.1, -0.7 + row * 1.2)
      panel.rotation.x = -0.28
      panels.add(panel)
      box(panel, [0.62, 0.035, 1.0], steel, [0, 0, 0])
      box(panel, [0.58, 0.02, 0.96], solar, [0, 0.02, 0], { cast: false })
      for (let line = 1; line < 4; line++) {
        box(panel, [0.58, 0.004, 0.012], steel, [0, 0.032, -0.48 + line * 0.24], { cast: false })
      }
      box(panel, [0.04, 0.2, 0.04], steel, [0, -0.08, 0.4])
    }
  }

  // Roof vents.
  const vent = disposal.geo(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 10))
  for (const [vx, vz] of [
    [-0.4, 1.6],
    [-0.1, 1.72],
  ] as const) {
    addMesh(group, vent, steel, [vx, skyY + 0.14, vz])
    addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 10)), steel, [vx, skyY + 0.3, vz])
  }

  // Fireplace on the west wall, running up into a stone chimney.
  const fireZ = 0.55
  box(group, [0.5, 1.2, 1.3], hearth, [-2.79, floorY + 0.6, fireZ])
  box(group, [0.32, 1.1, 0.9], hearth, [-2.86, floorY + 1.75, fireZ])
  box(group, [0.08, 0.46, 0.72], metal, [-2.52, floorY + 0.46, fireZ])
  box(group, [0.04, 0.2, 0.5], ember, [-2.5, floorY + 0.34, fireZ], { cast: false })
  box(group, [0.7, 0.06, 1.5], stone, [-2.62, floorY + 0.03, fireZ])
  box(group, [0.62, 0.9, 0.72], hearth, [-2.78, roofY + 0.55, fireZ])
  box(group, [0.78, 0.07, 0.88], hearth, [-2.78, roofY + 1.03, fireZ])
  box(group, [0.2, 0.14, 0.2], metal, [-2.78, roofY + 1.13, fireZ])
  const fireLight = new THREE.PointLight('#ff8a3a', 0.9, 2.6, 2)
  fireLight.position.set(-2.2, floorY + 0.5, fireZ)
  group.add(fireLight)

  // Living room: rug, sofa facing the fire, coffee table, floor lamp.
  box(group, [2.1, 0.012, 1.7], rugMat, [-1.55, floorY + 0.02, 0.35], { cast: false })
  const sofaX = -0.75
  box(group, [0.78, 0.22, 1.8], fabric, [sofaX, floorY + 0.2, 0.35])
  box(group, [0.2, 0.36, 1.8], fabric, [sofaX + 0.3, floorY + 0.48, 0.35])
  for (const arm of [-1, 1]) box(group, [0.78, 0.3, 0.14], fabric, [sofaX, floorY + 0.35, 0.35 + arm * 0.9])
  for (const cz of [-0.25, 0.4, 0.95]) box(group, [0.1, 0.24, 0.3], accent, [sofaX + 0.14, floorY + 0.5, cz], { rotation: [0, 0, 0.25] })
  box(group, [0.55, 0.05, 0.85], oak, [-1.65, floorY + 0.36, 0.35])
  box(group, [0.45, 0.28, 0.7], cedar, [-1.65, floorY + 0.18, 0.35])
  box(group, [0.1, 0.12, 0.1], accent, [-1.6, floorY + 0.45, 0.55], { cast: false })
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.012, 0.012, 1.35, 5)), metal, [sofaX + 0.2, floorY + 0.68, 1.55])
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.1, 0.15, 0.2, 12, 1, true)), glow, [sofaX + 0.2, floorY + 1.4, 1.55], { cast: false })

  // Dining table with four chairs and a pendant.
  const diningX = 0.75
  const diningZ = -0.95
  box(group, [1.35, 0.05, 0.78], oak, [diningX, floorY + 0.72, diningZ])
  for (const [lx, lz] of [
    [-0.6, -0.32],
    [0.6, -0.32],
    [-0.6, 0.32],
    [0.6, 0.32],
  ] as const) {
    box(group, [0.05, 0.7, 0.05], metal, [diningX + lx, floorY + 0.35, diningZ + lz])
  }
  for (const [cx, side] of [
    [-0.32, -1],
    [0.32, -1],
    [-0.32, 1],
    [0.32, 1],
  ] as const) {
    const cz = diningZ + side * 0.55
    box(group, [0.36, 0.04, 0.36], oak, [diningX + cx, floorY + 0.44, cz])
    box(group, [0.36, 0.38, 0.04], oak, [diningX + cx, floorY + 0.64, cz + side * 0.17])
    box(group, [0.3, 0.42, 0.3], metal, [diningX + cx, floorY + 0.21, cz], { cast: false })
  }
  const pendantWire = disposal.geo(new THREE.CylinderGeometry(0.006, 0.006, 0.6, 4))
  const pendantShade = disposal.geo(new THREE.ConeGeometry(0.14, 0.16, 12, 1, true))
  const pendant = (px: number, pz: number) => {
    addMesh(group, pendantWire, metal, [px, roofY - 0.38, pz], { cast: false })
    addMesh(group, pendantShade, metal, [px, roofY - 0.72, pz], { cast: false })
    addMesh(group, disposal.geo(new THREE.SphereGeometry(0.05, 8, 6)), glow, [px, roofY - 0.78, pz], { cast: false })
  }
  pendant(diningX, diningZ)

  // Kitchen: island with stools, back counter, uppers, fridge.
  const islandX = 1.85
  const islandZ = 0.75
  box(group, [1.55, 0.72, 0.62], plaster, [islandX, floorY + 0.36, islandZ])
  box(group, [1.65, 0.05, 0.72], stone, [islandX, floorY + 0.745, islandZ])
  for (const sx of [-0.5, 0, 0.5]) {
    box(group, [0.26, 0.04, 0.26], oak, [islandX + sx, floorY + 0.55, islandZ + 0.55])
    addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.02, 0.03, 0.54, 6)), metal, [islandX + sx, floorY + 0.27, islandZ + 0.55])
    pendant(islandX + sx, islandZ)
  }
  box(group, [0.55, 0.78, 2.3], plaster, [2.72, floorY + 0.39, 0.4])
  box(group, [0.6, 0.05, 2.35], stone, [2.72, floorY + 0.8, 0.4])
  box(group, [0.34, 0.62, 2.3], cedar, [2.85, floorY + 1.72, 0.4])
  box(group, [0.62, 1.85, 0.68], steel, [2.7, floorY + 0.93, -1.45])
  box(group, [0.02, 0.5, 0.02], metal, [2.38, floorY + 1.2, -1.2])

  // Houseplants near the glass.
  const potGeo = disposal.geo(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 10))
  const foliage = disposal.geo(new THREE.IcosahedronGeometry(0.3, 1))
  for (const [px, pz, scale] of [
    [-2.55, -1.6, 1.25],
    [0.1, 1.65, 1],
    [-2.55, 1.65, 0.9],
  ] as const) {
    addMesh(group, potGeo, plaster, [px, floorY + 0.15, pz])
    const crown = addMesh(group, foliage, leaf, [px, floorY + 0.35 + 0.35 * scale, pz])
    crown.scale.set(scale * 0.8, scale * 1.2, scale * 0.8)
  }

  const lamp = new THREE.PointLight('#ffb15e', 2.4, 6, 2)
  lamp.position.set(0.2, 1.8, 0.2)
  group.add(lamp)

  // Lake deck: loose boards, rim joist, glass balustrade with a stair gap.
  const deckTop = 0.36
  const deckNear = -2.08
  const deckFar = -3.9
  const boards = 9
  for (let i = 0; i < boards; i++) {
    const bz = deckNear - 0.1 - i * ((deckNear - deckFar - 0.2) / (boards - 1))
    box(group, [4.6, 0.05, 0.19], deck, [0, deckTop, bz])
  }
  box(group, [4.7, 0.18, 0.06], cedar, [0, deckTop - 0.1, deckFar])
  box(group, [0.06, 0.18, 1.85], cedar, [-2.33, deckTop - 0.1, (deckNear + deckFar) / 2])
  box(group, [0.06, 0.18, 1.85], cedar, [2.33, deckTop - 0.1, (deckNear + deckFar) / 2])
  const railTop = deckTop + 0.9
  const post = disposal.geo(new THREE.BoxGeometry(0.06, 0.9, 0.06))
  const pane = disposal.geo(new THREE.PlaneGeometry(1, 0.72))
  const railRun = (from: [number, number], to: [number, number]) => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1])
    const yaw = Math.atan2(-(to[1] - from[1]), to[0] - from[0])
    const mid: Vec3 = [(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]
    const cap = box(group, [1, 0.05, 0.09], oak, [mid[0], railTop, mid[2]], { rotation: [0, yaw, 0] })
    cap.scale.x = length + 0.06
    const sheet = addMesh(group, pane, railGlass, [mid[0], deckTop + 0.44, mid[2]], {
      cast: false,
      receive: false,
      rotation: [0, yaw, 0],
    })
    sheet.scale.x = length - 0.04
    for (const [px, pz] of [from, to]) addMesh(group, post, metal, [px, deckTop + 0.45, pz])
  }
  railRun([-2.3, deckNear - 0.05], [-2.3, deckFar])
  railRun([2.3, deckNear - 0.05], [2.3, deckFar])
  railRun([-2.3, deckFar], [-0.55, deckFar])
  railRun([0.55, deckFar], [2.3, deckFar])
  box(group, [1.1, 0.06, 0.34], deck, [0, deckTop - 0.14, deckFar - 0.2])
  box(group, [1.1, 0.06, 0.34], deck, [0, deckTop - 0.28, deckFar - 0.5])

  // Two Adirondack chairs and a side table looking out at the water.
  for (const [ax, yaw] of [
    [-1.55, 0.18],
    [-0.75, -0.14],
  ] as const) {
    const chair = new THREE.Group()
    chair.position.set(ax, deckTop + 0.03, -3.05)
    chair.rotation.y = Math.PI + yaw
    group.add(chair)
    box(chair, [0.5, 0.04, 0.5], chairPaint, [0, 0.26, 0.02], { rotation: [-0.12, 0, 0] })
    box(chair, [0.5, 0.62, 0.04], chairPaint, [0, 0.52, -0.28], { rotation: [-0.35, 0, 0] })
    for (const side of [-1, 1]) {
      box(chair, [0.09, 0.03, 0.6], chairPaint, [side * 0.3, 0.42, 0.02])
      box(chair, [0.04, 0.42, 0.04], chairPaint, [side * 0.3, 0.2, 0.26])
      box(chair, [0.04, 0.3, 0.04], chairPaint, [side * 0.26, 0.14, -0.22])
    }
  }
  box(group, [0.3, 0.04, 0.3], oak, [-1.15, deckTop + 0.34, -3.35])
  box(group, [0.2, 0.32, 0.2], cedar, [-1.15, deckTop + 0.16, -3.35])
  addPlanter(group, disposal, cedar, leaf, [1.85, deckTop - 0.02, -3.5])

  // Front entry: stone steps, planter, path bollards.
  box(group, [1.15, 0.06, 0.42], stone, [0.35, 0.14, 2.42])
  box(group, [1.28, 0.06, 0.38], stone, [0.35, 0.08, 2.78])
  addPlanter(group, disposal, cedar, leaf, [2.7, 0, 2.35])
  const bollard = disposal.geo(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8))
  for (const bx of [-0.45, 1.15]) {
    addMesh(group, bollard, metal, [bx, 0.2, 2.75])
    addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.055, 0.055, 0.06, 8)), glow, [bx, 0.36, 2.75], { cast: false })
  }

  // Pier: a boardwalk that steps down the bank, then runs level out over the water.
  const pierStart = deckFar - 0.72
  const pierEnd = -9.4
  const pierWidth = 1.3
  const board = disposal.geo(new THREE.BoxGeometry(pierWidth, 0.05, 0.17))
  const piling = disposal.geo(new THREE.CylinderGeometry(0.065, 0.075, 1, 7))
  const waterTop = WATER_Y - ground + 0.16
  const pierY = (pz: number) => Math.max(terrainHeight(x, z + pz) - ground + 0.2, waterTop)
  const rand = pseudo(7)
  for (let pz = pierStart; pz > pierEnd; pz -= 0.2) {
    const mesh = addMesh(group, board, deck, [0, pierY(pz), pz])
    mesh.rotation.y = (rand() - 0.5) * 0.03
  }
  const stringer = disposal.geo(new THREE.BoxGeometry(0.08, 0.12, 1))
  for (const side of [-1, 1]) {
    for (let pz = pierStart; pz > pierEnd + 0.1; pz -= 0.6) {
      const a = pierY(pz)
      const b = pierY(pz - 0.6)
      const beam = addMesh(group, stringer, cedar, [side * (pierWidth / 2 - 0.06), (a + b) / 2 - 0.08, pz - 0.3])
      beam.rotation.x = Math.atan2(b - a, 0.6)
      beam.scale.z = 0.62
    }
  }
  for (let pz = pierStart - 0.4; pz > pierEnd; pz -= 1.2) {
    const top = pierY(pz)
    const bed = terrainHeight(x, z + pz) - ground - 0.1
    const height = top - bed
    for (const side of [-1, 1]) {
      const pile = addMesh(group, piling, cedar, [side * (pierWidth / 2 + 0.02), bed + height / 2 + 0.06, pz])
      pile.scale.y = height + 0.12
    }
  }
  // End of the pier: ladder, cleats, and a lantern post.
  const endY = pierY(pierEnd + 0.2)
  const cleat = disposal.geo(new THREE.BoxGeometry(0.2, 0.05, 0.06))
  for (const side of [-1, 1]) {
    box(group, [0.06, 0.08, 0.06], steel, [side * 0.5, endY + 0.05, pierEnd + 0.9])
    addMesh(group, cleat, steel, [side * 0.5, endY + 0.1, pierEnd + 0.9])
  }
  const ladderRail = disposal.geo(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6))
  for (const lx of [-0.18, 0.18]) addMesh(group, ladderRail, steel, [lx, endY - 0.2, pierEnd + 0.12])
  for (const ly of [-0.05, -0.28, -0.5]) {
    const rung = addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 5)), steel, [0, endY + ly, pierEnd + 0.12])
    rung.rotation.z = Math.PI / 2
  }
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 7)), metal, [-0.55, endY + 0.45, pierEnd + 0.35])
  box(group, [0.16, 0.2, 0.16], warm, [-0.55, endY + 0.98, pierEnd + 0.35], { cast: false })
  box(group, [0.22, 0.04, 0.22], metal, [-0.55, endY + 1.1, pierEnd + 0.35])

  return {
    label: new THREE.Vector3(x, ground + 3.85, z),
    focus: new THREE.Vector3(x, ground + 1.2, z),
  }
}

/** A planted sedum roof: mottled mat with low clumps, leaving a gravel margin and service paths. */
function addSedumRoof(group: THREE.Group, disposal: Disposal, y: number) {
  const random = pseudo(41)
  const matGeo = new THREE.PlaneGeometry(6.3, 4.35, 42, 30)
  matGeo.rotateX(-Math.PI / 2)
  const position = matGeo.attributes.position
  const colors = new Float32Array(position.count * 3)
  const moss = new THREE.Color('#58743a')
  const rust = new THREE.Color('#9a6b3e')
  const lime = new THREE.Color('#8fa34f')
  const color = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    const px = position.getX(i)
    const pz = position.getZ(i)
    const a = Math.sin(px * 2.3 + Math.sin(pz * 1.7)) * Math.sin(pz * 2.9 - px * 0.6)
    const b = Math.sin(px * 7.1 - pz * 5.3) * 0.5 + 0.5
    color.copy(moss).lerp(lime, Math.max(0, a) * 0.6).lerp(rust, Math.max(0, -a - 0.5) * 0.7)
    color.multiplyScalar(0.85 + b * 0.25)
    colors.set([color.r, color.g, color.b], i * 3)
    position.setY(i, Math.max(0, a) * 0.02 + b * 0.012)
  }
  matGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  matGeo.computeVertexNormals()
  const matMaterial = standard(disposal, { color: '#ffffff', vertexColors: true, roughness: 0.95, metalness: 0 })
  addMesh(group, disposal.geo(matGeo), matMaterial, [0, y, 0], { cast: false })

  // Clumps: skip the skylight, solar racks, chimney and vents.
  const keepClear = (x: number, z: number) =>
    (Math.abs(x) < 1.45 && Math.abs(z) < 0.9) ||
    (x > 1.35 && z > -1.95 && z < 1.3) ||
    (x < -2.25 && Math.abs(z - 0.55) < 0.6) ||
    (x > -0.65 && x < 0.15 && z > 1.35)
  const clump = disposal.geo(new THREE.IcosahedronGeometry(0.06, 1))
  const tints = ['#627f3e', '#7f9249', '#8e6a3f', '#556f37', '#a5a05c']
  const materials = tints.map((tint) => standard(disposal, { color: tint, roughness: 0.9, metalness: 0 }))
  const perMaterial = materials.map(() => [] as THREE.Matrix4[])
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 900; i++) {
    const x = (random() - 0.5) * 6.1
    const z = (random() - 0.5) * 4.2
    if (keepClear(x, z)) continue
    dummy.position.set(x, y + 0.02, z)
    const s = 0.5 + random() * 0.9
    dummy.scale.set(s, s * (0.45 + random() * 0.3), s)
    dummy.rotation.set(0, random() * Math.PI, 0)
    dummy.updateMatrix()
    perMaterial[Math.floor(random() * materials.length)].push(dummy.matrix.clone())
  }
  materials.forEach((material, index) => {
    const matrices = perMaterial[index]
    const mesh = new THREE.InstancedMesh(clump, material, matrices.length)
    matrices.forEach((matrix, m) => mesh.setMatrixAt(m, matrix))
    mesh.receiveShadow = true
    mesh.castShadow = false
    group.add(mesh)
  })
}

function pseudo(seed: number) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}
