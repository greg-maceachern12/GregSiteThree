import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { placeCard, projectAnchors, type ProjectedAnchor } from './anchors'
import { Disposal } from './disposal'
import { FOG } from './ground'
import { buildLake } from './lake'
import { buildPath } from './paths'
import { buildHouse } from './places/house'
import { buildMicrosoft } from './places/microsoft'
import { buildQueens } from './places/queens'
import { buildRange } from './places/range'
import { buildSeattle } from './places/seattle'
import { buildStage } from './places/stage'
import { buildStone, buildYardBoxes } from './places/graveyard'
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

const HOME_POS = new THREE.Vector3(1.6, 18.2, 23.4)
const HOME_TARGET = new THREE.Vector3(0.2, 0.55, 1.1)
const MOMENTS = new Set(['queens', 'seattle', 'microsoft', 'newyork', 'music', 'range'])

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

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120)
  camera.position.copy(HOME_POS)

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
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

  const hemi = new THREE.HemisphereLight('#f3e4cf', '#6d8a74', 0.55)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#ffc48a', 2.35)
  sun.position.set(-18, 14, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 2
  sun.shadow.camera.far = 70
  sun.shadow.camera.left = -28
  sun.shadow.camera.right = 28
  sun.shadow.camera.top = 28
  sun.shadow.camera.bottom = -28
  sun.shadow.bias = -0.00025
  sun.shadow.normalBias = 0.035
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#d7e6f2', 0.32)
  fill.position.set(14, 9, -8)
  scene.add(fill)

  buildShore(scene, disposal)
  const lake = buildLake(scene, disposal)
  lake.material.fog = false
  buildPath(scene, disposal)

  const built: Built[] = []
  const bobbers: THREE.Object3D[] = []

  for (const anchor of options.anchors) {
    const [x, z] = anchor.position
    let place: { label: THREE.Vector3; focus: THREE.Vector3; bob?: THREE.Object3D }
    switch (anchor.id) {
      case 'newyork':
        place = buildHouse(scene, disposal, x, z)
        break
      case 'music':
        place = buildStage(scene, disposal, x, z)
        break
      case 'range':
        place = buildRange(scene, disposal, x, z)
        break
      case 'queens':
        place = buildQueens(scene, disposal, x, z)
        break
      case 'seattle':
        place = buildSeattle(scene, disposal, x, z)
        break
      case 'microsoft':
        place = buildMicrosoft(scene, disposal, x, z)
        break
      default:
        place = buildStone(scene, disposal, x, z)
        break
    }
    if (place.bob) bobbers.push(place.bob)
    built.push({ id: anchor.id, label: place.label, focus: place.focus, element: anchor.element })
  }

  if (options.anchors.some((anchor) => !MOMENTS.has(anchor.id))) {
    buildYardBoxes(scene, disposal)
  }

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
  const bobBase = bobbers.map((object) => object.position.y)

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
        goalPos.lerp(focus, 0.15)
        goalTarget.lerp(focus, 0.15)
      }
      const blend = 1 - Math.exp(-3.4 * dt)
      camera.position.lerp(goalPos, blend)
      controls.target.lerp(goalTarget, blend)
    }

    bobbers.forEach((object, index) => {
      const base = bobBase[index]
      const amp = still() ? 0 : 0.045
      const target = base + Math.sin(motionTime * 0.85 + index) * amp
      object.position.y = still() ? THREE.MathUtils.damp(object.position.y, base, 4, dt) : target
    })

    controls.enableDamping = !reduced
    controls.update()
    renderer.render(scene, camera)
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
