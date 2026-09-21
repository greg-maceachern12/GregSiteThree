import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Atlas } from './assets'
import { surfaceMaterial } from './assets'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { FOG, lakeRadius, smoothstep, terrainHeight } from './ground'
import { distanceToPath } from './paths'

const CLEARINGS: Array<[number, number, number]> = [
  [-2.4, 13.2, 8.2],
  [4.8, 14.6, 4.4],
  [14.4, 9.1, 3.8],
  [-12.6, -13.4, 3.8],
  [11.2, -15.4, 4],
  [-3.2, 17.8, 4.8],
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
    const sand = smoothstep(0.86, 0.98, radius) * (1 - smoothstep(1.1, 1.36, radius))
    const dirt = smoothstep(1.35, 0.15, distanceToPath(x, z)) * (1 - sand)
    splat[i * 3] = sand
    splat[i * 3 + 1] = dirt
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(splat, 3))
  geometry.computeVertexNormals()

  const material = surfaceMaterial(disposal, atlas.terrain, { roughness: 1, metalness: 0.02 })
  shadeGround(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  parent.add(mesh)
  addPines(parent, disposal, atlas)
  addGroundCover(parent, disposal, atlas)
  addRocks(parent, disposal, atlas)
  return mesh
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
         vec3 sandColor = vec3(0.92, 0.84, 0.64);
         vec3 dirtColor = vec3(0.48, 0.38, 0.26);
         diffuseColor.rgb = mix(diffuseColor.rgb, sandColor, vSplat.r * 0.94);
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
  const canopy = plantTrees(320, 27, 1.2, 1.1, 1.7, 0.95, 1.7, [])
  const saplings = plantTrees(200, 90, 0.85, 1.08, 1.58, 0.48, 0.85, canopy)
  const trees = [...canopy, ...saplings]
  if (canopy.length < 20) {
    throw new Error(`Expected at least 20 shore pines, found ${canopy.length}`)
  }

  const bark = surfaceMaterial(disposal, atlas.weathered, { roughness: 0.92 })
  const needles = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.94 })
  const trunkGeo = disposal.geo(new THREE.CylinderGeometry(0.035, 0.12, 0.85, 6))
  trunkGeo.translate(0, 0.42, 0)

  placeInstances(parent, trunkGeo, bark, trees, true, (color) => {
    const warm = 0.55 + jitter() * 0.3
    color.setRGB(warm * 0.72, warm * 0.58, warm * 0.42)
  })
  for (let variant = 0; variant < 4; variant++) {
    placeInstances(
      parent,
      pineGeometry(disposal, variant),
      needles,
      trees.filter((tree) => tree.variant === variant),
      true,
      (color) => {
        const shade = 0.58 + jitter() * 0.34
        color.setRGB(shade * 0.72, shade, shade * 0.62)
      },
    )
  }
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
  const grass = scatter(86, 19, 1.08, 1.7, 0.85, 0.72)
  const shrubs = scatter(26, 63, 1.16, 1.62, 1.7, 0.95)
  const flowers = scatter(34, 11, 1.04, 1.3, 0.85, 1)
  const tint = mulberry32(8)

  placeInstances(parent, tuftGeometry(disposal), grassMat, grass, false, (color) => {
    color.setRGB(0.62 + tint() * 0.3, 0.78 + tint() * 0.2, 0.48 + tint() * 0.16)
  })
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
    if (ROCK_KEEP.some(([cx, cz, reach]) => Math.hypot(x - cx, z - cz) < reach)) continue
    if (distanceToPath(x, z) < 1.05) continue
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
  if (items.length === 0) return
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
}

function merged(disposal: Disposal, parts: THREE.BufferGeometry[]) {
  const geometry = mergeGeometries(parts)
  if (!geometry) throw new Error('Unable to merge plant geometry')
  geometry.computeVertexNormals()
  return disposal.geo(geometry)
}

const PINE_TIERS: Array<Array<{ r: number; h: number; y: number; arms: number }>> = [
  [
    { r: 0.92, h: 0.78, y: 1.08, arms: 7 },
    { r: 0.72, h: 0.68, y: 1.5, arms: 6 },
    { r: 0.5, h: 0.58, y: 1.9, arms: 0 },
    { r: 0.32, h: 0.5, y: 2.26, arms: 0 },
    { r: 0.14, h: 0.4, y: 2.58, arms: 0 },
  ],
  [
    { r: 0.58, h: 0.52, y: 0.98, arms: 6 },
    { r: 0.48, h: 0.48, y: 1.3, arms: 0 },
    { r: 0.38, h: 0.44, y: 1.6, arms: 5 },
    { r: 0.28, h: 0.4, y: 1.88, arms: 0 },
    { r: 0.18, h: 0.36, y: 2.14, arms: 0 },
    { r: 0.08, h: 0.3, y: 2.38, arms: 0 },
  ],
  [
    { r: 1.08, h: 0.72, y: 0.98, arms: 8 },
    { r: 0.8, h: 0.62, y: 1.38, arms: 6 },
    { r: 0.5, h: 0.54, y: 1.74, arms: 0 },
    { r: 0.22, h: 0.46, y: 2.08, arms: 0 },
  ],
  [
    { r: 0.46, h: 0.52, y: 0.78, arms: 5 },
    { r: 0.28, h: 0.44, y: 1.1, arms: 0 },
    { r: 0.12, h: 0.34, y: 1.36, arms: 0 },
  ],
]

function pineGeometry(disposal: Disposal, variant: number) {
  const parts: THREE.BufferGeometry[] = []
  for (const tier of PINE_TIERS[variant]) {
    const skirt = new THREE.ConeGeometry(tier.r, tier.h, 8)
    skirt.translate(0, tier.y, 0)
    parts.push(skirt)
    for (let arm = 0; arm < tier.arms; arm++) {
      const branch = new THREE.ConeGeometry(tier.r * 0.2, tier.r * 0.9, 4)
      branch.translate(0, tier.r * 0.42, 0)
      branch.rotateX(1.12)
      branch.rotateY((arm / tier.arms) * Math.PI * 2 + tier.y)
      branch.translate(0, tier.y - tier.h * 0.22, 0)
      parts.push(branch)
    }
  }
  return merged(disposal, parts)
}

function tuftGeometry(disposal: Disposal) {
  const parts = [0, 1, 2].map((i) => {
    const blade = new THREE.ConeGeometry(0.11, 0.52, 4)
    blade.translate((i - 1) * 0.1, 0.26, i === 1 ? 0.06 : -0.03)
    blade.rotateZ((i - 1) * 0.2)
    return blade
  })
  return merged(disposal, parts)
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
