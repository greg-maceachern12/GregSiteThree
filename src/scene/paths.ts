import * as THREE from 'three'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { terrainHeight } from './ground'

const WAYPOINTS: Array<[number, number]> = [
  [0.4, 12.2],
  [3.6, 10.6],
  [7.4, 9.2],
  [11.2, 8.4],
  [14.6, 8.0],
  [16.8, 7.8],
]

export function buildPath(parent: THREE.Object3D, disposal: Disposal) {
  const points = WAYPOINTS.map(([x, z]) => new THREE.Vector3(x, terrainHeight(x, z) + 0.045, z))
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5)
  const divisions = 48
  const width = 0.92
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
    uvs.push(0, t, 1, t)
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

  const material = standard(disposal, {
    color: '#c4b59a',
    roughness: 0.96,
    metalness: 0.02,
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = false
  parent.add(mesh)
  return mesh
}
