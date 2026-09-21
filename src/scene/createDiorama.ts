import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { buildAnimals } from './animals'
import { placeCard, projectAnchors, type ProjectedAnchor } from './anchors'
import { loadAtlas } from './assets'
import { Disposal } from './disposal'
import { FOG } from './ground'
import { buildLake, buildWatercraft, setWaterTime } from './lake'
import { buildRiver } from './river'
import { buildPath } from './paths'
import { buildGraveyard, buildStone } from './places/graveyard'
import { buildHouse } from './places/house'
import { buildMicrosoft } from './places/microsoft'
import { buildQueens } from './places/queens'
import { buildRange } from './places/range'
import { buildSeattle } from './places/seattle'
import { buildStage } from './places/stage'
import { buildShore } from './shore'

export type AnchorInput = {
  id: string
  name: string
  position: [number, number]
  element: HTMLButtonElement
}

export type DioramaOptions = {
  world: HTMLElement
  anchors: AnchorInput[]
  reducedMotion: boolean
  onProgress: (ratio: number) => void
  onReady: () => void
  onFail: (error: unknown) => void
}

export type Diorama = {
  dispose: () => void
  setPaused: (paused: boolean) => void
  setReducedMotion: (reduced: boolean) => void
  resetView: () => void
  setHovered: (id: string | null) => void
  setCard: (id: string | null, element: HTMLElement | null) => void
}

const HOME_POS = new THREE.Vector3(2.2, 23.5, 29.5)
const HOME_TARGET = new THREE.Vector3(0.8, 0.45, 1.4)
const SHIFT = new THREE.Vector3()
type Built = {
  id: string
  label: THREE.Vector3
  focus: THREE.Vector3
  element: HTMLButtonElement
}

