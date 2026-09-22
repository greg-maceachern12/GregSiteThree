import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'

const SIZE = 1024
const LAKE_RX = 17
const LAKE_RZ = 12.2
const LAKE_CZ = -0.6
const TERRAIN = 78

await mkdir('public/textures', { recursive: true })
await mkdir('public/env', { recursive: true })

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function hash2(ix, iy) {
  const n = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function noise(x, y) {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash2(x0, y0)
  const b = hash2(x0 + 1, y0)
  const c = hash2(x0, y0 + 1)
  const d = hash2(x0 + 1, y0 + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

function fbm(x, y) {
  return noise(x, y) * 0.6 + noise(x * 2.1 + 4, y * 2.1) * 0.3 + noise(x * 4.3 + 9, y * 4.3) * 0.1
}

function smoothstep(e0, e1, value) {
  const t = Math.min(1, Math.max(0, (value - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

function lakeRadius(x, z) {
  const nx = x / LAKE_RX
  const nz = (z - LAKE_CZ) / LAKE_RZ
  const wobble =
    0.034 * Math.sin(x * 0.31 + 0.4) +
    0.026 * Math.cos(z * 0.36 + 1.2) +
    0.018 * Math.sin((x + z) * 0.2)
  return Math.hypot(nx, nz) + wobble
}

function mix(a, b, t) {
  return a + (b - a) * t
}

function rgb(buf, index, r, g, b) {
  const offset = index * 3
  buf[offset] = clampByte(r)
  buf[offset + 1] = clampByte(g)
  buf[offset + 2] = clampByte(b)
}

function gray(buf, index, value) {
  rgb(buf, index, value, value, value)
}

async function writeWebp(name, buffer) {
  await sharp(buffer, { raw: { width: SIZE, height: SIZE, channels: 3 } })
    .webp({ quality: 82 })
    .toFile(`public/textures/${name}.webp`)
}

function deriveHeight(color) {
  const height = new Float32Array(SIZE * SIZE)
  for (let i = 0; i < height.length; i++) {
    const offset = i * 3
    height[i] = (color[offset] * 0.3 + color[offset + 1] * 0.5 + color[offset + 2] * 0.2) / 255
  }
  return height
}

function aoFromHeight(height) {
  const out = Buffer.alloc(SIZE * SIZE * 3)
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [2, 1],
    [-2, -1],
    [1, 2],
    [-1, -2],
    [3, 0],
    [0, -3],
  ]
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const here = height[i]
      let occlusion = 0
      for (const [ox, oy] of offsets) {
        const sx = (x + ox + SIZE) % SIZE
        const sy = (y + oy + SIZE) % SIZE
        const diff = height[sy * SIZE + sx] - here
        if (diff > 0) occlusion += diff
      }
      gray(out, i, (1 - Math.min(0.62, occlusion * 0.85)) * 255)
    }
  }
  return out
}

function normalsFromHeight(height, strength) {
  const out = Buffer.alloc(SIZE * SIZE * 3)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const left = height[y * SIZE + ((x - 1 + SIZE) % SIZE)]
      const right = height[y * SIZE + ((x + 1) % SIZE)]
      const up = height[((y - 1 + SIZE) % SIZE) * SIZE + x]
      const down = height[((y + 1) % SIZE) * SIZE + x]
      let nx = (left - right) * strength
      let ny = (down - up) * strength
      let nz = 1
      const length = Math.hypot(nx, ny, nz) || 1
      nx /= length
      ny /= length
      nz /= length
      rgb(out, i, (nx * 0.5 + 0.5) * 255, (ny * 0.5 + 0.5) * 255, (nz * 0.5 + 0.5) * 255)
    }
  }
  return out
}

function siding() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  const height = new Float32Array(SIZE * SIZE)
  const plank = 64
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const row = Math.floor(y / plank)
      const seam = y % plank < 4
      const tone = hash2(4, row)
      const grain = fbm(x * 0.008 + row, y * 0.02)
      const base = mix(122, 184, tone)
      let r = base + 18 + grain * 28
      let g = base - 8 + grain * 16
      let b = base - 36 + grain * 10
      if (seam) {
        r *= 0.72
        g *= 0.7
        b *= 0.68
      }
      const knot = noise(x * 0.05, y * 0.05) > 0.82 ? 0.82 : 1
      rgb(color, i, r * knot, g * knot, b * knot)
      gray(rough, i, seam ? 210 : 150 + grain * 40)
      height[i] = (seam ? 0 : 0.65 + grain * 0.35) * (0.85 + tone * 0.15)
    }
  }
  return { color, rough, height, normal: normalsFromHeight(height, 3.2) }
}

