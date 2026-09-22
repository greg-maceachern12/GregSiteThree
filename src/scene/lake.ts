import * as THREE from 'three'
import type { Atlas } from './assets'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { surfaceMaterial } from './assets'
import { LAKE_CZ, LAKE_RX, LAKE_RZ, WATER_BOUNDS, WATER_Y, lakeRadius, terrainHeight } from './ground'
import {
  REFLECT_PARS_FRAGMENT,
  REFLECT_PARS_VERTEX,
  REFLECT_VERTEX,
  reflectFragment,
  reflectionUniforms,
} from './reflection'

export type Animate = (update: (time: number) => void) => void

/** How far past the shoreline the surface runs; the terrain clips it into an organic edge. */
const EDGE_RADIUS = 1.1

export function buildLake(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const steps = 160
  const rings = 44
  const positions: number[] = []
  const uvs: number[] = []
  const water: number[] = []
  const indices: number[] = []
  const spanX = WATER_BOUNDS.maxX - WATER_BOUNDS.minX
  const spanZ = WATER_BOUNDS.maxZ - WATER_BOUNDS.minZ

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2
    const cx = Math.cos(angle)
    const cz = Math.sin(angle)
    let edge = EDGE_RADIUS
    for (let attempt = 0; attempt < 10; attempt++) {
      const x = cx * LAKE_RX * edge
      const z = LAKE_CZ + cz * LAKE_RZ * edge
      edge *= EDGE_RADIUS / Math.max(0.2, lakeRadius(x, z))
    }
    for (let j = 0; j <= rings; j++) {
      // Rings bunch toward the shore, where the depth changes quickly.
      const f = 1 - (1 - j / rings) ** 2.2
      const x = cx * LAKE_RX * edge * f
      const z = LAKE_CZ + cz * LAKE_RZ * edge * f
      positions.push(x, 0, z)
      uvs.push((x - WATER_BOUNDS.minX) / spanX, (z - WATER_BOUNDS.minZ) / spanZ)
      water.push(WATER_Y - terrainHeight(x, z), lakeRadius(x, z))
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < rings; j++) {
      const a = i * (rings + 1) + j
      const b = (i + 1) * (rings + 1) + j
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const geometry = disposal.geo(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('water', new THREE.Float32BufferAttribute(water, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const material = waterMaterial(disposal, atlas)
  shadeWater(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = WATER_Y
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

export function waterMaterial(disposal: Disposal, atlas: Atlas) {
  const material = standard(disposal, {
    color: '#ffffff',
    normalMap: atlas.waterNormal,
    normalScale: new THREE.Vector2(0.3, 0.3),
    roughness: 0.28,
    metalness: 0,
    envMapIntensity: 0.45,
  })
  material.fog = false
  return material
}

export function setWaterTime(mesh: THREE.Mesh, time: number) {
  const material = mesh.material
  if (Array.isArray(material)) return
  const shader = material.userData.shader as { uniforms: { uTime: { value: number } } } | undefined
  if (shader) shader.uniforms.uTime.value = time
}

/** Expects `vWater` (x: depth below the surface, y: lake radius) and `uTime`. */
export const WATER_COLOR_CHUNK = `#include <color_fragment>
         float depth = max(vWater.x, 0.0);
         vec3 shallow = vec3(0.50, 0.71, 0.62);
         vec3 mid = vec3(0.14, 0.47, 0.50);
         vec3 deep = vec3(0.055, 0.25, 0.32);
         vec3 abyss = vec3(0.035, 0.17, 0.25);
         vec3 water = mix(shallow, mid, smoothstep(0.015, 0.26, depth));
         water = mix(water, deep, smoothstep(0.26, 0.7, depth));
         water = mix(water, abyss, smoothstep(0.82, 0.25, vWater.y) * 0.75);
         float drift = texture2D(normalMap, vNormalMapUv * 0.31 + vec2(uTime * 0.005, uTime * 0.003)).x;
         water *= 0.92 + drift * 0.16;
         float shoal = 1.0 - smoothstep(0.0, 0.07, depth);
         water = mix(water, vec3(0.74, 0.73, 0.58), shoal * 0.42);
         float lap = 0.5 + 0.5 * sin(uTime * 1.3 + vWater.y * 70.0);
         float foamLine = 1.0 - smoothstep(0.0, 0.03 + lap * 0.025, depth);
         float foamNoise = texture2D(normalMap, vNormalMapUv * 4.3 + vec2(uTime * 0.05, -uTime * 0.03)).y;
         float foam = foamLine * smoothstep(0.34, 0.66, foamNoise * 0.7 + foamLine * 0.45);
         water = mix(water, vec3(0.95, 0.96, 0.93), foam * 0.9);
         diffuseColor.rgb = water;`

export const WATER_ROUGHNESS_CHUNK = `#include <roughnessmap_fragment>
         roughnessFactor = mix(roughnessFactor, 0.62, foam);`

export const WATER_NORMAL_CHUNK = `vec2 uvA = vNormalMapUv * 0.8 + flowA;
         vec2 uvB = mat2(0.8, -0.6, 0.6, 0.8) * vNormalMapUv * 1.9 + flowB;
         vec2 uvC = mat2(0.28, 0.96, -0.96, 0.28) * vNormalMapUv * 4.6 + flowC;
         vec3 nA = texture2D(normalMap, uvA).xyz * 2.0 - 1.0;
         vec3 nB = texture2D(normalMap, uvB).xyz * 2.0 - 1.0;
         vec3 nC = texture2D(normalMap, uvC).xyz * 2.0 - 1.0;
         vec3 mapN = normalize(vec3(nA.xy * 0.6 + nB.xy * 0.75 + nC.xy * 0.45, 1.0));
         mapN.xy *= normalScale * (0.35 + 0.65 * smoothstep(0.0, 0.2, vWater.x));
         normal = normalize(tbn * mapN);`

// Fine, broken crests give the lake the sunlit texture of small wind ripples.
// The two moving bands and the normal-map mask avoid a regular striped pattern.
const LAKE_GLINT_CHUNK = `vec2 glintWarp = texture2D(normalMap, vNormalMapUv * 1.6 + vec2(uTime * 0.009, -uTime * 0.006)).xy * 2.0 - 1.0;
         vec2 glintUv = vNormalMapUv + glintWarp * 0.018;
         float crestA = sin(glintUv.y * 150.0 + glintUv.x * 27.0 - uTime * 1.7);
         float crestB = sin(glintUv.y * 225.0 - glintUv.x * 43.0 + uTime * 2.3);
         float breakup = texture2D(normalMap, glintUv * 8.7 + vec2(-uTime * 0.018, uTime * 0.012)).x;
         float gaps = smoothstep(0.0, 0.8, sin(glintUv.x * 95.0 + glintWarp.y * 7.0 + sin(glintUv.y * 24.0)));
         float fineGlints = pow(max(crestA, 0.0), 14.0) * smoothstep(0.44, 0.55, breakup) * gaps;
         fineGlints += pow(max(crestB, 0.0), 19.0) * smoothstep(0.47, 0.58, breakup) * (1.0 - gaps * 0.5);
         float glint = clamp(fineGlints * (0.35 + 0.65 * smoothstep(0.35, 2.7, vNormalMapUv.y)), 0.0, 1.0);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.96, 0.96), glint * 0.6);`

function shadeWater(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    Object.assign(shader.uniforms, reflectionUniforms)
    material.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute vec2 water;
         varying vec2 vWater;
         ${REFLECT_PARS_VERTEX}`,
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         vWater = water;`,
      )
      .replace('#include <project_vertex>', REFLECT_VERTEX)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec2 vWater;
         uniform float uTime;
         ${REFLECT_PARS_FRAGMENT}`,
      )
      .replace('#include <opaque_fragment>', reflectFragment('1.0', 'glint', '0.45'))
      .replace('#include <color_fragment>', `${WATER_COLOR_CHUNK}\n         ${LAKE_GLINT_CHUNK}`)
      .replace('#include <roughnessmap_fragment>', WATER_ROUGHNESS_CHUNK)
      .replace(
        '#include <normal_fragment_maps>',
        `vec2 flowA = vec2(uTime * 0.014, uTime * 0.008);
         vec2 flowB = vec2(-uTime * 0.019, uTime * 0.015);
         vec2 flowC = vec2(uTime * 0.027, -uTime * 0.018);
         ${WATER_NORMAL_CHUNK}`,
      )
  }
  material.customProgramCacheKey = () => 'lake-water'
}

/** Soft rings that drift outward from anything sitting on the surface. */
function rippleTexture(disposal: Disposal) {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.72, 'rgba(255,255,255,0.25)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return disposal.tex(texture)
}

export function addRipples(
  parent: THREE.Object3D,
  disposal: Disposal,
  animate: Animate,
  spots: Array<[number, number, number]>,
) {
  const map = rippleTexture(disposal)
  const geometry = disposal.geo(new THREE.PlaneGeometry(1, 1))
  geometry.rotateX(-Math.PI / 2)
  spots.forEach(([x, z, size], index) => {
    for (let ring = 0; ring < 2; ring++) {
      const material = disposal.mat(
        new THREE.MeshBasicMaterial({
          map,
          transparent: true,
          depthWrite: false,
          opacity: 0,
          color: '#eef6f2',
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        }),
      )
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.set(x, WATER_Y + 0.012, z)
      mesh.renderOrder = 2
      parent.add(mesh)
      const offset = index * 0.37 + ring * 0.5
      const period = 3.4 + (index % 3) * 0.5
      const settle = (phase: number) => {
        mesh.scale.setScalar(size * (0.7 + phase * 1.5))
        material.opacity = Math.sin(phase * Math.PI) * 0.2
      }
      settle(0.3 + ring * 0.35)
      animate((time) => settle(((time / period + offset) % 1 + 1) % 1))
    }
  })
}

export function buildWatercraft(
  parent: THREE.Object3D,
  disposal: Disposal,
  atlas: Atlas,
  bob: (object: THREE.Object3D, amplitude?: number) => void,
  animate: Animate,
) {
  const wood = surfaceMaterial(disposal, atlas.weathered)
  const darkWood = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.7 })
  const paint = standard(disposal, { color: '#b5553c', roughness: 0.46, metalness: 0.04 })
  const cream = standard(disposal, { color: '#efe6d4', roughness: 0.55, metalness: 0.02 })
  const rope = standard(disposal, { color: '#cdb892', roughness: 0.9, metalness: 0 })
  const steel = standard(disposal, { color: '#c9ccc9', roughness: 0.3, metalness: 0.8 })

  // Canoe: painted hull, pale gunwales, two seats, and a paddle laid across.
  const canoe = new THREE.Group()
  canoe.position.set(-0.7, WATER_Y + 0.06, 6.4)
  canoe.rotation.y = 0.4
  parent.add(canoe)
  const shell = canoeGeometry(disposal)
  const hull = new THREE.Mesh(shell, paint)
  hull.castShadow = true
  hull.receiveShadow = true
  canoe.add(hull)
  const inside = disposal.mat(wood.clone())
  inside.side = THREE.BackSide
  canoe.add(new THREE.Mesh(shell, inside))
  const gunwale = disposal.geo(new THREE.TorusGeometry(1, 0.1, 4, 48))
  gunwale.rotateX(Math.PI / 2)
  const rim = new THREE.Mesh(gunwale, cream)
  rim.scale.set(0.17, 0.12, 0.85)
  rim.position.y = 0.012
  canoe.add(rim)
  const seat = disposal.geo(new THREE.BoxGeometry(0.3, 0.025, 0.09))
  for (const sz of [-0.55, 0.6]) addMeshTo(canoe, seat, wood, [0, -0.02, sz])
  addMeshTo(canoe, disposal.geo(new THREE.BoxGeometry(0.34, 0.02, 0.04)), wood, [0, 0, 0.02])
  const paddle = new THREE.Group()
  paddle.position.set(0.04, 0.03, -0.1)
  paddle.rotation.set(0, 0.55, 0)
  canoe.add(paddle)
  addMeshTo(paddle, disposal.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 5)), darkWood, [0, 0, 0], [Math.PI / 2, 0, 0])
  addMeshTo(paddle, disposal.geo(new THREE.BoxGeometry(0.1, 0.012, 0.24)), darkWood, [0, 0, 0.52])
  bob(canoe, 0.03)

  // Swim raft: deck boards on barrels, a ladder, and a mooring line.
  const raft = new THREE.Group()
  raft.position.set(-6.2, WATER_Y + 0.1, 1.6)
  raft.rotation.y = 0.18
  const plank = disposal.geo(new THREE.BoxGeometry(1.5, 0.07, 0.2))
  for (let i = 0; i < 7; i++) addMeshTo(raft, plank, wood, [0, 0.02, -0.63 + i * 0.21])
  const joist = disposal.geo(new THREE.BoxGeometry(0.1, 0.08, 1.5))
  for (const jx of [-0.6, 0, 0.6]) addMeshTo(raft, joist, darkWood, [jx, -0.05, 0])
  const barrel = disposal.geo(new THREE.CylinderGeometry(0.16, 0.16, 0.5, 12))
  barrel.rotateZ(Math.PI / 2)
  const barrelMat = standard(disposal, { color: '#3f6f7a', roughness: 0.5, metalness: 0.1 })
  for (const [bx, bz] of [[-0.45, -0.5], [0.45, -0.5], [-0.45, 0.5], [0.45, 0.5]] as const) {
    addMeshTo(raft, barrel, barrelMat, [bx, -0.15, bz])
  }
  const ladder = new THREE.Group()
  ladder.position.set(0.78, 0, 0.3)
  raft.add(ladder)
  const rail = disposal.geo(new THREE.TorusGeometry(0.14, 0.014, 5, 10, Math.PI))
  for (const lz of [-0.13, 0.13]) {
    addMeshTo(ladder, rail, steel, [0, 0.06, lz], [0, Math.PI / 2, 0])
    addMeshTo(ladder, disposal.geo(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 5)), steel, [0.14, -0.14, lz])
  }
  const rung = disposal.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 5))
  for (const ry of [-0.08, -0.22]) addMeshTo(ladder, rung, steel, [0.14, ry, 0], [Math.PI / 2, 0, 0])
  parent.add(raft)
  bob(raft, 0.025)

  // Buoys: striped floats with a small cap and a line down.
  const buoyMat = standard(disposal, { color: '#d9774a', roughness: 0.45, metalness: 0.04 })
  const buoyBand = standard(disposal, { color: '#f4efe6', roughness: 0.5, metalness: 0.02 })
  const buoyBody = disposal.geo(new THREE.SphereGeometry(0.16, 16, 12))
  const band = disposal.geo(new THREE.CylinderGeometry(0.163, 0.163, 0.07, 16, 1, true))
  const cap = disposal.geo(new THREE.CylinderGeometry(0.035, 0.05, 0.14, 8))
  const buoys: Array<[number, number, number]> = [
    [6.2, -1.6, 0.02],
    [-3.8, -2.4, 0.015],
    [0.4, 1.2, 0.03],
  ]
  buoys.forEach(([x, z, amplitude], index) => {
    const buoy = new THREE.Group()
    buoy.position.set(x, WATER_Y + 0.1, z)
    addMeshTo(buoy, buoyBody, buoyMat, [0, 0, 0])
    addMeshTo(buoy, band, buoyBand, [0, 0.02, 0])
    addMeshTo(buoy, cap, buoyMat, [0, 0.2, 0])
    addMeshTo(buoy, disposal.geo(new THREE.TorusGeometry(0.03, 0.008, 4, 8)), rope, [0, 0.29, 0])
    parent.add(buoy)
    bob(buoy, amplitude + index * 0.004)
  })

  addRipples(parent, disposal, animate, [
    [-0.7, 6.4, 1.4],
    [-6.2, 1.6, 2.1],
    ...buoys.map(([x, z]) => [x, z, 0.7] as [number, number, number]),
  ])
  addLilies(parent, disposal)
}

/** Lily pads and a few blooms in the calm shallows. */
function addLilies(parent: THREE.Object3D, disposal: Disposal) {
  const padShape = new THREE.Shape()
  padShape.absarc(0, 0, 1, 0.28, Math.PI * 2 - 0.02, false)
  padShape.lineTo(0, 0)
  const pad = disposal.geo(new THREE.ShapeGeometry(padShape, 14))
  pad.rotateX(-Math.PI / 2)
  const padMat = standard(disposal, { color: '#5f8f4a', roughness: 0.55, metalness: 0.02 })
  padMat.side = THREE.DoubleSide
  const petalMat = standard(disposal, { color: '#f6e3ea', roughness: 0.6, emissive: '#f3d2dd', emissiveIntensity: 0.08 })
  const heart = standard(disposal, { color: '#f1c34a', roughness: 0.6 })
  const petal = disposal.geo(new THREE.ConeGeometry(0.035, 0.09, 4))
  const clusters: Array<[number, number, number]> = [
    [-9.6, 5.2, 7],
    [12.1, 3.6, 6],
    [-12.3, -4.2, 5],
    [4.1, 8.1, 5],
  ]
  const rand = seeded(17)
  for (const [cx, cz, count] of clusters) {
    const pads = new THREE.InstancedMesh(pad, padMat, count)
    pads.receiveShadow = true
    const dummy = new THREE.Object3D()
    const tint = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const x = cx + (rand() - 0.5) * 1.6
      const z = cz + (rand() - 0.5) * 1.1
      dummy.position.set(x, WATER_Y + 0.008 + i * 0.0006, z)
      dummy.rotation.set(0, rand() * Math.PI * 2, 0)
      dummy.scale.setScalar(0.12 + rand() * 0.1)
      dummy.updateMatrix()
      pads.setMatrixAt(i, dummy.matrix)
      tint.setHSL(0.26 + rand() * 0.05, 0.38, 0.36 + rand() * 0.1)
      pads.setColorAt(i, tint)
      if (i % 3 === 0) {
        const flower = new THREE.Group()
        flower.position.set(x, WATER_Y + 0.04, z)
        for (let p = 0; p < 6; p++) {
          const mesh = new THREE.Mesh(petal, petalMat)
          const a = (p / 6) * Math.PI * 2
          mesh.position.set(Math.cos(a) * 0.035, 0.02, Math.sin(a) * 0.035)
          mesh.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7)
          flower.add(mesh)
        }
        flower.add(new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.025, 6, 4)), heart))
        parent.add(flower)
      }
    }
    parent.add(pads)
  }
}

function addMeshTo(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  if (rotation) mesh.rotation.set(...rotation)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function seeded(seed: number) {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

/** An open bowl stretched into a canoe: pinched ends, lifted bow and stern. */
function canoeGeometry(disposal: Disposal) {
  const geometry = disposal.geo(new THREE.SphereGeometry(1, 28, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2))
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const z = position.getZ(i)
    const pinch = 1 - Math.abs(z) ** 1.6 * 0.35
    position.setXYZ(i, position.getX(i) * 0.17 * pinch, position.getY(i) * 0.12 + z ** 4 * 0.09, z * 0.85)
  }
  geometry.computeVertexNormals()
  return geometry
}
