import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Atlas } from './assets'
import { surfaceMaterial } from './assets'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { FOG, WATER_BOUNDS, terrainHeight } from './ground'
import { WATER_COLOR_CHUNK, WATER_NORMAL_CHUNK, WATER_ROUGHNESS_CHUNK, waterMaterial } from './lake'
import { REFLECT_PARS_FRAGMENT, reflectFragment, reflectionUniforms } from './reflection'
import { RIVER_COURSE, riverSurface } from './riverCourse'

function course() {
  const points = RIVER_COURSE.map(([x, z]) => new THREE.Vector3(x, 0, z))
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45)
}

/** Point on the course, pushed sideways by `offset` (positive is the left bank). */
function bankPoint(curve: THREE.CatmullRomCurve3, t: number, offset: number) {
  const point = curve.getPoint(t)
  const tangent = curve.getTangent(t).setY(0).normalize()
  return { x: point.x - tangent.z * offset, z: point.z + tangent.x * offset, tangent }
}

export function buildRiver(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const curve = course()
  const geometry = ribbon(disposal, curve)
  const material = waterMaterial(disposal, atlas)
  material.side = THREE.DoubleSide
  material.envMapIntensity = 0.55
  material.transparent = true
  material.polygonOffset = true
  material.polygonOffsetFactor = -2
  material.polygonOffsetUnits = -2
  shadeRiver(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = false
  parent.add(mesh)
  addStones(parent, disposal, atlas, curve)
  addReeds(parent, disposal, atlas, curve)
  addBridge(parent, disposal, atlas, curve)
  return mesh
}

function ribbon(disposal: Disposal, curve: THREE.CatmullRomCurve3) {
  const divisions = 90
  const across = 6
  const positions: number[] = []
  const uvs: number[] = []
  const along: number[] = []
  const water: number[] = []
  const flow: number[] = []
  const indices: number[] = []
  const spanX = WATER_BOUNDS.maxX - WATER_BOUNDS.minX
  const spanZ = WATER_BOUNDS.maxZ - WATER_BOUNDS.minZ

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions
    // Wider than the channel: the carved banks rise through the edges and shape the shoreline.
    const width = 3.4 - t * 1.5
    const y = riverSurface(t)
    for (let j = 0; j <= across; j++) {
      const offset = (j / across - 0.5) * width
      const { x, z, tangent } = bankPoint(curve, t, offset)
      // Outer columns dip into the banks so the terrain, not the mesh edge, draws the shoreline.
      const dip = j === 0 || j === across ? 0.3 : 0
      positions.push(x, y - dip, z)
      uvs.push((x - WATER_BOUNDS.minX) / spanX, (z - WATER_BOUNDS.minZ) / spanZ)
      // A stream this narrow reads too pale at its true depth, so it is shaded a little deeper.
      water.push((y - terrainHeight(x, z)) * 3.4 + 0.06, 1)
      flow.push(tangent.x / spanX, tangent.z / spanZ)
      along.push(t)
    }
  }

  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < across; j++) {
      const a = i * (across + 1) + j
      const b = a + across + 1
      indices.push(a, b, a + 1, a + 1, b, b + 1)
    }
  }

  const geometry = disposal.geo(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('along', new THREE.Float32BufferAttribute(along, 1))
  geometry.setAttribute('water', new THREE.Float32BufferAttribute(water, 2))
  geometry.setAttribute('flow', new THREE.Float32BufferAttribute(flow, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function shadeRiver(material: THREE.MeshStandardMaterial) {
  const fog = new THREE.Color(FOG)
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uRimColor = { value: fog }
    Object.assign(shader.uniforms, reflectionUniforms)
    material.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float along;
         attribute vec2 water;
         attribute vec2 flow;
         varying float vAlong;
         varying vec2 vWater;
         varying vec2 vFlow;
         varying vec3 vRimWorld;
         varying vec3 vReflWorld;
         uniform float uTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vAlong = along;
         vWater = water;
         vFlow = flow;
         float crest = sin(along * 38.0 - uTime * 2.6) * smoothstep(0.2, 0.5, along);
         transformed.y += crest * 0.008;`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         vRimWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
         vReflWorld = vRimWorld;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vAlong;
         varying vec2 vWater;
         varying vec2 vFlow;
         varying vec3 vRimWorld;
         uniform float uTime;
         uniform vec3 uRimColor;
         ${REFLECT_PARS_FRAGMENT}`,
      )
      .replace('#include <opaque_fragment>', reflectFragment('1.0 - max(rim, smoothstep(0.84, 1.0, vAlong))'))
      .replace(
        '#include <color_fragment>',
        `${WATER_COLOR_CHUNK}
         vec2 streakUv = vNormalMapUv * vec2(3.0, 3.0) - vFlow * uTime * 38.0;
         float streak = texture2D(normalMap, streakUv).x * texture2D(normalMap, streakUv * 1.7 + 0.3).y;
         float rapids = smoothstep(0.3, 0.55, vAlong) * (1.0 - smoothstep(0.0, 0.16, depth));
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.93), smoothstep(0.5, 0.8, streak) * (0.18 + rapids * 0.5));
         float rim = smoothstep(22.0, 33.0, length(vRimWorld.xz));
         diffuseColor.rgb = mix(diffuseColor.rgb, uRimColor, max(rim, smoothstep(0.84, 1.0, vAlong)));
         diffuseColor.a *= smoothstep(0.03, 0.16, vAlong);`,
      )
      .replace('#include <roughnessmap_fragment>', WATER_ROUGHNESS_CHUNK)
      .replace(
        '#include <normal_fragment_maps>',
        `vec2 flowA = -vFlow * uTime * 4.5;
         vec2 flowB = -vFlow * uTime * 6.5;
         vec2 flowC = -vFlow * uTime * 9.0;
         ${WATER_NORMAL_CHUNK}`,
      )
  }
  material.customProgramCacheKey = () => 'river-flow'
}

function addStones(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas, curve: THREE.CatmullRomCurve3) {
  const stone = surfaceMaterial(disposal, atlas.limestone, { color: '#b3a898', roughness: 0.9 })
  const mossy = surfaceMaterial(disposal, atlas.limestone, { color: '#8f9a78', roughness: 0.95 })
  const rocks = [0, 1, 2].map((seed) => boulder(disposal, seed))
  const rand = seeded(29)
  const place = (t: number, offset: number, scale: number, y?: number) => {
    const { x, z } = bankPoint(curve, t, offset)
    const mesh = new THREE.Mesh(rocks[Math.floor(rand() * 3)], rand() > 0.55 ? mossy : stone)
    mesh.position.set(x, (y ?? terrainHeight(x, z)) + scale * 0.05, z)
    mesh.scale.set(scale, scale * (0.5 + rand() * 0.25), scale * (0.75 + rand() * 0.3))
    mesh.rotation.set(rand() * 0.3, rand() * Math.PI * 2, rand() * 0.2)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
  }
  // Boulders along both banks.
  for (const [t, side, scale] of [
    [0.3, -1, 0.62],
    [0.36, 1, 0.5],
    [0.5, 1, 0.55],
    [0.58, -1, 0.72],
    [0.66, -1, 0.5],
    [0.72, 1, 0.66],
    [0.8, 1, 0.48],
    [0.86, -1, 0.56],
  ] as const) {
    place(t, side * (1.05 + rand() * 0.35), scale)
  }
  // Pebbles at the waterline.
  for (let i = 0; i < 26; i++) {
    const t = 0.24 + rand() * 0.62
    const side = rand() > 0.5 ? 1 : -1
    place(t, side * (0.75 + rand() * 0.45), 0.12 + rand() * 0.14)
  }
  // Stepping stones breaking the surface mid-stream.
  for (const [t, shift, scale] of [
    [0.44, 0.18, 0.34],
    [0.47, -0.22, 0.28],
    [0.62, -0.1, 0.38],
    [0.68, 0.2, 0.26],
  ] as const) {
    place(t, shift, scale, riverSurface(t) - 0.04)
  }
}

/** Cattails and grass clumps where the banks meet the water. */
function addReeds(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas, curve: THREE.CatmullRomCurve3) {
  const rand = seeded(83)
  const blades: THREE.BufferGeometry[] = []
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.ConeGeometry(0.02, 0.5 + i * 0.07, 3)
    blade.translate(0, 0.25 + i * 0.035, 0)
    blade.rotateZ((i - 2) * 0.12)
    blade.rotateY(i * 1.3)
    blade.translate((i - 2) * 0.03, 0, ((i * 7) % 3) * 0.02 - 0.02)
    blades.push(blade)
  }
  const reedGeo = mergeGeometries(blades)
  if (!reedGeo) return
  reedGeo.computeVertexNormals()
  disposal.geo(reedGeo)
  const headGeo = disposal.geo(new THREE.CapsuleGeometry(0.028, 0.1, 2, 5))
  headGeo.translate(0, 0.74, 0)

  const spots: Array<{ x: number; y: number; z: number; s: number; yaw: number }> = []
  for (let i = 0; i < 70; i++) {
    const t = 0.04 + rand() * 0.8
    const side = rand() > 0.5 ? 1 : -1
    const { x, z } = bankPoint(curve, t, side * (0.85 + rand() * 0.55))
    spots.push({ x, y: terrainHeight(x, z), z, s: 0.7 + rand() * 0.6, yaw: rand() * Math.PI * 2 })
  }
  // A few along the lake shallows either side of the mouth.
  for (const [x, z] of [
    [-1.6, -11.2], [-1.1, -11.4], [-5.6, -10.6], [-6.1, -10.2], [-8.9, 7.6], [-9.4, 7.1], [9.6, 7.9], [13.4, 2.8],
  ] as const) {
    for (let k = 0; k < 3; k++) {
      const px = x + (rand() - 0.5) * 0.7
      const pz = z + (rand() - 0.5) * 0.7
      const py = terrainHeight(px, pz)
      if (py < -0.12) continue
      spots.push({ x: px, y: py, z: pz, s: 0.7 + rand() * 0.5, yaw: rand() * Math.PI * 2 })
    }
  }

  const reedMat = surfaceMaterial(disposal, atlas.foliage, { color: '#9bb46a', roughness: 0.9 })
  const headMat = standard(disposal, { color: '#6b4a2f', roughness: 0.85 })
  const reeds = new THREE.InstancedMesh(reedGeo, reedMat, spots.length)
  const heads = new THREE.InstancedMesh(headGeo, headMat, spots.length)
  reeds.castShadow = true
  reeds.receiveShadow = true
  heads.castShadow = true
  const dummy = new THREE.Object3D()
  const tint = new THREE.Color()
  spots.forEach((spot, index) => {
    dummy.position.set(spot.x, spot.y - 0.02, spot.z)
    dummy.rotation.set(0, spot.yaw, 0)
    dummy.scale.setScalar(spot.s)
    dummy.updateMatrix()
    reeds.setMatrixAt(index, dummy.matrix)
    heads.setMatrixAt(index, dummy.matrix)
    tint.setHSL(0.2 + rand() * 0.06, 0.35, 0.42 + rand() * 0.14)
    reeds.setColorAt(index, tint)
  })
  parent.add(reeds, heads)
}