function weathered() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  const plank = 72
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const row = Math.floor(y / plank)
      const seam = y % plank < 4
      const tone = hash2(3, row)
      const grain = fbm(x * 0.01 + row, y * 0.03)
      const silver = fbm(x * 0.004, y * 0.004)
      let r = mix(150, 176, tone) + grain * 18 + silver * 16
      let g = mix(118, 140, tone) + grain * 12 + silver * 14
      let b = mix(78, 96, tone) + grain * 8 + silver * 10
      if (seam) {
        r *= 0.66
        g *= 0.64
        b *= 0.6
      }
      rgb(color, i, r, g, b)
      gray(rough, i, seam ? 220 : 168 + grain * 30)
    }
  }
  return { color, rough }
}

function darkWood() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const grain = fbm(x * 0.02, y * 0.006)
      const wet = fbm(x * 0.008, y * 0.008)
      const r = 48 + grain * 22 + wet * 10
      const g = 42 + grain * 16 + wet * 8
      const b = 38 + grain * 12 + wet * 6
      rgb(color, i, r, g, b)
      gray(rough, i, 78 + grain * 36 + (1 - wet) * 28)
    }
  }
  return { color, rough }
}

function limestone() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  const course = 128
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const row = Math.floor(y / course)
      const block = Math.floor((x + (row % 2) * 70) / 150)
      const mortar = y % course < 5 || (x + (row % 2) * 70) % 150 < 4
      const tone = hash2(block, row)
      const speckle = noise(x * 0.08, y * 0.08)
      let r = mix(196, 214, tone) + speckle * 10
      let g = mix(188, 206, tone) + speckle * 8
      let b = mix(170, 188, tone) + speckle * 6
      if (mortar) {
        r = 150
        g = 146
        b = 136
      }
      rgb(color, i, r, g, b)
      gray(rough, i, mortar ? 200 : 150 + speckle * 30)
    }
  }
  return { color, rough }
}

function gravel() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const n = fbm(x * 0.03, y * 0.03)
      const pebble = noise(x * 0.12, y * 0.12)
      const r = 168 + n * 40 + pebble * 24
      const g = 154 + n * 30 + pebble * 16
      const b = 126 + n * 22 + pebble * 10
      rgb(color, i, r, g, b)
      gray(rough, i, 190 + pebble * 40)
    }
  }
  return { color, rough }
}

function slate() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  const height = new Float32Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const pit = fbm(x * 0.02, y * 0.02)
      const fleck = noise(x * 0.15, y * 0.15)
      const r = 92 + pit * 28 + fleck * 12
      const g = 102 + pit * 24 + fleck * 10
      const b = 96 + pit * 18 + fleck * 8
      rgb(color, i, r, g, b)
      gray(rough, i, 170 + pit * 50)
      height[i] = pit * 0.8 + (fleck > 0.75 ? 0.2 : 0)
    }
  }
  return { color, rough, height, normal: normalsFromHeight(height, 2.4) }
}

function roof() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  const course = 48
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const row = Math.floor(y / course)
      const shift = (row % 2) * 36
      const seam = y % course < 3 || (x + shift) % 72 < 2
      const tone = hash2(Math.floor((x + shift) / 72), row)
      const n = noise(x * 0.02, y * 0.02)
      let r = mix(78, 132, tone) + n * 14
      let g = mix(62, 102, tone) + n * 10
      let b = mix(50, 82, tone) + n * 8
      if (seam) {
        r *= 0.7
        g *= 0.68
        b *= 0.66
      }
      rgb(color, i, r, g, b)
      gray(rough, i, seam ? 150 : 188)
    }
  }
  return { color, rough }
}

function foliage() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x
      const clump = fbm(x * 0.01, y * 0.01)
      const speckle = noise(x * 0.08, y * 0.08)
      const r = 58 + clump * 30 + speckle * 16
      const g = 96 + clump * 48 + speckle * 20
      const b = 62 + clump * 18 + speckle * 8
      rgb(color, i, r, g, b)
      gray(rough, i, 200 + speckle * 30)
    }
  }
  return { color, rough }
}

