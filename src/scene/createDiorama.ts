import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { buildAnimals } from './animals'
import { placeCard, projectAnchors, type ProjectedAnchor } from './anchors'
import { loadAtlas } from './assets'
import { Disposal } from './disposal'
import { createEasterEggs, type SecretTarget } from './easterEggs'
import { FOG } from './ground'
import { buildLake, buildWatercraft, setWaterTime } from './lake'
import { buildRiver } from './river'
import { buildPath } from './paths'
import { WaterReflection } from './reflection'
import { buildGraveyard, buildStone } from './places/graveyard'
import { buildCottage, buildVillageGreen } from './places/village'
import { buildHouse } from './places/house'
import { buildMicrosoft } from './places/microsoft'
import { buildQueens } from './places/queens'
import { buildRange } from './places/range'
import { buildSeattle } from './places/seattle'
import { buildStage } from './places/stage'
import { buildShore } from './shore'
import { windUniforms } from './trees'

export type AnchorInput = {
  id: string
  name: string
  position: [number, number]
  element: HTMLButtonElement
  icon?: string
  place?: 'stone' | 'cottage'
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
const PAN_MS = 1200
const PAN_LIMIT = 5.5
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

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220)
  camera.position.copy(HOME_POS)

  let mobile = window.matchMedia('(max-width: 700px)').matches
  let quality: 'balanced' | 'low' = 'balanced'
  const pixelRatio = () => Math.min(window.devicePixelRatio, quality === 'low' ? 1 : mobile ? 1.25 : 1.5)
  renderer.setPixelRatio(pixelRatio())
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.92
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
  scene.environmentIntensity = 0.82

  let icons = new Map<string, THREE.Texture>()
  try {
    icons = await loadIcons(disposal, options.anchors.map((anchor) => anchor.icon))
  } catch (error) {
    disposal.dispose()
    renderer.dispose()
    options.onFail(error)
    return inert()
  }

  const hemi = new THREE.HemisphereLight('#dfe9f2', '#5f6f45', 0.3)
  scene.add(hemi)
  // Late-afternoon sun, low enough to throw long, readable shadows across the lawns.
  const sun = new THREE.DirectionalLight('#ffcf9a', 3.1)
  sun.position.set(-20, 13, 9)
  sun.target.position.set(0.4, 0.6, 3.2)
  scene.add(sun.target)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.radius = 3
  sun.shadow.bias = -0.0002
  sun.shadow.normalBias = 0.025
  sun.shadow.intensity = 0.82
  sun.shadow.camera.near = 2
  sun.shadow.camera.far = 70
  sun.shadow.camera.left = -32
  sun.shadow.camera.right = 32
  sun.shadow.camera.top = 32
  sun.shadow.camera.bottom = -32
  sun.shadow.camera.updateProjectionMatrix()
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#b9cfe6', 0.35)
  fill.position.set(16, 8, -10)
  scene.add(fill)

  const shore = buildShore(scene, disposal, atlas)
  const water = buildLake(scene, disposal, atlas)
  const river = buildRiver(scene, disposal, atlas)
  buildPath(scene, disposal, atlas)

  const built: Built[] = []
  const bobbers: { object: THREE.Object3D; base: number; phase: number; amplitude: number }[] = []
  const bob = (object: THREE.Object3D, amplitude = 0.04) => {
    bobbers.push({ object, base: object.position.y, phase: bobbers.length * 1.17, amplitude })
  }
  const animators: Array<(time: number) => void> = []
  const secretTargets: SecretTarget[] = []
  const animate = (update: (time: number) => void) => {
    animators.push(update)
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
        {
          const sailboat = buildSeattle(scene, disposal, atlas, x, z, bob)
          place = sailboat
          secretTargets.push({ id: 'sailboat', label: 'Rock the sailboat', object: sailboat.boat, kind: 'boat', part: sailboat.flag })
        }
        break
      case 'microsoft':
        place = buildMicrosoft(scene, disposal, atlas, x, z)
        break
      default:
        if (anchor.place === 'cottage') {
          place = buildCottage(scene, disposal, atlas, x, z, anchor.icon ? icons.get(anchor.icon) : undefined)
        } else {
          place = buildStone(
            scene,
            disposal,
            atlas,
            x,
            z,
            anchor.id,
            anchor.icon ? icons.get(anchor.icon) : undefined,
          )
        }
        break
    }
    built.push({ id: anchor.id, label: place.label, focus: place.focus, element: anchor.element })
  }

  buildGraveyard(scene, disposal, atlas)
  buildVillageGreen(scene, disposal, atlas)
  buildWatercraft(scene, disposal, atlas, bob, animate)
  secretTargets.push(...buildAnimals(scene, disposal, bob))

  const reflectionHidden: THREE.Object3D[] = [water, river]
  const reflection = new WaterReflection(reflectionHidden)

  // Multisampled HDR target: crisp edges without a post-AA smear.
  const composerTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 2 })
  const composer = new EffectComposer(renderer, composerTarget)
  composer.addPass(new RenderPass(scene, camera))
  const gtao = new GTAOPass(scene, camera, 512, 512)
  gtao.blendIntensity = 0.85
  gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1, samples: 8 })
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 8 })
  composer.addPass(gtao)
  // Glass, ripples and the stream are see-through; keep them out of the occlusion buffer.
  const seeThrough: THREE.Object3D[] = []
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material
    if (material && !Array.isArray(material) && material.transparent) seeThrough.push(object)
  })
  const renderOcclusion = gtao.render.bind(gtao)
  gtao.render = (...args: Parameters<typeof renderOcclusion>) => {
    const visibility = seeThrough.map((object) => object.visible)
    for (const object of seeThrough) object.visible = false
    renderOcclusion(...args)
    seeThrough.forEach((object, index) => { object.visible = visibility[index] })
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.12, 0.5, 1.2)
  composer.addPass(bloom)
  const outputPass = new OutputPass()
  composer.addPass(outputPass)
  const grade = new ShaderPass(GRADE_SHADER)
  composer.addPass(grade)

  const projected: ProjectedAnchor[] = built.map((item) => ({
    id: item.id,
    position: item.label,
    element: item.element,
  }))

  let paused = false
  let reduced = options.reducedMotion
  let openId: string | null = null
  let card: HTMLElement | null = null
  let frame = 0
  let disposed = false
  let ready = false
  let visible = !document.hidden
  let dirty = true
  let settling = false
  let lastRender = 0
  let lastTick = 0
  let renderedFrames = 0
  let sampleStart = 0
  let sampledFrames = 0
  const restPos = HOME_POS.clone()
  const restTarget = HOME_TARGET.clone()
  let dragging = false
  let motionTime = 0
  let pan: {
    fromPos: THREE.Vector3
    fromTarget: THREE.Vector3
    toPos: THREE.Vector3
    toTarget: THREE.Vector3
    elapsed: number
  } | null = null

  const framedPose = (focus: THREE.Vector3 | null) => {
    const toPos = restPos.clone()
    const toTarget = restTarget.clone()
    if (!focus) return { toPos, toTarget }
    const travel = focus.clone().sub(restTarget)
    const distance = travel.length()
    if (distance > PAN_LIMIT) travel.multiplyScalar(PAN_LIMIT / distance)
    toPos.add(travel)
    toTarget.add(travel)
    return { toPos, toTarget }
  }

  const startPan = (focus: THREE.Vector3 | null) => {
    const { toPos, toTarget } = framedPose(focus)
    if (reduced) {
      pan = null
      camera.position.copy(toPos)
      controls.target.copy(toTarget)
      controls.update()
      settling = false
      return
    }
    const same =
      camera.position.distanceToSquared(toPos) < 0.0004 &&
      controls.target.distanceToSquared(toTarget) < 0.0004
    if (same) {
      pan = null
      settling = false
      return
    }
    pan = {
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos,
      toTarget,
      elapsed: 0,
    }
    settling = true
  }

  const applyPan = (dt: number) => {
    if (!pan) return
    const step = dt > 0 ? Math.min(0.05, dt) : 0.016
    pan.elapsed += step
    const t = Math.min(1, pan.elapsed / (PAN_MS / 1000))
    const eased = t * t * (3 - 2 * t)
    camera.position.lerpVectors(pan.fromPos, pan.toPos, eased)
    controls.target.lerpVectors(pan.fromTarget, pan.toTarget, eased)
    settling = t < 1
    if (t >= 1) pan = null
  }

  const still = () => paused || reduced
  const schedule = () => {
    if (!disposed && visible && !frame) frame = requestAnimationFrame(tick)
  }
  const invalidate = () => {
    dirty = true
    schedule()
  }
  const onVisibility = () => {
    visible = !document.hidden
    if (!visible) {
      cancelAnimationFrame(frame)
      frame = 0
      sampleStart = 0
      sampledFrames = 0
    } else {
      lastTick = 0
      invalidate()
    }
  }
  document.addEventListener('visibilitychange', onVisibility)
  controls.addEventListener('change', invalidate)

  controls.addEventListener('start', () => {
    dragging = true
    pan = null
    settling = false
    invalidate()
  })
  controls.addEventListener('end', () => {
    dragging = false
    restPos.copy(camera.position)
    restTarget.copy(controls.target)
    invalidate()
  })

  const resize = () => {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width === 0 || height === 0) return
    mobile = window.matchMedia('(max-width: 700px)').matches
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(pixelRatio())
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
    const pixels = renderer.getDrawingBufferSize(new THREE.Vector2())
    reflection.setSize(pixels.x, pixels.y, quality === 'low' ? 0.15 : 0.22)
    ;(grade.uniforms as { uTexel: { value: THREE.Vector2 } }).uTexel.value.set(1 / pixels.x, 1 / pixels.y)
    invalidate()
  }
  const observer = new ResizeObserver(resize)
  observer.observe(options.world)
  resize()

  const easterEggs = createEasterEggs(canvas, options.world, scene, camera, shore.mesh, secretTargets, shore.specialTree, disposal, still)
  seeThrough.push(...easterEggs.transparentObjects)
  reflectionHidden.push(...easterEggs.transparentObjects)

  function tick(now: number) {
    frame = 0
    if (disposed || !visible) return
    const animating = !still()
    const minFrameTime = 1000 / (quality === 'low' ? 24 : 30)
    if (animating && now - lastRender < minFrameTime) {
      schedule()
      return
    }
    if (!animating && !dirty && !settling) return
    dirty = false
    const dt = lastTick ? Math.min(0.05, (now - lastTick) / 1000) : 0
    lastTick = now
    lastRender = now
    if (!still()) motionTime += dt

    setWaterTime(water, motionTime)
    setWaterTime(river, motionTime)
    windUniforms.uWind.value = motionTime
    if (!still()) for (const update of animators) update(motionTime)
    for (const item of bobbers) {
      const target = still()
        ? item.base
        : item.base + Math.sin(motionTime * 0.8 + item.phase) * item.amplitude
      item.object.position.y = still()
        ? THREE.MathUtils.damp(item.object.position.y, item.base, 5, dt)
        : target
    }

    controls.enableDamping = !reduced && !pan
    controls.update()
    if (!dragging) applyPan(dt)
    easterEggs.update()
    if (!animating) reflection.update(renderer, scene, camera)
    composer.render()
    // During motion, reuse this frame's shadow map and update the mirror less often.
    if (animating && renderedFrames % (quality === 'low' ? 6 : 3) === 0) reflection.update(renderer, scene, camera)
    renderedFrames++
    projectAnchors(camera, options.world, projected)
    if (card && openId) {
      const point = built.find((item) => item.id === openId)?.label
      if (point) placeCard(camera, options.world, point, card)
    } else if (card) {
      card.hidden = true
    }

    if (!ready && !disposed && (renderedFrames >= 2 || !animating)) {
      ready = true
      options.onProgress(1)
      options.onReady()
    }
    if (animating) {
      if (!sampleStart) sampleStart = now
      sampledFrames++
      if (quality === 'balanced' && now - sampleStart >= 3000) {
        const fps = sampledFrames * 1000 / (now - sampleStart)
        if (fps < 24) {
          quality = 'low'
          gtao.enabled = false
          bloom.enabled = false
          sun.shadow.mapSize.set(1024, 1024)
          sun.shadow.map?.dispose()
          sun.shadow.map = null
          resize()
        }
        sampleStart = now
        sampledFrames = 0
      }
      schedule()
    } else if (dirty || settling) {
      schedule()
    }
  }
  schedule()

  return {
    dispose() {
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisibility)
      controls.removeEventListener('change', invalidate)
      observer.disconnect()
      easterEggs.dispose()
      controls.dispose()
      gtao.dispose()
      bloom.dispose()
      outputPass.dispose()
      grade.dispose()
      composer.dispose()
      composerTarget.dispose()
      reflection.dispose()
      disposal.dispose()
      hemi.dispose()
      sun.dispose()
      fill.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
    setPaused(next) {
      paused = next
      lastTick = 0
      invalidate()
    },
    setReducedMotion(next) {
      reduced = next
      controls.enableDamping = !next
      lastTick = 0
      invalidate()
    },
    resetView() {
      pan = null
      settling = false
      restPos.copy(HOME_POS)
      restTarget.copy(HOME_TARGET)
      camera.position.copy(HOME_POS)
      controls.target.copy(HOME_TARGET)
      controls.update()
      invalidate()
    },
    setHovered() {},
    setCard(id, element) {
      const changed = openId !== id
      openId = id
      card = element
      if (card && !id) card.hidden = true
      if (changed) {
        const focus = id ? built.find((item) => item.id === id)?.focus ?? null : null
        startPan(focus)
      }
      invalidate()
    },
  }
}

