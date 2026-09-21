import * as THREE from 'three'

export class Disposal {
  private geometries = new Set<THREE.BufferGeometry>()
  private materials = new Set<THREE.Material>()
  private textures = new Set<THREE.Texture>()

  geo<T extends THREE.BufferGeometry>(geometry: T) {
    this.geometries.add(geometry)
    return geometry
  }

  mat<T extends THREE.Material>(material: T) {
    this.materials.add(material)
    return material
  }

  tex<T extends THREE.Texture>(texture: T) {
    this.textures.add(texture)
    return texture
  }

  dispose() {
    for (const geometry of this.geometries) geometry.dispose()
    for (const material of this.materials) material.dispose()
    for (const texture of this.textures) texture.dispose()
    this.geometries.clear()
    this.materials.clear()
    this.textures.clear()
  }
}

export function standard(
  disposal: Disposal,
  params: THREE.MeshStandardMaterialParameters,
) {
  return disposal.mat(
    new THREE.MeshStandardMaterial({
      metalness: 0.04,
      roughness: 0.86,
      ...params,
    }),
  )
}