function terrain() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  for (let y = 0; y < SIZE; y++) {
    const v = 1 - y / (SIZE - 1)
    const worldZ = -(v - 0.5) * TERRAIN
    for (let x = 0; x < SIZE; x++) {
      const u = x / (SIZE - 1)
      const worldX = (u - 0.5) * TERRAIN
      const i = y * SIZE + x
      const radius = lakeRadius(worldX, worldZ)
      const land = smoothstep(0.92, 1.16, radius)
      const beach = smoothstep(0.96, 1.08, radius) * (1 - smoothstep(1.08, 1.3, radius))
      const lawn = Math.exp(-((worldX + 2.2) ** 2) / 38 - ((worldZ - 13.4) ** 2) / 30) * land
      const rise = Math.exp(-((worldX + 3.2) ** 2) / 24 - ((worldZ - 17.6) ** 2) / 16) * land
      const n = fbm(worldX * 0.35, worldZ * 0.35)
      const grassR = 112 + n * 28
      const grassG = 138 + n * 30
      const grassB = 78 + n * 16
      let r = mix(78, grassR, land)
      let g = mix(118, grassG, land)
      let b = mix(112, grassB, land)
      r = mix(r, 198 + n * 16, beach * 0.9)
      g = mix(g, 184 + n * 12, beach * 0.9)
      b = mix(b, 146 + n * 8, beach * 0.9)
      r = mix(r, 168 + n * 12, lawn * 0.55)
      g = mix(g, 184 + n * 10, lawn * 0.55)
      b = mix(b, 112 + n * 8, lawn * 0.55)
      r = mix(r, 168, rise * 0.65)
      g = mix(g, 164, rise * 0.65)
      b = mix(b, 146, rise * 0.65)
      rgb(color, i, r, g, b)
      const roughValue = mix(90, 214, land)
      gray(rough, i, mix(roughValue, 196, beach * 0.4))
    }
  }
  return { color, rough }
}

function water() {
  const color = Buffer.alloc(SIZE * SIZE * 3)
  const rough = Buffer.alloc(SIZE * SIZE * 3)
  const minX = -18.2
  const maxX = 18.2
  const minZ = -14.4
  const maxZ = 13.2
  for (let y = 0; y < SIZE; y++) {
    const v = 1 - y / (SIZE - 1)
    const worldZ = minZ + v * (maxZ - minZ)
    for (let x = 0; x < SIZE; x++) {
      const u = x / (SIZE - 1)
      const worldX = minX + u * (maxX - minX)
      const i = y * SIZE + x
      const radius = lakeRadius(worldX, worldZ)
      const edge = smoothstep(0.62, 0.98, radius)
      const sand = smoothstep(0.92, 1.04, radius)
      const n = fbm(worldX * 0.55, worldZ * 0.55) * 0.035
      const deep = [36, 128, 138]
      const shallow = [168, 214, 204]
      const shore = [214, 206, 176]
      let r = mix(deep[0], shallow[0], edge)
      let g = mix(deep[1], shallow[1], edge)
      let b = mix(deep[2], shallow[2], edge)
      r = mix(r, shore[0], sand)
      g = mix(g, shore[1], sand)
      b = mix(b, shore[2], sand)
      rgb(color, i, r + n * 255, g + n * 255, b + n * 255)
      gray(rough, i, mix(55, 150, Math.max(edge, sand)))
    }
  }
  return { color, rough }
}

function waterNormal() {
  const height = new Float32Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y++) {
    const v = y / SIZE
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE
      height[y * SIZE + x] =
        Math.sin((u * 9 + v * 4) * Math.PI * 2) * 0.34 +
        Math.sin((u * 6 - v * 8) * Math.PI * 2) * 0.26 +
        Math.sin((u * 19 + v * 15) * Math.PI * 2) * 0.2 +
        Math.sin((u * 33 - v * 24) * Math.PI * 2) * 0.11
    }
  }
  return normalsFromHeight(height, 2.6)
}

const sets = {
  'wood-siding': siding(),
  'wood-weathered': weathered(),
  'wood-dark': darkWood(),
  limestone: limestone(),
  gravel: gravel(),
  slate: slate(),
  roof: roof(),
  foliage: foliage(),
  terrain: terrain(),
  water: water(),
}

