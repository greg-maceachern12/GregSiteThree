import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Atlas } from './assets'
import { surfaceMaterial } from './assets'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { FOG, WATER_Y, lakeRadius, smoothstep, terrainHeight } from './ground'
import { distanceToPath } from './paths'
import { distanceToRiver } from './riverCourse'
import { village } from '../content/village'
import { addWind, birchGeometry, grassGeometry, pineGeometry, trunkGeometry } from './trees'

const CLEARINGS: Array<[number, number, number]> = [
  [-2.4, 13.2, 8.2],
  [4.8, 14.6, 4.4],
  [14.4, 9.1, 3.8],
  [-12.6, -13.4, 3.8],
  [11.2, -15.4, 4],
  [-3.2, 17.8, 4.8],
  [-11.3, 11.4, 3.4],
  [4.0, -17.2, 5.35],
]

const TREE_KEEP: Array<[number, number, number]> = [
  [-2.2, 8.2, 2.6],
  [-12.6, -11.2, 1.8],
  [1.5, -10.6, 2.4],
]

export function buildShore(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const geometry = disposal.geo(new THREE.PlaneGeometry(78, 78, 150, 150))
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    position.setY(i, terrainHeight(position.getX(i), position.getZ(i)))
  }
  const splat = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    const radius = lakeRadius(x, z)
    const height = position.getY(i)
    const sand = smoothstep(0.9, 0.99, radius) * (1 - smoothstep(1.02, 1.09, radius))
    const creek = smoothstep(2.2, 0.5, distanceToRiver(x, z)) * smoothstep(1.0, 1.14, radius)
    const graveyard = Math.hypot((x - 4.0) / 4.8, (z + 17.2) / 3.5)
    const clearing = 1 - smoothstep(0.9, 1.2, graveyard)
    const dirt = Math.max(smoothstep(1.35, 0.15, distanceToPath(x, z)), clearing * 0.8) *
      (1 - Math.max(sand, creek))
    // Damp, darker band just above the waterline.
    const wet = (1 - smoothstep(0.02, 0.2, height - WATER_Y)) * Math.max(sand, creek * 0.8)
    splat[i * 3] = Math.min(1, sand + creek * 0.7)
    splat[i * 3 + 1] = dirt
    splat[i * 3 + 2] = wet
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(splat, 3))
  geometry.computeVertexNormals()

  const material = surfaceMaterial(disposal, atlas.terrain, { roughness: 1, metalness: 0.02 })
  shadeGround(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  parent.add(mesh)
  const trees = addPines(parent, disposal, atlas)
  const specialTree = addBirches(parent, disposal, trees)
  addGrass(parent, disposal)
  addGroundCover(parent, disposal, atlas)
  addRocks(parent, disposal, atlas)
  return { mesh, specialTree }
}

const fogColor = new THREE.Color(FOG)

function shadeGround(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: fogColor }
    shader.uniforms.uRimStart = { value: 22 }
    shader.uniforms.uRimEnd = { value: 33 }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute vec3 color;
         varying vec3 vSplat;
         varying vec3 vRimWorld;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vSplat = color;
         vRimWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vSplat;
         varying vec3 vRimWorld;
         uniform vec3 uRimColor;
         uniform float uRimStart;
         uniform float uRimEnd;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec3 sandColor = vec3(0.72, 0.63, 0.47);
         vec3 wetColor = vec3(0.44, 0.39, 0.31);
         vec3 dirtColor = vec3(0.48, 0.38, 0.26);
         float grain = 0.9 + diffuseColor.g * 0.25;
         // Broad patches of lusher and drier turf so the lawns aren't one flat green.
         vec2 cell = vRimWorld.xz * 0.23;
         float patchy = sin(cell.x * 1.7 + sin(cell.y * 1.3)) * sin(cell.y * 1.9 + sin(cell.x * 0.8));
         float fine = sin(vRimWorld.x * 2.9 + vRimWorld.z * 1.7) * sin(vRimWorld.z * 3.3 - vRimWorld.x * 1.1);
         vec3 lush = diffuseColor.rgb * vec3(0.72, 0.86, 0.64);
         vec3 dry = diffuseColor.rgb * vec3(1.02, 0.96, 0.7);
         diffuseColor.rgb = mix(lush, dry, smoothstep(-0.6, 0.8, patchy) * 0.8) * (0.94 + fine * 0.06);
         diffuseColor.rgb = mix(diffuseColor.rgb, sandColor * grain, vSplat.r * 0.92);
         diffuseColor.rgb = mix(diffuseColor.rgb, wetColor * grain, vSplat.b * 0.8);
         diffuseColor.rgb = mix(diffuseColor.rgb, dirtColor, vSplat.g * 0.55);`,
      )
      .replace(
        '#include <fog_fragment>',
        `float rim = smoothstep(uRimStart, uRimEnd, length(vRimWorld.xz));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, uRimColor, rim);
         #include <fog_fragment>`,
      )
  }
  material.customProgramCacheKey = () => 'ground-splat-rim'
}

