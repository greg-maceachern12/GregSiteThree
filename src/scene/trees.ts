import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Disposal } from './disposal'

/** Shared wind clock for every swaying instanced plant. */
export const windUniforms = { uWind: { value: 0 } }

/**
 * Sway instanced foliage from its base: the offset grows with height squared and each
 * instance gets its own phase from where it stands.
 */
export function addWind(material: THREE.MeshStandardMaterial, strength: number, key: string) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, windUniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uWind;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         #ifdef USE_INSTANCING
           vec3 rootPos = instanceMatrix[3].xyz;
         #else
           vec3 rootPos = vec3(0.0);
         #endif
         float lift = max(position.y, 0.0);
         float gust = sin(uWind * 1.1 + rootPos.x * 0.37 + rootPos.z * 0.29)
           + 0.45 * sin(uWind * 2.7 + rootPos.x * 1.3 - rootPos.z * 0.7);
         transformed.x += gust * lift * lift * ${strength.toFixed(4)};
         transformed.z += gust * lift * lift * ${(strength * 0.55).toFixed(4)};`,
      )
  }
  material.customProgramCacheKey = () => `wind-${key}`
}

function rand(seed: number) {
  let state = seed | 0 || 1
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function paint(geometry: THREE.BufferGeometry, color: (x: number, y: number, z: number, i: number) => THREE.Color) {
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const c = color(position.getX(i), position.getY(i), position.getZ(i), i)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
}

/** Normals that point out from a central axis, so a crown shades like one soft mass. */
function foliageNormals(geometry: THREE.BufferGeometry, center: THREE.Vector3, upBias: number) {
  const position = geometry.attributes.position
  const normals = new Float32Array(position.count * 3)
  const n = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    n.set(position.getX(i) - center.x, position.getY(i) - center.y, position.getZ(i) - center.z)
    n.y = n.y * (1 - upBias) + upBias * Math.max(0.3, n.length())
    n.normalize()
    normals[i * 3] = n.x
    normals[i * 3 + 1] = n.y
    normals[i * 3 + 2] = n.z
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
}

const PINE_SHAPES = [
  { height: 2.9, base: 1.0, tiers: 8, top: 0.12 },
  { height: 2.6, base: 0.66, tiers: 9, top: 0.08 },
  { height: 2.4, base: 1.12, tiers: 6, top: 0.16 },
  { height: 1.55, base: 0.52, tiers: 5, top: 0.1 },
]

/** Stacked, drooping skirts with ragged branch tips; darker in the shade of the tier above. */
export function pineGeometry(disposal: Disposal, variant: number) {
  const shape = PINE_SHAPES[variant]
  const random = rand(variant * 97 + 13)
  const parts: THREE.BufferGeometry[] = []
  const base = new THREE.Color('#10251b')
  const tip = new THREE.Color('#4a7a3e')
  const color = new THREE.Color()
  const trunkTop = shape.height * 0.28
  for (let t = 0; t < shape.tiers; t++) {
    const f = t / (shape.tiers - 1)
    const radius = THREE.MathUtils.lerp(shape.base, shape.top, f ** 0.9) * (0.92 + random() * 0.16)
    const height = THREE.MathUtils.lerp(0.62, 0.34, f) * (shape.height / 2.7)
    const y = trunkTop + f * (shape.height - trunkTop - height * 0.4)
    const radial = 16
    const skirt = new THREE.ConeGeometry(radius, height, radial, 3, true).toNonIndexed()
    const position = skirt.attributes.position
    const phase = random() * Math.PI * 2
    const lobes = 5 + Math.floor(random() * 3)
    for (let i = 0; i < position.count; i++) {
      const px = position.getX(i)
      const py = position.getY(i)
      const pz = position.getZ(i)
      const along = (height / 2 - py) / height // 0 at the point, 1 at the rim
      const angle = Math.atan2(pz, px)
      const spike = Math.max(0, Math.cos(angle * lobes + phase)) ** 3
      const jag = 0.5 + 0.5 * Math.sin(angle * 23 + phase * 3)
      const spread = 1 + along ** 2 * (spike * 0.34 + jag * 0.1 - 0.12)
      const droop = along ** 2 * height * (0.28 + spike * 0.3)
      position.setXYZ(i, px * spread, py - droop + height / 2, pz * spread)
    }
    skirt.translate(0, y - height / 2, 0)
    foliageNormals(skirt, new THREE.Vector3(0, y - height * 0.9, 0), 0.35)
    paint(skirt, (px, py, pz) => {
      const reach = Math.hypot(px, pz) / Math.max(0.01, radius)
      const shade = THREE.MathUtils.clamp(0.25 + reach * 0.55 + f * 0.25, 0, 1)
      color.copy(base).lerp(tip, shade)
      return color.multiplyScalar(0.94 + (py % 0.37) * 0.16)
    })
    parts.push(skirt)
  }
  const geometry = mergeGeometries(parts)
  if (!geometry) throw new Error('Unable to build pine')
  return disposal.geo(geometry)
}

export function trunkGeometry(disposal: Disposal, height: number, radius: number) {
  const trunk = new THREE.CylinderGeometry(radius * 0.35, radius, height, 8, 3)
  trunk.translate(0, height / 2, 0)
  const position = trunk.attributes.position
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i)
    // Flared root and a slight kink so trunks don't read as dowels.
    const flare = 1 + Math.max(0, 0.18 - y) * 2.2
    position.setX(i, position.getX(i) * flare + Math.sin(y * 3.1) * 0.015)
    position.setZ(i, position.getZ(i) * flare)
  }
  trunk.computeVertexNormals()
  return disposal.geo(trunk)
}

/** A birch: pale trunk with dark lenticels, and a crown of clustered lobes. */
export function birchGeometry(disposal: Disposal, seed: number) {
  const random = rand(seed)
  const lobes: THREE.BufferGeometry[] = []
  const center = new THREE.Vector3(0, 2.05, 0)
  const light = new THREE.Color('#7d9c46')
  const deep = new THREE.Color('#284d25')
  const color = new THREE.Color()
  for (let i = 0; i < 6; i++) {
    const lobe = new THREE.IcosahedronGeometry(0.42 + random() * 0.22, 1)
    const position = lobe.attributes.position
    for (let v = 0; v < position.count; v++) {
      const k = 0.85 + 0.3 * Math.abs(Math.sin(position.getX(v) * 9 + position.getY(v) * 7 + i))
      position.setXYZ(v, position.getX(v) * k, position.getY(v) * k * 0.85, position.getZ(v) * k)
    }
    const a = (i / 6) * Math.PI * 2 + random()
    const r = i === 0 ? 0 : 0.32 + random() * 0.18
    lobe.translate(Math.cos(a) * r, center.y + (i === 0 ? 0.35 : (random() - 0.4) * 0.5), Math.sin(a) * r)
    lobes.push(lobe)
  }
  const crown = mergeGeometries(lobes)
  if (!crown) throw new Error('Unable to build birch')
  foliageNormals(crown, center, 0.25)
  paint(crown, (x, y, z) => {
    const up = THREE.MathUtils.clamp((y - center.y + 0.6) / 1.4, 0, 1)
    const out = THREE.MathUtils.clamp(Math.hypot(x, z) / 0.9, 0, 1)
    return color.copy(deep).lerp(light, up * 0.65 + out * 0.35)
  })

  const trunk = new THREE.CylinderGeometry(0.035, 0.07, 2.1, 7, 6)
  trunk.translate(0, 1.05, 0)
  const tp = trunk.attributes.position
  for (let i = 0; i < tp.count; i++) {
    const y = tp.getY(i)
    tp.setX(i, tp.getX(i) + Math.sin(y * 1.7 + seed) * 0.04)
  }
  trunk.computeVertexNormals()
  const bark = new THREE.Color('#ece7dc')
  const mark = new THREE.Color('#3b3632')
  paint(trunk, (x, y, z) => {
    const band = Math.sin(y * 17 + Math.atan2(z, x) * 2) > 0.82 ? 1 : 0
    return color.copy(bark).lerp(mark, band * 0.85)
  })
  return { crown: disposal.geo(crown), trunk: disposal.geo(trunk) }
}

/** A clump of tapered blades, bent outward, for the lawns. */
export function grassGeometry(disposal: Disposal) {
  const blades: THREE.BufferGeometry[] = []
  const random = rand(5)
  const root = new THREE.Color('#3a5528')
  const tipColor = new THREE.Color('#9db463')
  const color = new THREE.Color()
  for (let i = 0; i < 7; i++) {
    const height = 0.16 + random() * 0.14
    const blade = new THREE.PlaneGeometry(0.035, height, 1, 3)
    blade.translate(0, height / 2, 0)
    const position = blade.attributes.position
    for (let v = 0; v < position.count; v++) {
      const y = position.getY(v) / height
      position.setX(v, position.getX(v) * (1 - y * 0.9))
      position.setZ(v, y * y * 0.06)
    }
    blade.rotateY(random() * Math.PI * 2)
    blade.translate((random() - 0.5) * 0.12, 0, (random() - 0.5) * 0.12)
    blades.push(blade)
  }
  const geometry = mergeGeometries(blades)
  if (!geometry) throw new Error('Unable to build grass')
  const position = geometry.attributes.position
  const normals = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) normals[i * 3 + 1] = 1
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  paint(geometry, (_x, y) => color.copy(root).lerp(tipColor, THREE.MathUtils.clamp(y / 0.28, 0, 1)))
  return disposal.geo(geometry)
}
