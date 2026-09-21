import * as THREE from 'three'

export type ProjectedAnchor = {
  id: string
  position: THREE.Vector3
  element: HTMLButtonElement
}

const view = new THREE.Vector3()
const direction = new THREE.Vector3()

export function projectAnchors(
  camera: THREE.Camera,
  world: HTMLElement,
  anchors: ProjectedAnchor[],
) {
  const width = world.clientWidth
  const height = world.clientHeight
  if (width === 0 || height === 0) return

  camera.getWorldDirection(direction)

  for (const anchor of anchors) {
    view.copy(anchor.position).applyMatrix4(camera.matrixWorldInverse)
    const toPoint = anchor.position.clone().sub(camera.position)
    const facingAway = toPoint.dot(direction) <= 0.05
    const ndc = anchor.position.clone().project(camera)
    const offscreen = ndc.x < -1.02 || ndc.x > 1.02 || ndc.y < -1.02 || ndc.y > 1.02
    if (facingAway || offscreen || view.z > 0) {
      anchor.element.hidden = true
      continue
    }
    const margin = 22
    const x = Math.min(width - margin, Math.max(margin, (ndc.x * 0.5 + 0.5) * width))
    const y = Math.min(height - margin, Math.max(margin, (-ndc.y * 0.5 + 0.5) * height))
    anchor.element.hidden = false
    anchor.element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
  }
}

export function placeCard(
  camera: THREE.Camera,
  world: HTMLElement,
  point: THREE.Vector3,
  card: HTMLElement,
) {
  const width = world.clientWidth
  const height = world.clientHeight
  const ndc = point.clone().project(camera)
  let x = (ndc.x * 0.5 + 0.5) * width
  let y = (-ndc.y * 0.5 + 0.5) * height
  const cardWidth = card.offsetWidth || 278
  const cardHeight = card.offsetHeight || 140
  x = Math.min(width - cardWidth / 2 - 12, Math.max(cardWidth / 2 + 12, x))
  const above = y - cardHeight - 28
  if (above < 12) {
    card.style.transform = 'translate(-50%, 18px)'
    y = Math.min(height - cardHeight - 12, y)
  } else {
    card.style.transform = 'translate(-50%, -100%)'
    y = Math.max(cardHeight + 12, y - 22)
  }
  card.style.left = `${x}px`
  card.style.top = `${y}px`
  card.hidden = false
}
