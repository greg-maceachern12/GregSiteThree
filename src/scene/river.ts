import * as THREE from 'three'
import type { Atlas } from './assets'
import { surfaceMaterial } from './assets'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { FOG, terrainHeight } from './ground'
import { RIVER_COURSE, riverSurface } from './riverCourse'

export function buildRiver(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const geometry = ribbon(disposal)
  const material = standard(disposal, {
    map: atlas.waterColor,
    roughnessMap: atlas.waterRoughness,
    normalMap: atlas.waterNormal,
    normalScale: new THREE.Vector2(1.45, 1.45),
    color: '#7eb8b4',
    roughness: 0.28,
    metalness: 0.04,
    envMapIntensity: 1.7,
  })
  material.fog = false
  material.side = THREE.DoubleSide
  material.polygonOffset = true
  material.polygonOffsetFactor = -2
  material.polygonOffsetUnits = -2
  shadeRiver(material)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = false
  parent.add(mesh)
  addStones(parent, disposal, atlas)
  return mesh
}

function ribbon(disposal: Disposal) {
  const points = RIVER_COURSE.map(([x, z]) => new THREE.Vector3(x, 0, z))
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45)
  const divisions = 56
  const positions: number[] = []
  const uvs: number[] = []
  const along: number[] = []
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
    const width = 1.4 - t * 0.95
    const y = riverSurface(t)
    const left = point.clone().addScaledVector(side, width / 2)
    const right = point.clone().addScaledVector(side, -width / 2)
    positions.push(left.x, y, left.z, right.x, y, right.z)
    const v = t * 5
    uvs.push(0, v, 1, v)
    along.push(t, t)
  }

  for (let i = 0; i < divisions; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }

  const geometry = disposal.geo(new THREE.BufferGeometry())
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('along', new THREE.Float32BufferAttribute(along, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function shadeRiver(material: THREE.MeshStandardMaterial) {
  const fog = new THREE.Color(FOG)
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uRimColor = { value: fog }
    material.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         attribute float along;
         varying float vAlong;
         varying vec3 vRimWorld;
         uniform float uTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         vAlong = along;
         float across = abs(uv.x * 2.0 - 1.0);
         float crest = sin(uv.y * 14.0 - uTime * 2.8);
         transformed.y += crest * 0.022 * (1.0 - across);`,
      )
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         vRimWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying float vAlong;
         varying vec3 vRimWorld;
         uniform float uTime;
         uniform vec3 uRimColor;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float across = abs(vMapUv.x - 0.5) * 2.0;
         float center = smoothstep(0.95, 0.2, across);
         vec3 deep = vec3(0.05, 0.28, 0.36);
         diffuseColor.rgb = mix(diffuseColor.rgb, deep, 0.42 * center);
         float phase = vMapUv.y * 6.28318 - uTime * 1.85;
         float streak = pow(max(sin(phase), 0.0), 6.0);
         float thread = pow(max(sin(phase * 0.45 + 1.4), 0.0), 4.0);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.97, 0.94), (streak * 0.9 + thread * 0.5) * center);
         float lip = smoothstep(0.62, 1.0, across) * (1.0 - smoothstep(0.82, 1.0, vAlong));
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.9), lip * 0.45);
         float rim = smoothstep(22.0, 33.0, length(vRimWorld.xz));
         diffuseColor.rgb = mix(diffuseColor.rgb, uRimColor, max(rim, smoothstep(0.78, 1.0, vAlong)));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         roughnessFactor = mix(0.16, 0.62, abs(vMapUv.x - 0.5) * 2.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `vec2 flowA = vec2(vMapUv.x * 0.8, vMapUv.y - uTime * 0.72);
         vec2 flowB = vec2(vMapUv.x * 1.8 + 0.15, vMapUv.y * 1.4 - uTime * 1.15);
         vec3 mapN = texture2D(normalMap, flowA).xyz * 2.0 - 1.0;
         vec3 mapN2 = texture2D(normalMap, flowB).xyz * 2.0 - 1.0;
         mapN = normalize(vec3(mapN.xy * 0.9 + mapN2.xy * 1.2, 1.0));
         mapN.xy *= normalScale;
         normal = normalize(tbn * mapN);`,
      )
  }
  material.customProgramCacheKey = () => 'river-flow'
}

function addStones(parent: THREE.Object3D, disposal: Disposal, atlas: Atlas) {
  const stone = surfaceMaterial(disposal, atlas.limestone, { color: '#b3a898', roughness: 0.9 })
  const rock = disposal.geo(new THREE.IcosahedronGeometry(0.42, 0))
  const points = RIVER_COURSE.map(([x, z]) => new THREE.Vector3(x, 0, z))
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45)
  const tangent = new THREE.Vector3()
  const banks: Array<[number, number, number]> = [
    [0.36, -1, 0.62],
    [0.5, 1, 0.5],
    [0.66, -1, 0.72],
    [0.8, 1, 0.48],
  ]
  for (const [t, side, scale] of banks) {
    const point = curve.getPoint(t)
    curve.getTangent(t, tangent)
    tangent.y = 0
    tangent.normalize()
    const x = point.x + -tangent.z * side * 0.95
    const z = point.z + tangent.x * side * 0.95
    const mesh = new THREE.Mesh(rock, stone)
    mesh.position.set(x, terrainHeight(x, z) + 0.04, z)
    mesh.scale.set(scale, scale * 0.55, scale * 0.85)
    mesh.rotation.set(0.2, t * 4, 0.15)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)
  }
  for (const [t, shift] of [
    [0.46, 0.12],
    [0.62, -0.1],
  ] as const) {
    const point = curve.getPoint(t)
    curve.getTangent(t, tangent)
    tangent.y = 0
    tangent.normalize()
    const x = point.x + -tangent.z * shift
    const z = point.z + tangent.x * shift
    const mesh = new THREE.Mesh(rock, stone)
    mesh.position.set(x, riverSurface(t) + 0.02, z)
    mesh.scale.setScalar(0.36)
    mesh.castShadow = true
    parent.add(mesh)
  }
}
