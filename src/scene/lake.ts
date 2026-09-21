import * as THREE from 'three'
import type { Atlas } from './assets'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { surfaceMaterial } from './assets'
import { LAKE_CZ, LAKE_RX, LAKE_RZ, WATER_BOUNDS, WATER_Y, lakeRadius } from './ground'

export function buildLake(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
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
      radius *= 0.985 / Math.max(0.2, lakeRadius(x, z))
    }
    const x = cx * LAKE_RX * radius
    const z = LAKE_CZ + cz * LAKE_RZ * radius
    if (i === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  }

  const geometry = disposal.geo(new THREE.ShapeGeometry(shape, 24))
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position
  const uv = new Float32Array(position.count * 2)
  const spanX = WATER_BOUNDS.maxX - WATER_BOUNDS.minX
  const spanZ = WATER_BOUNDS.maxZ - WATER_BOUNDS.minZ
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = (position.getX(i) - WATER_BOUNDS.minX) / spanX
    uv[i * 2 + 1] = (position.getZ(i) - WATER_BOUNDS.minZ) / spanZ
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geometry.computeVertexNormals()

  const shore = new Float32Array(position.count)
  for (let i = 0; i < position.count; i++) {
    shore[i] = lakeRadius(position.getX(i), position.getZ(i))
  }
  geometry.setAttribute('shore', new THREE.BufferAttribute(shore, 1))

  const material = standard(disposal, {
    map: atlas.waterColor,
    roughnessMap: atlas.waterRoughness,
    normalMap: atlas.waterNormal,
    normalScale: new THREE.Vector2(1.25, 1.25),
    roughness: 0.55,
    metalness: 0.03,
    envMapIntensity: 1.95,
  })
  material.fog = false
  shadeWater(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.y = WATER_Y
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

export function setWaterTime(mesh: THREE.Mesh, time: number) {
  const material = mesh.material
  if (Array.isArray(material)) return
  const shader = material.userData.shader as { uniforms: { uTime: { value: number } } } | undefined
  if (shader) shader.uniforms.uTime.value = time
}

function shadeWater(material: THREE.MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    material.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float shore;
         varying float vShore;`,
      )
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>
         vShore = shore;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vShore;
         uniform float uTime;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         vec3 deepWater = vec3(0.07, 0.30, 0.38);
         vec3 bottom = vec3(0.90, 0.82, 0.62);
         diffuseColor.rgb = mix(diffuseColor.rgb, deepWater, smoothstep(0.78, 0.2, vShore) * 0.28);
         diffuseColor.rgb = mix(diffuseColor.rgb, bottom, smoothstep(0.62, 0.96, vShore) * 0.34);
         float foamBand = smoothstep(0.8, 0.95, vShore);
         float foamNoise = texture2D(normalMap, vNormalMapUv * 3.2 + vec2(uTime * 0.12, -uTime * 0.05)).y;
         float foam = foamBand * smoothstep(0.4, 0.78, foamNoise);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.94, 0.96, 0.93), foam);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         float edge = smoothstep(0.72, 0.96, vShore);
         roughnessFactor = mix(0.2, roughnessFactor, smoothstep(0.12, 0.75, vShore));
         roughnessFactor = mix(roughnessFactor, 0.78, edge);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `vec2 scrollA = vNormalMapUv + vec2(uTime * 0.016, uTime * 0.009);
         vec2 scrollB = vNormalMapUv * 2.55 + vec2(-uTime * 0.023, uTime * 0.018);
         vec3 mapN = texture2D(normalMap, scrollA).xyz * 2.0 - 1.0;
         vec3 mapN2 = texture2D(normalMap, scrollB).xyz * 2.0 - 1.0;
         mapN = normalize(vec3(mapN.xy * 0.7 + mapN2.xy * 0.9, 1.0));
         mapN.xy *= normalScale;
         normal = normalize(tbn * mapN);`,
      )
  }
  material.customProgramCacheKey = () => 'lake-water'
}

export function buildWatercraft(
  parent: THREE.Object3D,
  disposal: Disposal,
  atlas: Atlas,
  bob: (object: THREE.Object3D, amplitude?: number) => void,
) {
  const wood = surfaceMaterial(disposal, atlas.weathered)
  const canoe = new THREE.Mesh(canoeGeometry(disposal), wood)
  canoe.scale.set(0.7, 0.55, 1.35)
  canoe.position.set(-0.7, WATER_Y + 0.02, 6.4)
  canoe.rotation.y = 0.4
  canoe.castShadow = true
  parent.add(canoe)
  bob(canoe, 0.03)

  const rowboat = new THREE.Group()
  rowboat.position.set(4.4, WATER_Y + 0.02, 3.2)
  rowboat.rotation.y = -0.6
  const hull = new THREE.Mesh(canoeGeometry(disposal), wood)
  hull.scale.set(0.95, 0.6, 1.05)
  hull.castShadow = true
  rowboat.add(hull)
  const oar = disposal.geo(new THREE.BoxGeometry(0.9, 0.03, 0.08))
  const left = new THREE.Mesh(oar, wood)
  left.position.set(-0.35, 0.14, 0.15)
  left.rotation.z = 0.4
  rowboat.add(left)
  const right = new THREE.Mesh(oar, wood)
  right.position.set(0.35, 0.14, -0.1)
  right.rotation.z = -0.4
  rowboat.add(right)
  parent.add(rowboat)
  bob(rowboat, 0.028)

  const raft = new THREE.Group()
  raft.position.set(-6.2, WATER_Y + 0.06, 1.6)
  const plank = disposal.geo(new THREE.BoxGeometry(1.5, 0.08, 0.28))
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(plank, wood)
    mesh.position.x = -0.48 + i * 0.32
    mesh.castShadow = true
    raft.add(mesh)
  }
  parent.add(raft)
  bob(raft, 0.025)

  const buoyMat = standard(disposal, { color: '#d07a4a', roughness: 0.55, metalness: 0.04 })
  ;[
    [6.2, -1.6, 0.02],
    [-3.8, -2.4, 0.015],
    [0.4, 1.2, 0.03],
  ].forEach(([x, z, amplitude], index) => {
    const buoy = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.16, 10, 8)), buoyMat)
    buoy.position.set(x, WATER_Y + 0.12, z)
    buoy.castShadow = true
    parent.add(buoy)
    bob(buoy, amplitude + index * 0.004)
  })
}

function canoeGeometry(disposal: Disposal) {
  const profile = [
    new THREE.Vector2(0.02, 0.18),
    new THREE.Vector2(0.16, 0.12),
    new THREE.Vector2(0.2, 0.02),
    new THREE.Vector2(0.12, -0.08),
    new THREE.Vector2(0, -0.12),
  ]
  const geometry = disposal.geo(new THREE.LatheGeometry(profile, 12))
  geometry.rotateX(Math.PI / 2)
  const position = geometry.attributes.position
  let maxZ = 0
  for (let i = 0; i < position.count; i++) maxZ = Math.max(maxZ, Math.abs(position.getZ(i)))
  for (let i = 0; i < position.count; i++) {
    const taper = Math.cos((Math.abs(position.getZ(i)) / maxZ) * Math.PI * 0.5)
    position.setX(i, position.getX(i) * Math.max(0.05, taper))
  }
  geometry.computeVertexNormals()
  return geometry
}
