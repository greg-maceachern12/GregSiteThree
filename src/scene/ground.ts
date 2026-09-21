export const LAKE_RX = 17
export const LAKE_RZ = 12.2
export const LAKE_CZ = -0.6
export const WATER_Y = 0.14
export const FOG = '#e6e0d2'
export const WATER_BOUNDS = { minX: -18.2, maxX: 18.2, minZ: -14.4, maxZ: 13.2 }

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function hash(ix: number, iz: number) {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function noise(x: number, z: number) {
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const fx = x - x0
  const fz = z - z0
  const ux = fx * fx * (3 - 2 * fx)
  const uz = fz * fz * (3 - 2 * fz)
  const a = hash(x0, z0)
  const b = hash(x0 + 1, z0)
  const c = hash(x0, z0 + 1)
  const d = hash(x0 + 1, z0 + 1)
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz
}

/** 0 at the lake center, 1 near the shore, above 1 on land. */
export function lakeRadius(x: number, z: number) {
  const nx = x / LAKE_RX
  const nz = (z - LAKE_CZ) / LAKE_RZ
  const wobble =
    0.034 * Math.sin(x * 0.31 + 0.4) +
    0.026 * Math.cos(z * 0.36 + 1.2) +
    0.018 * Math.sin((x + z) * 0.2)
  return Math.hypot(nx, nz) + wobble
}

export function terrainHeight(x: number, z: number) {
  const radius = lakeRadius(x, z)
  const land = smoothstep(0.9, 1.14, radius)
  let height = -0.62 + land * 1.28
  height += smoothstep(1.08, 1.75, radius) * 0.2
  height += (noise(x * 0.18, z * 0.18) - 0.45) * 0.2 * land
  height += (noise(x * 0.055 + 4.2, z * 0.055) - 0.5) * 0.36 * land
  height += (noise(x * 0.14 + 1.3, z * 0.14) - 0.5) * 0.07 * land
  const shoreBand = smoothstep(0.98, 1.04, radius) * (1 - smoothstep(1.08, 1.22, radius))
  height += (noise(x * 0.72, z * 0.72) - 0.42) * 0.07 * shoreBand

  const lawnX = x + 2.2
  const lawnZ = z - 13.4
  const lawn = Math.exp(-(lawnX * lawnX) / 38 - (lawnZ * lawnZ) / 30)
  height = height * (1 - lawn * land) + 0.84 * lawn * land

  const riseX = x + 3.2
  const riseZ = z - 17.6
  const rise = Math.exp(-(riseX * riseX) / 24 - (riseZ * riseZ) / 16)
  height += rise * 1.35 * land

  return height
}
