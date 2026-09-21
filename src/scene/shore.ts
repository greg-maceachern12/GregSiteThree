import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Atlas } from './assets'
import { surfaceMaterial } from './assets'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { FOG, lakeRadius, smoothstep, terrainHeight } from './ground'
import { distanceToPath } from './paths'

const CLEARINGS: Array<[number, number, number]> = [
  [-2.4, 13.2, 10.5],
  [4.8, 14.6, 4.2],
  [14.4, 9.1, 3.4],
  [-12.6, -13.4, 3.4],
  [11.2, -15.4, 3.6],
  [-3.2, 17.8, 5.8],
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
  const rand = mulberry32(27)
  const spots: Array<{ x: number; z: number; scale: number; yaw: number }> = []
  let guard = 0
  while (spots.length < 32 && guard < 5000) {
    guard += 1
    const x = (rand() * 2 - 1) * 30
    const z = (rand() * 2 - 1) * 30
    const radius = lakeRadius(x, z)
    if (radius < 1.08 || radius > 1.58) continue
    if (CLEARINGS.some(([cx, cz, reach]) => Math.hypot(x - cx, z - cz) < reach)) continue
    if (distanceToPath(x, z) < 1.5) continue
    if (spots.some((spot) => Math.hypot(spot.x - x, spot.z - z) < 1.65)) continue
    spots.push({ x, z, scale: 0.78 + rand() * 0.5, yaw: rand() * Math.PI * 2 })
  }
  if (spots.length < 20) {
    throw new Error(`Expected at least 20 shore pines, found ${spots.length}`)
  }

  const jitter = mulberry32(44)
  let leaves = 0
  let pines = 0
  const trees: TreeSpot[] = spots.map((spot, index) => {
    const leaf = index % 6 === 0
    const variant = leaf ? leaves++ % 3 : pines++ % 4
    const thick = 0.9 + jitter() * 0.22
    return {
      ...spot,
      leaf,
      variant,
      sx: spot.scale * thick,
      sy: spot.scale * (0.9 + jitter() * 0.22),
      sz: spot.scale * thick,
    }
  })

  const bark = surfaceMaterial(disposal, atlas.weathered, { roughness: 0.9 })
  const needles = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.92 })
  const canopy = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.84 })
  const blossom = standard(disposal, { color: '#f3c4cf', roughness: 0.64, metalness: 0.02 })
  const trunkGeo = disposal.geo(new THREE.CylinderGeometry(0.05, 0.14, 1.05, 6))
  trunkGeo.translate(0, 0.52, 0)

  placeInstances(parent, trunkGeo, bark, trees, true, (color, index) => {
    const warm = 0.72 + jitter() * 0.28
    color.setRGB(warm, warm * 0.9, warm * 0.72)
    void index
  })

  for (let variant = 0; variant < 4; variant++) {
    const group = trees.filter((tree) => !tree.leaf && tree.variant === variant)
    placeInstances(parent, coniferGeometry(disposal, variant), needles, group, true, (color) => {
      color.setRGB(0.72 + jitter() * 0.28, 0.8 + jitter() * 0.2, 0.62 + jitter() * 0.16)
    })
  }
  for (let variant = 0; variant < 3; variant++) {
    const group = trees.filter((tree) => tree.leaf && tree.variant === variant)
    placeInstances(parent, deciduousGeometry(disposal, variant), canopy, group, true, (color) => {
      color.setRGB(0.86 + jitter() * 0.14, 0.9 + jitter() * 0.1, 0.55 + jitter() * 0.18)
    })
  }
  placeInstances(
    parent,
    blossomGeometry(disposal),
    blossom,
    trees.filter((tree) => tree.leaf && tree.variant === 2),
    true,
    (color) => {
      color.setRGB(1, 0.78 + jitter() * 0.18, 0.8 + jitter() * 0.12)
    },
  )
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

function coniferGeometry(disposal: Disposal, variant: number) {
  const cones: Array<[number, number, number]> =
    variant === 0
      ? [
          [0.58, 1.05, 1.4],
          [0.4, 0.85, 2.1],
        ]
      : variant === 1
        ? [
            [0.74, 0.72, 1.2],
            [0.52, 0.62, 1.7],
            [0.3, 0.5, 2.12],
          ]
        : variant === 2
          ? [[0.46, 1.2, 1.55]]
          : [[0.4, 0.78, 1.2]]
  const parts: THREE.BufferGeometry[] = cones.map(([radius, height, y]) => {
    const cone = new THREE.ConeGeometry(radius, height, variant === 2 ? 5 : 7)
    cone.translate(0, y, 0)
    return cone
  })
  const cards = variant === 2 ? 5 : variant === 3 ? 2 : 3
  const reach = variant === 1 ? 0.68 : 0.52
  for (let i = 0; i < cards; i++) {
    const box = new THREE.BoxGeometry(0.18, 0.4, 0.045)
    box.translate(0, 0, reach)
    box.rotateY((i / cards) * Math.PI + variant * 0.4)
    box.translate(0, 1.2 + (i % 3) * 0.28, 0)
    parts.push(box)
  }
  return merged(disposal, parts)
}

function deciduousGeometry(disposal: Disposal, variant: number) {
  const parts: THREE.BufferGeometry[] = []
  if (variant === 0) {
    const crown = new THREE.IcosahedronGeometry(0.62, 0)
    crown.scale(1.08, 0.82, 1)
    crown.translate(0, 1.85, 0)
    parts.push(crown)
  } else if (variant === 1) {
    const left = new THREE.IcosahedronGeometry(0.48, 0)
    left.scale(1.15, 0.9, 1)
    left.translate(-0.24, 1.72, 0.06)
    const right = new THREE.IcosahedronGeometry(0.4, 0)
    right.scale(0.95, 1.08, 0.9)
    right.translate(0.28, 2.08, -0.08)
    parts.push(left, right)
  } else {
    const crown = new THREE.IcosahedronGeometry(0.68, 0)
    crown.scale(1.22, 0.7, 1.08)
    crown.translate(0, 1.75, 0)
    parts.push(crown)
  }
  return merged(disposal, parts)
}

function blossomGeometry(disposal: Disposal) {
  const parts = [
    [0.36, 2.08, 0.12],
    [-0.42, 1.86, 0.18],
    [0.08, 1.68, -0.4],
    [0.18, 2.16, -0.16],
  ].map(([x, y, z]) => {
    const puff = new THREE.SphereGeometry(0.12, 6, 5)
    puff.translate(x, y, z)
    return puff
  })
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
