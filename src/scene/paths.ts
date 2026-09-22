import * as THREE from 'three'
import type { Atlas } from './assets'
import { surfaceMaterial } from './assets'
import type { Disposal } from './disposal'
import { terrainHeight } from './ground'

const ROUTES: Array<Array<[number, number]>> = [
  [
    [0.4, 12.2],
    [3.6, 10.6],
    [7.4, 9.2],
    [11.2, 8.4],
    [12.2, 9.0],
    [14.2, 9.2],
  ],
  [
    [-5.9, 13.7],
    [-7.7, 12.9],
    [-9.4, 12.0],
    [-10.9, 11.5],
  ],
  [
    [4.1, -12.8],
    [4.05, -14.35],
    [4.0, -14.9],
  ],
  [
    [-1.8, 13.05],
    [0.6, 13.5],
    [2.8, 14.15],
    [4.7, 14.55],
  ],
]

export function distanceToPath(x: number, z: number) {
  let best = Infinity
  for (const route of ROUTES) {
    for (let i = 0; i < route.length - 1; i++) {
      best = Math.min(best, segmentDistance(x, z, route[i], route[i + 1]))
    }
  }
  return best
}

function segmentDistance(x: number, z: number, a: [number, number], b: [number, number]) {
  const abx = b[0] - a[0]
  const abz = b[1] - a[1]
  const length = abx * abx + abz * abz || 1
  const t = Math.min(1, Math.max(0, ((x - a[0]) * abx + (z - a[1]) * abz) / length))
  const px = a[0] + abx * t
  const pz = a[1] + abz * t
  return Math.hypot(x - px, z - pz)
}

export function buildPath(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const material = surfaceMaterial(disposal, atlas.gravel, {
    roughness: 1,
    metalness: 0.02,
    normalScale: new THREE.Vector2(1.35, 1.35),
  })
  material.transparent = true
  material.polygonOffset = true
  material.polygonOffsetFactor = -1
  material.polygonOffsetUnits = -1
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphamap_fragment>',
      `#include <alphamap_fragment>
       float across = abs(vMapUv.x - 0.5) * 2.0;
       diffuseColor.a *= 1.0 - smoothstep(0.62, 1.0, across);`,
    )
  }
  material.customProgramCacheKey = () => 'path-edge'

  for (const route of ROUTES) {
    const mesh = new THREE.Mesh(ribbon(disposal, route, route === ROUTES[0] ? 0.92 : 0.7), material)
    mesh.receiveShadow = true
    mesh.castShadow = false
    parent.add(mesh)
  }
}

function ribbon(disposal: Disposal, route: Array<[number, number]>, width: number) {
  const points = route.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.045, z))
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  const divisions = 48
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const side = new THREE.Vector3()
  const tangent = new THREE.Vector3()

  for (let i = 0; i <= divisions; i++) {
    const t = i / divisions
    const point = curve.getPoint(t)
    curve.getTangent(t, tangent)
    tangent.y = 0
    if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0)
    tangent.normalize()
    side.set(-tangent.z, 0, tangent.x)
    const y = terrainHeight(point.x, point.z) + 0.05
    const left = point.clone().addScaledVector(side, width / 2)
    const right = point.clone().addScaledVector(side, -width / 2)
    left.y = y
    right.y = y
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z)
    uvs.push(0, t * 8, 1, t * 8)
  }

  for (let i = 0; i < divisions; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }

  const geometry = disposal.geo(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}
