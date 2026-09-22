/** Far-shore outlet, between Queen's and the sailboat, running out toward the rim. */
export const RIVER_COURSE: Array<[number, number]> = [
  [-3.4, -10.6],
  [-4.4, -12.8],
  [-5.3, -15.1],
  [-6.7, -17.1],
  [-8.4, -19.5],
  [-9.4, -21.4],
  [-10.3, -24.6],
  [-10.9, -28.2],
]

const LENGTH = RIVER_COURSE.reduce((total, point, index) => {
  if (index === 0) return 0
  const previous = RIVER_COURSE[index - 1]
  return total + Math.hypot(point[0] - previous[0], point[1] - previous[1])
}, 0)

export function nearestOnRiver(x: number, z: number) {
  let best = Infinity
  let along = 0
  let traveled = 0
  for (let i = 0; i < RIVER_COURSE.length - 1; i++) {
    const [ax, az] = RIVER_COURSE[i]
    const [bx, bz] = RIVER_COURSE[i + 1]
    const dx = bx - ax
    const dz = bz - az
    const span = Math.hypot(dx, dz) || 1
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (span * span)))
    const px = ax + dx * t
    const pz = az + dz * t
    const distance = Math.hypot(x - px, z - pz)
    if (distance < best) {
      best = distance
      along = (traveled + span * t) / LENGTH
    }
    traveled += span
  }
  return { distance: best, along }
}

export function distanceToRiver(x: number, z: number) {
  return nearestOnRiver(x, z).distance
}

/** Bed height along the outlet. The mouth matches the lake; the tip drops away. */
export function riverBed(along: number) {
  return 0.04 - along * 0.34
}

export function riverSurface(along: number) {
  return 0.16 - along * 0.34
}

function smooth(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function carveRiver(height: number, x: number, z: number, radius: number) {
  const river = nearestOnRiver(x, z)
  if (river.distance > 2.6 || radius < 0.96) return height
  const blend = smooth(2.6, 0.6, river.distance) * smooth(0.96, 1.08, radius)
  const bed = riverBed(river.along)
  return height + (Math.min(height, bed) - height) * blend
}
