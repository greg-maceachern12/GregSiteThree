import * as THREE from 'three'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { LAKE_CZ, LAKE_RX, LAKE_RZ, WATER_Y, lakeRadius } from './ground'

const DEEP = new THREE.Color('#1f6d78')
const SHALLOW = new THREE.Color('#c5e4dc')

export function buildLake(parent: THREE.Object3D, disposal: Disposal) {
  const shape = new THREE.Shape()
  const steps = 96
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2
    const cx = Math.cos(angle)
    const cz = Math.sin(angle)
    let radius = 0.97
    for (let attempt = 0; attempt < 8; attempt++) {
      const x = cx * LAKE_RX * radius
      const z = LAKE_CZ + cz * LAKE_RZ * radius
      const measured = lakeRadius(x, z)
      radius *= 0.985 / Math.max(0.2, measured)
    }
    const x = cx * LAKE_RX * radius
    const z = LAKE_CZ + cz * LAKE_RZ * radius
    if (i === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  }

  const geometry = disposal.geo(new THREE.ShapeGeometry(shape, 24))
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const color = new THREE.Color()

  for (let i = 0; i < position.count; i++) {
    const radius = lakeRadius(position.getX(i), position.getZ(i))
    const edge = smoothEdge(radius)
    color.copy(DEEP).lerp(SHALLOW, edge)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const material = standard(disposal, {
    vertexColors: true,
    roughness: 0.18,
    metalness: 0.06,
    envMapIntensity: 1,
  })
  material.fog = false

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = WATER_Y
  mesh.receiveShadow = true
  parent.add(mesh)
  return { mesh, material }
}

function smoothEdge(radius: number) {
  const t = Math.min(1, Math.max(0, (radius - 0.35) / 0.62))
  return t * t * (3 - 2 * t)
}
