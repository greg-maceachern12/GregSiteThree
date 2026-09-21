import * as THREE from 'three'
import type { Atlas } from './assets'
import { surfaceMaterial } from './assets'
import type { Disposal } from './disposal'
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

  const trunkGeo = disposal.geo(new THREE.CylinderGeometry(0.08, 0.12, 0.8, 6))
  trunkGeo.translate(0, 0.4, 0)
  const crownGeo = disposal.geo(new THREE.ConeGeometry(0.58, 1.65, 7))
  crownGeo.translate(0, 1.55, 0)
  const bark = surfaceMaterial(disposal, atlas.weathered)
  const needles = surfaceMaterial(disposal, atlas.foliage, { roughness: 0.92 })
  const trunks = new THREE.InstancedMesh(trunkGeo, bark, spots.length)
  const crowns = new THREE.InstancedMesh(crownGeo, needles, spots.length)
  trunks.castShadow = true
  trunks.receiveShadow = true
  crowns.castShadow = true
  crowns.receiveShadow = true
  const dummy = new THREE.Object3D()
  spots.forEach((spot, index) => {
    dummy.position.set(spot.x, terrainHeight(spot.x, spot.z), spot.z)
    dummy.rotation.set(0, spot.yaw, 0)
    dummy.scale.set(spot.scale, spot.scale, spot.scale)
    dummy.updateMatrix()
    trunks.setMatrixAt(index, dummy.matrix)
    crowns.setMatrixAt(index, dummy.matrix)
  })
  parent.add(trunks, crowns)
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