type TreeSpot = {
  x: number
  z: number
  scale: number
  yaw: number
  leaf: boolean
  variant: number
  sx: number
  sy: number
  sz: number
}

function addPines(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const jitter = mulberry32(44)
  const canopy = [
    ...plantTrees(320, 27, 1.2, 1.1, 1.7, 0.95, 1.7, []),
    ...[
      [-1.6, -16.0, 1.25], [-1.5, -19.1, 1.45], [-0.3, -22.0, 1.2],
      [9.5, -16.1, 1.3], [9.6, -19.2, 1.45], [8.5, -22.0, 1.15],
    ].map(([x, z, scale], index): TreeSpot => ({
      x, z, scale, yaw: index * 1.37, leaf: false, variant: index % 3,
      sx: scale, sy: scale * 1.08, sz: scale,
    })),
  ]
  const saplings = plantTrees(200, 90, 0.85, 1.08, 1.58, 0.48, 0.85, canopy)
  const trees = [...canopy, ...saplings]
  if (canopy.length < 20) {
    throw new Error(`Expected at least 20 shore pines, found ${canopy.length}`)
  }

  const bark = surfaceMaterial(disposal, atlas.darkWood, { color: '#8a6a52', roughness: 0.92 })
  const needles = standard(disposal, { color: '#ffffff', vertexColors: true, roughness: 0.86, metalness: 0 })
  addWind(needles, 0.006, 'pine')

  placeInstances(parent, trunkGeometry(disposal, 0.95, 0.12), bark, trees, true, (color) => {
    const warm = 0.75 + jitter() * 0.3
    color.setRGB(warm, warm * 0.92, warm * 0.84)
  })
  for (let variant = 0; variant < 4; variant++) {
    placeInstances(
      parent,
      pineGeometry(disposal, variant),
      needles,
      trees.filter((tree) => tree.variant === variant),
      true,
      (color) => {
        const k = 0.8 + jitter() * 0.24
        const hue = jitter()
        color.setRGB(k * (0.88 + hue * 0.22), k, k * (0.84 + (1 - hue) * 0.26))
      },
    )
  }
  return trees
}