/** Display-space grade: gentle S-curve, a touch more saturation, split toning, and a light sharpen. */
const GRADE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
  },
  vertexShader: `varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `uniform sampler2D tDiffuse;
    uniform vec2 uTexel;
    varying vec2 vUv;
    void main() {
      vec4 source = texture2D(tDiffuse, vUv);
      vec3 color = source.rgb;
      vec3 around = texture2D(tDiffuse, vUv + vec2(uTexel.x, 0.0)).rgb
        + texture2D(tDiffuse, vUv - vec2(uTexel.x, 0.0)).rgb
        + texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y)).rgb
        + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y)).rgb;
      color += (color - around * 0.25) * 0.45;
      color = clamp(color, 0.0, 1.0);
      color = mix(color, color * color * (3.0 - 2.0 * color), 0.3);
      float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luma), color, 1.12);
      color += vec3(-0.014, 0.0, 0.018) * (1.0 - luma) + vec3(0.018, 0.008, -0.014) * luma;
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), source.a);
    }`,
}

async function loadIcons(disposal: Disposal, urls: Array<string | undefined>) {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))]
  const loader = new THREE.TextureLoader()
  const icons = new Map<string, THREE.Texture>()
  await Promise.all(
    unique.map(async (url) => {
      const texture = await loader.loadAsync(url)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 8
      icons.set(url, disposal.tex(texture))
    }),
  )
  return icons
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
