import * as THREE from 'three'
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js'
import type { Disposal } from './disposal'
import { standard } from './disposal'

export type Surface = {
  color: THREE.Texture
  roughness: THREE.Texture
  normal?: THREE.Texture
}

export type Atlas = {
  terrain: Surface
  siding: Surface
  weathered: Surface
  darkWood: Surface
  limestone: Surface
  gravel: Surface
  slate: Surface
  roof: Surface
  foliage: Surface
  waterColor: THREE.Texture
  waterRoughness: THREE.Texture
  waterNormal: THREE.Texture
  environment: THREE.Texture
}

type Spec = {
  color: string
  roughness: string
  normal?: string
  clamp?: boolean
  repeat?: [number, number]
}

const SURFACES: Record<string, Spec> = {
  terrain: {
    color: '/textures/terrain-color.webp',
    roughness: '/textures/terrain-roughness.webp',
    clamp: true,
  },
  siding: {
    color: '/textures/wood-siding-color.webp',
    roughness: '/textures/wood-siding-roughness.webp',
    normal: '/textures/wood-siding-normal.webp',
  },
  weathered: {
    color: '/textures/wood-weathered-color.webp',
    roughness: '/textures/wood-weathered-roughness.webp',
  },
  darkWood: {
    color: '/textures/wood-dark-color.webp',
    roughness: '/textures/wood-dark-roughness.webp',
  },
  limestone: {
    color: '/textures/limestone-color.webp',
    roughness: '/textures/limestone-roughness.webp',
  },
  gravel: {
    color: '/textures/gravel-color.webp',
    roughness: '/textures/gravel-roughness.webp',
  },
  slate: {
    color: '/textures/slate-color.webp',
    roughness: '/textures/slate-roughness.webp',
    normal: '/textures/slate-normal.webp',
  },
  roof: {
    color: '/textures/roof-color.webp',
    roughness: '/textures/roof-roughness.webp',
  },
  foliage: {
    color: '/textures/foliage-color.webp',
    roughness: '/textures/foliage-roughness.webp',
  },
}

export async function loadAtlas(
  renderer: THREE.WebGLRenderer,
  disposal: Disposal,
  onProgress: (ratio: number) => void,
): Promise<Atlas> {
  const manager = new THREE.LoadingManager()
  manager.onProgress = (_url, loaded, total) => {
    if (total > 0) onProgress(Math.min(0.98, loaded / total))
  }
  const textures = new THREE.TextureLoader(manager)
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())

  const loadTexture = (url: string, kind: 'color' | 'data', clamp: boolean, repeat: [number, number]) =>
    textures.loadAsync(url).then((texture) => {
      texture.colorSpace = kind === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.wrapS = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping
      texture.wrapT = clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping
      texture.repeat.set(repeat[0], repeat[1])
      texture.anisotropy = anisotropy
      return disposal.tex(texture)
    })

  const loadSurface = async (spec: Spec): Promise<Surface> => {
    const repeat = spec.repeat ?? [1, 1]
    const clamp = spec.clamp ?? false
    const [color, roughness, normal] = await Promise.all([
      loadTexture(spec.color, 'color', clamp, repeat),
      loadTexture(spec.roughness, 'data', clamp, repeat),
      spec.normal ? loadTexture(spec.normal, 'data', clamp, repeat) : Promise.resolve(undefined),
    ])
    return { color, roughness, normal }
  }

  const surfaces = {} as Record<keyof typeof SURFACES, Surface>
  await Promise.all(
    (Object.entries(SURFACES) as Array<[keyof typeof SURFACES, Spec]>).map(async ([name, spec]) => {
      surfaces[name] = await loadSurface(spec)
    }),
  )

  const [waterColor, waterRoughness, waterNormal, hdr] = await Promise.all([
    loadTexture('/textures/water-color.webp', 'color', true, [1, 1]),
    loadTexture('/textures/water-roughness.webp', 'data', true, [1, 1]),
    loadTexture('/textures/water-normal.webp', 'data', false, [3, 3]),
    new HDRLoader(manager).loadAsync('/env/afternoon.hdr'),
  ])

  const pmrem = new THREE.PMREMGenerator(renderer)
  pmrem.compileEquirectangularShader()
  const environment = disposal.tex(pmrem.fromEquirectangular(hdr).texture)
  hdr.dispose()
  pmrem.dispose()

  return {
    ...surfaces,
    waterColor,
    waterRoughness,
    waterNormal,
    environment,
  } as Atlas
}

export function surfaceMaterial(
  disposal: Disposal,
  surface: Surface,
  params: THREE.MeshStandardMaterialParameters = {},
) {
  return standard(disposal, {
    map: surface.color,
    roughnessMap: surface.roughness,
    ...(surface.normal ? { normalMap: surface.normal } : {}),
    roughness: 1,
    metalness: 0.04,
    ...params,
  })
}