function addBirches(parent: THREE.Object3D, disposal: Disposal, pines: TreeSpot[]) {
  const birches = plantTrees(48, 131, 1.3, 1.1, 1.48, 0.8, 1.15, pines)
  const selected = birches.reduce((best, tree) =>
    Math.hypot(tree.x - 1.5, tree.z - 15.6) < Math.hypot(best.x - 1.5, best.z - 15.6) ? tree : best)
  const parts: Array<{ mesh: THREE.InstancedMesh; index: number }> = []
  const leaves = standard(disposal, { color: '#ffffff', vertexColors: true, roughness: 0.82, metalness: 0 })
  addWind(leaves, 0.012, 'birch')
  const bark = standard(disposal, { color: '#ffffff', vertexColors: true, roughness: 0.7, metalness: 0 })
  const tint = mulberry32(12)
  for (let variant = 0; variant < 3; variant++) {
    const { crown, trunk } = birchGeometry(disposal, 300 + variant * 17)
    const group = birches.filter((_, index) => index % 3 === variant)
    const trunkMesh = placeInstances(parent, trunk, bark, group, true, (color) => color.setRGB(1, 1, 1))
    const crownMesh = placeInstances(parent, crown, leaves, group, true, (color) => {
      const k = 0.85 + tint() * 0.3
      color.setRGB(k * (0.95 + tint() * 0.12), k, k * 0.9)
    })
    if (group.includes(selected)) {
      const index = group.indexOf(selected)
      if (trunkMesh) parts.push({ mesh: trunkMesh, index })
      if (crownMesh) parts.push({ mesh: crownMesh, index })
    }
  }
  const dummy = new THREE.Object3D()
  let lastSway = NaN
  return {
    position: new THREE.Vector3(selected.x, terrainHeight(selected.x, selected.z) + selected.sy, selected.z),
    sway(amount: number) {
      if (Math.abs(amount - lastSway) < 0.0001) return
      lastSway = amount
      dummy.position.set(selected.x, terrainHeight(selected.x, selected.z), selected.z)
      dummy.rotation.set(amount, selected.yaw, amount * 0.7)
      dummy.scale.set(selected.sx, selected.sy, selected.sz)
      dummy.updateMatrix()
      for (const { mesh, index } of parts) {
        mesh.setMatrixAt(index, dummy.matrix)
        mesh.instanceMatrix.needsUpdate = true
      }
    },
  }
}

/** Footprints where a building, deck, or stage sits, so grass doesn't poke through floors. */
const BUILT: Array<[number, number, number, number]> = [
  [-6.1, 1.3, 8.9, 15.8],
  [0.3, 7.7, -19.6, -14.8],
  [2.4, 7.4, 13.1, 16.0],
  [12.2, 16.6, 7.4, 11.4],
  [-14.6, -10.6, -15.2, -11.0],
  [9.0, 13.4, -17.2, -13.4],
  [0.7, 2.3, -14.6, -11.6],
]

function addGrass(parent: THREE.Object3D, disposal: Disposal) {
  const rand = mulberry32(2024)
  const spots: TreeSpot[] = []
  let guard = 0
  while (spots.length < 6500 && guard < 60000) {
    guard += 1
    const x = (rand() * 2 - 1) * 24
    const z = (rand() * 2 - 1) * 22
    if (Math.hypot(x, z) > 24) continue
    const radius = lakeRadius(x, z)
    if (radius < 1.045 + rand() * 0.04) continue
    if (BUILT.some(([x0, x1, z0, z1]) => x > x0 && x < x1 && z > z0 && z < z1)) continue
    if (Math.hypot((x - 4.0) / 4.8, (z + 17.2) / 3.5) < 1.15) continue
    if (village.some(({ position: [cx, cz] }) => Math.hypot(x - cx, z - cz) < 0.75)) continue
    if (distanceToPath(x, z) < 0.55) continue
    if (distanceToRiver(x, z) < 1.5) continue
    const scale = 0.7 + rand() * 0.7
    spots.push({ x, z, scale, yaw: rand() * Math.PI * 2, leaf: false, variant: 0, sx: scale, sy: scale * (0.8 + rand() * 0.5), sz: scale })
  }
  const material = standard(disposal, { color: '#ffffff', vertexColors: true, roughness: 0.92, metalness: 0 })
  material.side = THREE.DoubleSide
  addWind(material, 0.5, 'grass')
  const tint = mulberry32(77)
  placeInstances(parent, grassGeometry(disposal), material, spots, false, (color) => {
    const k = 0.8 + tint() * 0.35
    const dry = tint()
    color.setRGB(k * (0.9 + dry * 0.25), k, k * (0.85 - dry * 0.15))
  })
}

