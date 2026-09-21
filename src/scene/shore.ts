import * as THREE from 'three'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { fadeAtRim } from './edgeFade'
import { lakeRadius, smoothstep, terrainHeight } from './ground'

const GRASS = new THREE.Color('#7d9464')
const LAWN = new THREE.Color('#93aa6e')
const SAND = new THREE.Color('#d2c3a2')
const RISE = new THREE.Color('#9a9586')
const BASIN = new THREE.Color('#6f8f88')

export function buildShore(parent: THREE.Object3D, disposal: Disposal) {
  const geometry = disposal.geo(new THREE.PlaneGeometry(78, 78, 150, 150))
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const color = new THREE.Color()

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const z = position.getZ(i)
    position.setY(i, terrainHeight(x, z))
    const radius = lakeRadius(x, z)
    const land = smoothstep(0.92, 1.16, radius)
    const beach = smoothstep(0.96, 1.08, radius) * (1 - smoothstep(1.08, 1.28, radius))
    const rise = Math.exp(-((x + 3.2) ** 2) / 24 - ((z - 17.6) ** 2) / 16)
    const lawn = Math.exp(-((x + 2.2) ** 2) / 38 - ((z - 13.4) ** 2) / 30)
    color.copy(BASIN).lerp(GRASS, land)
    color.lerp(SAND, beach * 0.85)
    color.lerp(LAWN, lawn * land)
    color.lerp(RISE, rise * land * 0.75)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const material = standard(disposal, {
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  })
  fadeAtRim(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