export async function createDiorama(canvas: HTMLCanvasElement, options: DioramaOptions): Promise<Diorama> {
  let renderer: THREE.WebGLRenderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    })
  } catch (error) {
    options.onFail(error)
    return inert()
  }

  if (!renderer.getContext()) {
    options.onFail(new Error('WebGL unavailable'))
    renderer.dispose()
    return inert()
  }

  const disposal = new Disposal()
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(FOG)

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140)
  camera.position.copy(HOME_POS)

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.04
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.setClearColor(FOG, 1)

  const controls = new OrbitControls(camera, canvas)
  controls.target.copy(HOME_TARGET)
  controls.enableDamping = !options.reducedMotion
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.minDistance = 12
  controls.maxDistance = 40
  controls.minPolarAngle = 0.38
  controls.maxPolarAngle = 1.12
  controls.rotateSpeed = 0.55
  controls.zoomSpeed = 0.55
  controls.update()

  let atlas
  try {
    atlas = await loadAtlas(renderer, disposal, options.onProgress)
  } catch (error) {
    disposal.dispose()
    renderer.dispose()
    options.onFail(error)
    return inert()
  }
  scene.environment = atlas.environment
  scene.environmentIntensity = 1.05

  const hemi = new THREE.HemisphereLight('#f4efe6', '#6d8c98', 0.32)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#ffc48a', 2.45)
  sun.position.set(-18, 16, 6)
  sun.target.position.set(0.4, 0.6, 3.2)
  scene.add(sun.target)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.radius = 6
  sun.shadow.bias = -0.00015
  sun.shadow.normalBias = 0.02
  sun.shadow.intensity = 0.7
  sun.shadow.camera.near = 2
  sun.shadow.camera.far = 70
  sun.shadow.camera.left = -32
  sun.shadow.camera.right = 32
  sun.shadow.camera.top = 32
  sun.shadow.camera.bottom = -32
  sun.shadow.camera.updateProjectionMatrix()
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#c5d7e4', 0.08)
  fill.position.set(16, 8, -10)
  scene.add(fill)

  buildShore(scene, disposal, atlas)
  const water = buildLake(scene, disposal, atlas)
  const river = buildRiver(scene, disposal, atlas)
  buildPath(scene, disposal, atlas)

  const built: Built[] = []
  const bobbers: { object: THREE.Object3D; base: number; phase: number; amplitude: number }[] = []
  const bob = (object: THREE.Object3D, amplitude = 0.04) => {
    bobbers.push({ object, base: object.position.y, phase: bobbers.length * 1.17, amplitude })
  }

  for (const anchor of options.anchors) {
    const [x, z] = anchor.position
    let place: { label: THREE.Vector3; focus: THREE.Vector3 }
    switch (anchor.id) {
      case 'newyork':
        place = buildHouse(scene, disposal, atlas, x, z)
        break
      case 'music':
        place = buildStage(scene, disposal, atlas, x, z)
        break
      case 'range':
        place = buildRange(scene, disposal, atlas, x, z)
        break
      case 'queens':
        place = buildQueens(scene, disposal, atlas, x, z)
        break
      case 'seattle':
        place = buildSeattle(scene, disposal, atlas, x, z, bob)
        break
      case 'microsoft':
        place = buildMicrosoft(scene, disposal, atlas, x, z)
        break
      default:
        place = buildStone(scene, disposal, atlas, x, z, anchor.id)
        break
    }
    built.push({ id: anchor.id, label: place.label, focus: place.focus, element: anchor.element })
  }

  buildGraveyard(scene, disposal, atlas)
  buildWatercraft(scene, disposal, atlas, bob)
  buildAnimals(scene, disposal, bob)

  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const ssao = new SSAOPass(scene, camera, 512, 512, 16)
  ssao.kernelRadius = 0.85
  ssao.minDistance = 0.015
  ssao.maxDistance = 0.4
  composer.addPass(ssao)
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.26, 0.4, 1.08)
  composer.addPass(bloom)
  const bokeh = new BokehPass(scene, camera, { focus: 34, aperture: 0.00022, maxblur: 0.0042 })
  composer.addPass(bokeh)
  const outputPass = new OutputPass()
  composer.addPass(outputPass)
  const fxaa = new FXAAPass()
  composer.addPass(fxaa)

  const projected: ProjectedAnchor[] = built.map((item) => ({
    id: item.id,
    position: item.label,
    element: item.element,
  }))

  let paused = false
  let reduced = options.reducedMotion
  let hovered: string | null = null
  let openId: string | null = null
  let card: HTMLElement | null = null
  let frame = 0
  let disposed = false
  let ready = false
  const restPos = HOME_POS.clone()
  const restTarget = HOME_TARGET.clone()
  const goalPos = HOME_POS.clone()
  const goalTarget = HOME_TARGET.clone()
  let dragging = false
  const timer = new THREE.Timer()
  timer.connect(document)
  let motionTime = 0

  controls.addEventListener('start', () => {
    dragging = true
  })
  controls.addEventListener('end', () => {
    dragging = false
    restPos.copy(camera.position)
    restTarget.copy(controls.target)
  })

  const resize = () => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width === 0 || height === 0) return
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(options.world)
  resize()

  const still = () => paused || reduced

  const tick = () => {
    if (disposed) return
    frame = requestAnimationFrame(tick)
    timer.update()
    const dt = Math.min(0.05, timer.getDelta())
    if (!still()) motionTime += dt

    if (!dragging) {
      const focusId = openId ?? hovered
      const focus = built.find((item) => item.id === focusId)?.focus
      goalPos.copy(restPos)
      goalTarget.copy(restTarget)
      if (focus) {
        SHIFT.copy(focus).sub(restTarget).multiplyScalar(0.15)
        goalPos.add(SHIFT)
        goalTarget.add(SHIFT)
      }
      const blend = 1 - Math.exp(-3.4 * dt)
      camera.position.lerp(goalPos, blend)
      controls.target.lerp(goalTarget, blend)
    }

    setWaterTime(water, motionTime)
    setWaterTime(river, motionTime)
    ;(bokeh.uniforms as { focus: { value: number } }).focus.value = camera.position.distanceTo(controls.target)
    for (const item of bobbers) {
      const target = still()
        ? item.base
        : item.base + Math.sin(motionTime * 0.8 + item.phase) * item.amplitude
      item.object.position.y = still()
        ? THREE.MathUtils.damp(item.object.position.y, item.base, 5, dt)
        : target
    }

    controls.enableDamping = !reduced
    controls.update()
    composer.render()
    projectAnchors(camera, options.world, projected)
    if (card && openId) {
      const point = built.find((item) => item.id === openId)?.label
      if (point) placeCard(camera, options.world, point, card)
    } else if (card) {
      card.hidden = true
    }

    if (!ready && !disposed) {
      ready = true
      options.onProgress(1)
      options.onReady()
    }
  }
  tick()

  return {
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      ssao.dispose()
      bloom.dispose()
      bokeh.dispose()
      outputPass.dispose()
      fxaa.dispose()
      composer.dispose()
      disposal.dispose()
      hemi.dispose()
      sun.dispose()
      fill.dispose()
      timer.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
    setPaused(next) {
      paused = next
    },
    setReducedMotion(next) {
      reduced = next
      controls.enableDamping = !next
    },
    resetView() {
      hovered = null
      restPos.copy(HOME_POS)
      restTarget.copy(HOME_TARGET)
      camera.position.copy(HOME_POS)
      controls.target.copy(HOME_TARGET)
      controls.update()
    },
    setHovered(id) {
      hovered = id
    },
    setCard(id, element) {
      openId = id
      card = element
      if (card && !id) card.hidden = true
    },
  }
}

function inert(): Diorama {
  return {
    dispose() {},
    setPaused() {},
    setReducedMotion() {},
    resetView() {},
    setHovered() {},
    setCard() {},
  }
}
