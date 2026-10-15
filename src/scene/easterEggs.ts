import * as THREE from 'three'
import type { Disposal } from './disposal'
import { lakeRadius, terrainHeight, WATER_Y } from './ground'

export type SecretTarget = {
  id: string
  label: string
  object: THREE.Object3D
  kind: 'duck' | 'rabbit' | 'turtle' | 'boat'
  part?: THREE.Object3D
}

type TreeTarget = { position: THREE.Vector3; sway: (amount: number) => void }

export function createEasterEggs(
  canvas: HTMLCanvasElement,
  world: HTMLElement,
  scene: THREE.Scene,
  camera: THREE.Camera,
  _shore: THREE.Object3D,
  targets: SecretTarget[],
  tree: TreeTarget,
  disposal: Disposal,
  isStill: () => boolean,
) {
  const buttons: HTMLButtonElement[] = []
  const active = new Map<string, number>()
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -WATER_Y)
  const point = new THREE.Vector3()
  const projected = new THREE.Vector3()
  const textureCanvas = document.createElement('canvas')
  textureCanvas.width = textureCanvas.height = 128
  const ctx = textureCanvas.getContext('2d')
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 36, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.55, 'rgba(255,255,255,.85)')
    gradient.addColorStop(0.72, 'rgba(255,255,255,.22)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)
  }
  const rippleMap = disposal.tex(new THREE.CanvasTexture(textureCanvas))
  const ringGeometry = disposal.geo(new THREE.PlaneGeometry(1, 1))
  ringGeometry.rotateX(-Math.PI / 2)
  const ripples = Array.from({ length: 3 }, () => {
    const rings = Array.from({ length: 2 }, () => {
      const material = disposal.mat(new THREE.MeshBasicMaterial({
        map: rippleMap, transparent: true, depthWrite: false, opacity: 0,
        color: '#f4faf5', side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      }))
      const mesh = new THREE.Mesh(ringGeometry, material)
      mesh.position.y = WATER_Y + 0.018
      mesh.visible = false
      mesh.renderOrder = 3
      scene.add(mesh)
      return { mesh, material }
    })
    return { rings, started: -Infinity }
  })

  const leafGeometry = disposal.geo(new THREE.PlaneGeometry(0.1, 0.16))
  const leafMaterial = disposal.mat(new THREE.MeshBasicMaterial({ color: '#d7b66a', side: THREE.DoubleSide }))
  const leaves = Array.from({ length: 3 }, (_, index) => {
    const mesh = new THREE.Mesh(leafGeometry, leafMaterial)
    mesh.visible = false
    mesh.position.copy(tree.position)
    scene.add(mesh)
    return { mesh, index }
  })

  const entries = [
    ...targets.map((target) => ({ id: target.id, label: target.label, point: new THREE.Vector3(), radius: target.kind === 'boat' ? 42 : 25 })),
    { id: 'tree', label: 'Rustle the birch tree', point: tree.position, radius: 30 },
    { id: 'water', label: 'Make a ripple in the lake', point: new THREE.Vector3(0, WATER_Y, 2.8), radius: 24 },
  ]
  for (const entry of entries) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'scene-secret'
    button.setAttribute('aria-label', entry.label)
    button.title = entry.label
    button.addEventListener('click', () => trigger(entry.id, entry.point))
    world.appendChild(button)
    buttons.push(button)
  }

  function screenPosition(position: THREE.Vector3) {
    projected.copy(position).project(camera)
    return {
      x: (projected.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-projected.y * 0.5 + 0.5) * canvas.clientHeight,
      visible: projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1,
    }
  }

  function waterAt(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect()
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
    if (!raycaster.ray.intersectPlane(plane, point)) return null
    if (lakeRadius(point.x, point.z) > 0.96 || terrainHeight(point.x, point.z) >= WATER_Y - 0.03) return null
    return point.clone()
  }

  function trigger(id: string, position: THREE.Vector3) {
    const now = performance.now()
    if (id === 'water') {
      const slot = ripples.find((ripple) => now - ripple.started > 1400)
      if (!slot) return
      slot.started = now
      for (const { mesh } of slot.rings) mesh.position.set(position.x, WATER_Y + 0.018, position.z)
    } else {
      if (now - (active.get(id) ?? -Infinity) < 1400) return
      active.set(id, now)
    }
    if (isStill()) {
      const pos = screenPosition(position)
      const flash = document.createElement('span')
      flash.className = 'scene-flash'
      flash.textContent = '✦'
      flash.style.left = `${pos.x}px`
      flash.style.top = `${pos.y}px`
      world.appendChild(flash)
      window.setTimeout(() => flash.remove(), 700)
    }
  }

  let pointer: { id: number; x: number; y: number; time: number } | null = null
  let multiple = false
  function onDown(event: PointerEvent) {
    if (pointer) { multiple = true; return }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() }
    multiple = false
  }
  function onUp(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) { pointer = null; return }
    const tap = !multiple && performance.now() - pointer.time < 500 && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 8
    pointer = null
    if (!tap) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    let nearest: { id: string; distance: number; point: THREE.Vector3 } | null = null
    for (const entry of entries) {
      if (entry.id === 'water') continue
      const pos = screenPosition(entry.point)
      if (!pos.visible) continue
      const distance = Math.hypot(x - pos.x, y - pos.y)
      if (distance < entry.radius && (!nearest || distance < nearest.distance)) nearest = { id: entry.id, distance, point: entry.point }
    }
    if (nearest) trigger(nearest.id, nearest.point)
    else {
      const water = waterAt(event.clientX, event.clientY)
      if (water) trigger('water', water)
    }
  }
  function onCancel() { pointer = null; multiple = true }
  function onMove(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || pointer) return
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const nearTarget = entries.some((entry) => {
      if (entry.id === 'water') return false
      const pos = screenPosition(entry.point)
      return pos.visible && Math.hypot(x - pos.x, y - pos.y) < entry.radius
    })
    canvas.style.cursor = nearTarget || waterAt(event.clientX, event.clientY) ? 'pointer' : ''
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onCancel)
  canvas.addEventListener('pointermove', onMove)

  function update() {
    const now = performance.now()
    targets.forEach((target, index) => {
      const entry = entries[index]
      target.object.getWorldPosition(entry.point)
      entry.point.y += target.kind === 'boat' ? 1.7 : target.kind === 'rabbit' ? 0.35 : 0.22
      const phase = Math.min(1, (now - (active.get(target.id) ?? -Infinity)) / 1100)
      const move = !isStill() && phase >= 0 && phase < 1 ? Math.sin(phase * Math.PI) : 0
      if (target.kind === 'duck') target.object.rotation.z = move * 0.18 * Math.sin(phase * Math.PI * 6)
      if (target.kind === 'rabbit') target.object.position.y = terrainHeight(target.object.position.x, target.object.position.z) + move * 0.45
      if (target.kind === 'turtle' && target.part) target.part.position.z = 0.24 - move * 0.13
      if (target.kind === 'boat') {
        target.object.rotation.z = move * 0.055 * Math.sin(phase * Math.PI * 4)
        if (target.part) target.part.rotation.y = -0.42 + move * 0.4 * Math.sin(phase * Math.PI * 7)
      }
    })
    const treePhase = Math.min(1, (now - (active.get('tree') ?? -Infinity)) / 1300)
    const sway = !isStill() && treePhase >= 0 && treePhase < 1 ? Math.sin(treePhase * Math.PI) * Math.sin(treePhase * Math.PI * 8) * 0.055 : 0
    tree.sway(sway)
    for (const { mesh, index } of leaves) {
      const show = !isStill() && treePhase > 0.12 && treePhase < 1
      mesh.visible = show
      if (show) {
        const t = (treePhase - 0.12) / 0.88
        mesh.position.set(tree.position.x + (index - 1) * 0.27 + t * (index - 1) * 0.5, tree.position.y + 0.3 - t * 1.3, tree.position.z + index * 0.12)
        mesh.rotation.set(0, t * 5 + index, t * 7)
      }
    }
    for (const ripple of ripples) {
      ripple.rings.forEach(({ mesh, material }, index) => {
        const phase = (now - ripple.started) / 1200 - index * 0.22
        mesh.visible = !isStill() && phase > 0 && phase < 1
        if (mesh.visible) {
          mesh.scale.setScalar(0.45 + phase * 2.2)
          material.opacity = Math.sin(phase * Math.PI) * 0.3
        }
      })
    }
    entries.forEach((entry, index) => {
      const pos = screenPosition(entry.point)
      const button = buttons[index]
      button.hidden = !pos.visible
      button.style.left = `${pos.x}px`
      button.style.top = `${pos.y}px`
    })
  }

  return {
    update,
    transparentObjects: ripples.flatMap((ripple) => ripple.rings.map(({ mesh }) => mesh)),
    dispose() {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('pointermove', onMove)
      canvas.style.cursor = ''
      buttons.forEach((button) => button.remove())
      world.querySelectorAll('.scene-flash').forEach((flash) => flash.remove())
      ripples.forEach((ripple) => ripple.rings.forEach(({ mesh }) => scene.remove(mesh)))
      leaves.forEach(({ mesh }) => scene.remove(mesh))
    },
  }
}