function plantTrees(
  count: number,
  seed: number,
  spacing: number,
  minRadius: number,
  maxRadius: number,
  minScale: number,
  maxScale: number,
  avoid: TreeSpot[],
) {
  const rand = mulberry32(seed)
  const spots: TreeSpot[] = []
  let guard = 0
  while (spots.length < count && guard < 40000) {
    guard += 1
    const x = (rand() * 2 - 1) * 32
    const z = (rand() * 2 - 1) * 28
    const radius = lakeRadius(x, z)
    if (radius < minRadius || radius > maxRadius) continue
    if (CLEARINGS.some(([cx, cz, reach]) => Math.hypot(x - cx, z - cz) < reach)) continue
    if (TREE_KEEP.some(([cx, cz, reach]) => Math.hypot(x - cx, z - cz) < reach)) continue
    if (distanceToPath(x, z) < 1.35) continue
    if (distanceToRiver(x, z) < 1.85) continue
    if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < spacing)) continue
    if (avoid.some((spot) => Math.hypot(spot.x - x, spot.z - z) < spacing * 0.72)) continue
    const scale = minScale + rand() * (maxScale - minScale)
    const thick = 0.86 + rand() * 0.28
    spots.push({
      x,
      z,
      scale,
      yaw: rand() * Math.PI * 2,
      leaf: false,
      variant: avoid.length === 0 ? spots.length % 3 : 3,
      sx: scale * thick,
      sy: scale * (0.88 + rand() * 0.28),
      sz: scale * thick,
    })
  }
  return spots
}

function addGroundCover(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const grassMat = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.95 })
  const shrubMat = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.88 })
  const petal = standard(disposal, { color: '#ffffff', roughness: 0.7, metalness: 0.02 })
  const shrubs = scatter(26, 63, 1.16, 1.62, 1.7, 0.95)
  const flowers = scatter(34, 11, 1.04, 1.3, 0.85, 1)
  const tint = mulberry32(8)

  placeInstances(parent, shrubGeometry(disposal), shrubMat, shrubs, true, (color) => {
    color.setRGB(0.7 + tint() * 0.25, 0.82 + tint() * 0.16, 0.52 + tint() * 0.14)
  })
  placeInstances(parent, flowerStem(disposal), grassMat, flowers, false, (color) => {
    color.setRGB(0.7, 0.82, 0.5)
  })
  const flowerColors = ['#f2d7de', '#f0e2b0', '#efe8dc', '#e7b7c6']
  placeInstances(parent, flowerHead(disposal), petal, flowers, false, (color, index) => {
    color.set(flowerColors[index % flowerColors.length])
    color.offsetHSL(0, (tint() - 0.5) * 0.08, (tint() - 0.5) * 0.06)
  })
}

function scatter(count: number, seed: number, minRadius: number, maxRadius: number, spacing: number, keep: number) {
  const rand = mulberry32(seed)
  const spots: TreeSpot[] = []
  let guard = 0
  while (spots.length < count && guard < count * 90) {
    guard += 1
    const x = (rand() * 2 - 1) * 30
    const z = (rand() * 2 - 1) * 30
    const radius = lakeRadius(x, z)
    if (radius < minRadius || radius > maxRadius) continue
    if (CLEARINGS.some(([cx, cz, reach]) => Math.hypot(x - cx, z - cz) < reach * keep)) continue
    if (x > 0.2 && x < 7.8 && z > -19.7 && z < -14.7) continue
    if (ROCK_KEEP.some(([cx, cz, reach]) => Math.hypot(x - cx, z - cz) < reach)) continue
    if (distanceToPath(x, z) < 1.05) continue
    if (distanceToRiver(x, z) < 1.45) continue
    if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < spacing)) continue
    const scale = 0.75 + rand() * 0.55
    spots.push({
      x,
      z,
      scale,
      yaw: rand() * Math.PI * 2,
      leaf: false,
      variant: 0,
      sx: scale * (0.85 + rand() * 0.3),
      sy: scale * (0.8 + rand() * 0.45),
      sz: scale * (0.85 + rand() * 0.3),
    })
  }
  return spots
}

function placeInstances(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  items: TreeSpot[],
  shadows: boolean,
  tint: (color: THREE.Color, index: number) => void,
) {
  if (items.length === 0) return undefined
  const mesh = new THREE.InstancedMesh(geometry, material, items.length)
  mesh.castShadow = shadows
  mesh.receiveShadow = true
  mesh.frustumCulled = false
  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  items.forEach((item, index) => {
    dummy.position.set(item.x, terrainHeight(item.x, item.z), item.z)
    dummy.rotation.set(0, item.yaw, 0)
    dummy.scale.set(item.sx, item.sy, item.sz)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
    tint(color, index)
    mesh.setColorAt(index, color)
  })
  parent.add(mesh)
  return mesh
}