const normalStrength = {
  'wood-weathered': 1.8,
  'wood-dark': 1.5,
  limestone: 2.6,
  gravel: 3.1,
  roof: 3.6,
  foliage: 1.15,
  terrain: 1.6,
}

for (const [name, set] of Object.entries(sets)) {
  await writeWebp(`${name}-color`, set.color)
  await writeWebp(`${name}-roughness`, set.rough)
  if (name === 'water') continue
  const height = set.height ?? deriveHeight(set.color)
  if (set.normal) await writeWebp(`${name}-normal`, set.normal)
  else await writeWebp(`${name}-normal`, normalsFromHeight(height, normalStrength[name] ?? 2))
  await writeWebp(`${name}-ao`, aoFromHeight(height))
}
await writeWebp('water-normal', waterNormal())

await writeFile('public/env/afternoon.hdr', hdrBytes(1024, 512))

function hdrBytes(width, height) {
  const header = Buffer.from(
    '#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ' + height + ' +X ' + width + '\n',
    'ascii',
  )
  const body = []
  for (let y = 0; y < height; y++) {
    const v = y / (height - 1)
    const channels = [[], [], [], []]
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1)
      const pixel = sky(u, v)
      const encoded = floatToRgbe(pixel[0], pixel[1], pixel[2])
      for (let c = 0; c < 4; c++) channels[c].push(encoded[c])
    }
    body.push(2, 2, (width >> 8) & 255, width & 255)
    for (const channel of channels) body.push(...rle(channel))
  }
  return Buffer.concat([header, Buffer.from(body)])
}

function sky(u, v) {
  const azimuth = (u - 0.5) * Math.PI * 2
  const elevation = (0.5 - v) * Math.PI
  const sunAzimuth = -0.9
  const sunElevation = 0.42
  const cos =
    Math.sin(elevation) * Math.sin(sunElevation) +
    Math.cos(elevation) * Math.cos(sunElevation) * Math.cos(azimuth - sunAzimuth)
  const glow = Math.pow(Math.max(0, cos), 28) * 7.5
  const soft = Math.pow(Math.max(0, cos), 4) * 1.4
  const above = elevation > 0
  const horizon = Math.pow(1 - Math.min(1, Math.abs(elevation) / 0.35), 2)
  let r
  let g
  let b
  if (above) {
    const zenith = Math.min(1, elevation / 1.2)
    r = mix(0.95, 0.55, zenith) + horizon * 0.35
    g = mix(0.78, 0.68, zenith) + horizon * 0.18
    b = mix(0.62, 0.78, zenith)
  } else {
    const ground = Math.min(1, -elevation / 1.2)
    r = mix(0.55, 0.28, ground)
    g = mix(0.46, 0.26, ground)
    b = mix(0.36, 0.2, ground)
  }
  return [r + glow * 1.3 + soft * 0.55, g + glow * 0.85 + soft * 0.35, b + glow * 0.45 + soft * 0.12]
}

function floatToRgbe(r, g, b) {
  const max = Math.max(r, g, b)
  if (max < 1e-32) return [0, 0, 0, 0]
  const exponent = Math.floor(Math.log2(max)) + 1
  const scale = 256 / 2 ** exponent
  return [
    Math.min(255, Math.max(0, Math.round(r * scale))),
    Math.min(255, Math.max(0, Math.round(g * scale))),
    Math.min(255, Math.max(0, Math.round(b * scale))),
    Math.min(255, Math.max(0, exponent + 128)),
  ]
}

function rle(values) {
  const out = []
  let index = 0
  while (index < values.length) {
    let run = 1
    while (
      run < 127 &&
      index + run < values.length &&
      values[index] === values[index + run]
    ) {
      run += 1
    }
    if (run >= 4) {
      out.push(128 + run, values[index])
      index += run
      continue
    }
    let dump = 0
    const start = index
    while (dump < 128 && index < values.length) {
      let ahead = 1
      while (
        ahead < 4 &&
        index + ahead < values.length &&
        values[index] === values[index + ahead]
      ) {
        ahead += 1
      }
      if (ahead >= 4) break
      index += 1
      dump += 1
    }
    out.push(dump)
    for (let i = 0; i < dump; i++) out.push(values[start + i])
  }
  return out
}