/** A plank footbridge arching over the stream. */
function addBridge(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas, curve: THREE.CatmullRomCurve3) {
  const t = 0.53
  const center = curve.getPoint(t)
  const tangent = curve.getTangent(t).setY(0).normalize()
  const half = 1.9
  const left = bankPoint(curve, t, half)
  const right = bankPoint(curve, t, -half)
  const yL = terrainHeight(left.x, left.z)
  const yR = terrainHeight(right.x, right.z)
  const water = riverSurface(t)

  const group = new THREE.Group()
  group.position.set(center.x, 0, center.z)
  group.rotation.y = Math.atan2(-tangent.x, -tangent.z)
  parent.add(group)

  const deck = surfaceMaterial(disposal, atlas.weathered, { roughness: 0.86 })
  const frame = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.8 })
  const rope = standard(disposal, { color: '#cdb892', roughness: 0.9 })
  const lift = Math.max(yL, yR, water + 0.3) + 0.12
  // Deck heights follow a shallow arch from bank to bank; x runs across the stream.
  const deckY = (u: number) => {
    const ends = yL + (yR - yL) * (u * 0.5 + 0.5)
    return ends + (lift - ends) * (1 - u * u) + 0.05
  }
  const plank = disposal.geo(new THREE.BoxGeometry(0.16, 0.05, 0.78))
  const count = 20
  for (let i = 0; i <= count; i++) {
    const u = (i / count) * 2 - 1
    const x = u * half
    const slope = (deckY(Math.min(1, u + 0.05)) - deckY(Math.max(-1, u - 0.05))) / (0.1 * half)
    const mesh = new THREE.Mesh(plank, deck)
    mesh.position.set(-x, deckY(u), 0)
    mesh.rotation.z = Math.atan(slope)
    mesh.rotation.y = (i % 3) * 0.02 - 0.02
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  const beam = disposal.geo(new THREE.BoxGeometry(1, 0.08, 0.08))
  const post = disposal.geo(new THREE.BoxGeometry(0.07, 0.5, 0.07))
  for (const side of [-0.36, 0.36]) {
    for (let i = 0; i < 6; i++) {
      const u0 = (i / 6) * 2 - 1
      const u1 = ((i + 1) / 6) * 2 - 1
      const a = new THREE.Vector3(-u0 * half, deckY(u0) - 0.06, side)
      const b = new THREE.Vector3(-u1 * half, deckY(u1) - 0.06, side)
      const stringer = new THREE.Mesh(beam, frame)
      stringer.position.copy(a).add(b).multiplyScalar(0.5)
      stringer.scale.x = a.distanceTo(b) + 0.02
      stringer.rotation.z = Math.atan2(b.y - a.y, b.x - a.x)
      stringer.castShadow = true
      group.add(stringer)
      const rail = new THREE.Mesh(beam, frame)
      rail.position.copy(stringer.position).setY(stringer.position.y + 0.5)
      rail.scale.set(stringer.scale.x, 0.6, 0.6)
      rail.rotation.z = stringer.rotation.z
      rail.castShadow = true
      group.add(rail)
    }
    for (let i = 0; i <= 6; i++) {
      const u = (i / 6) * 2 - 1
      const mesh = new THREE.Mesh(post, frame)
      mesh.position.set(-u * half, deckY(u) + 0.22, side)
      mesh.castShadow = true
      group.add(mesh)
    }
    const line = new THREE.Mesh(disposal.geo(new THREE.CylinderGeometry(0.012, 0.012, half * 2, 4)), rope)
    line.rotation.z = Math.PI / 2
    line.position.set(0, lift + 0.26, side)
    group.add(line)
  }
}

function boulder(disposal: Disposal, seed: number) {
  const geometry = disposal.geo(new THREE.IcosahedronGeometry(0.42, 1))
  const position = geometry.attributes.position
  const rand = seeded(seed * 13 + 5)
  const bumps = new Map<string, number>()
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i).toFixed(3)},${position.getY(i).toFixed(3)},${position.getZ(i).toFixed(3)}`
    const bump = bumps.get(key) ?? 0.82 + rand() * 0.3
    bumps.set(key, bump)
    const y = position.getY(i)
    position.setXYZ(i, position.getX(i) * bump, (y < 0 ? y * 0.4 : y) * bump, position.getZ(i) * bump)
  }
  geometry.computeVertexNormals()
  return geometry
}

function seeded(seed: number) {
  let state = seed + 1
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}