function merged(disposal: Disposal, parts: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(parts)
  if (!geometry) throw new Error('Unable to merge plant geometry')
  geometry.computeVertexNormals()
  return disposal.geo(geometry)
}

function shrubGeometry(disposal: Disposal) {
  const crown = new THREE.IcosahedronGeometry(0.36, 0)
  crown.scale(1.2, 0.72, 1.05)
  crown.translate(0, 0.28, 0)
  return merged(disposal, [crown])
}

function flowerStem(disposal: Disposal) {
  const stem = new THREE.CylinderGeometry(0.016, 0.022, 0.24, 4)
  stem.translate(0, 0.12, 0)
  return disposal.geo(stem)
}

function flowerHead(disposal: Disposal) {
  const head = new THREE.SphereGeometry(0.09, 6, 5)
  head.translate(0, 0.28, 0)
  return disposal.geo(head)
}

const ROCK_KEEP: Array<[number, number, number]> = [
  [-2.4, 13.2, 2.4],
  [-2.2, 8.4, 1.8],
  [4.8, 14.6, 2.2],
  [14.4, 9.1, 2.6],
  [-12.6, -13.4, 2.4],
  [-12.6, -11.2, 1.5],
  [1.5, -11.6, 2.2],
  [11.2, -15.4, 2.6],
  [-0.6, 16.2, 1.3],
  [-11.3, 11.4, 2.9],
]

function addRocks(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const rand = mulberry32(91)
  const spots: Array<{ x: number; z: number; scale: number; yaw: number; variant: number }> = []
  let guard = 0
  while (spots.length < 42 && guard < 7000) {
    guard += 1
    const x = (rand() * 2 - 1) * 22
    const z = (rand() * 2 - 1) * 20
    const radius = lakeRadius(x, z)
    if (radius < 1.0 || radius > 1.18) continue
    const cluster = Math.sin(x * 0.85 + 1.7) * Math.cos(z * 0.73 + 0.4)
    if (cluster < 0.15) continue
    if (ROCK_KEEP.some(([cx, cz, reach]) => Math.hypot(x - cx, z - cz) < reach)) continue
    if (distanceToPath(x, z) < 1.15) continue
    if (distanceToRiver(x, z) < 1.7) continue
    if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < 1.15)) continue
    spots.push({
      x,
      z,
      scale: 0.55 + rand() * 0.7,
      yaw: rand() * Math.PI * 2,
      variant: Math.floor(rand() * 3),
    })
  }

  const stone = surfaceMaterial(disposal, atlas.limestone, {
    color: '#a89e90',
    roughness: 0.92,
  })
  const geometries = [0, 1, 2].map((variant) => rockGeometry(disposal, 40 + variant))
  const dummy = new THREE.Object3D()
  geometries.forEach((geometry, variant) => {
    const group = spots.filter((spot) => spot.variant === variant)
    if (group.length === 0) return
    const mesh = new THREE.InstancedMesh(geometry, stone, group.length)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.forEach((spot, index) => {
      const y = terrainHeight(spot.x, spot.z) - spot.scale * 0.08
      dummy.position.set(spot.x, y, spot.z)
      dummy.rotation.set(rand() * 0.4, spot.yaw, rand() * 0.3)
      dummy.scale.set(spot.scale, spot.scale * (0.55 + rand() * 0.35), spot.scale * (0.8 + rand() * 0.35))
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    })
    parent.add(mesh)
  })
}

function rockGeometry(disposal: Disposal, seed: number) {
  const geometry = disposal.geo(new THREE.IcosahedronGeometry(0.45, 0))
  const position = geometry.attributes.position
  const rand = mulberry32(seed)
  for (let i = 0; i < position.count; i++) {
    position.setXYZ(
      i,
      position.getX(i) * (0.7 + rand() * 0.55),
      position.getY(i) * (0.45 + rand() * 0.35),
      position.getZ(i) * (0.75 + rand() * 0.45),
    )
  }
  geometry.computeVertexNormals()
  return geometry
}

function mulberry32(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
