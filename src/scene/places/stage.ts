import * as THREE from 'three'
import type { Atlas } from '../assets'
import { surfaceMaterial } from '../assets'
import type { Disposal } from '../disposal'
import { standard } from '../disposal'
import { terrainHeight } from '../ground'
import { addMesh } from '../parts'

/** A small outdoor stage: plank deck, light truss, speaker stacks, and a mic up front. */
export function buildStage(
  parent: THREE.Object3D,
  disposal: Disposal,
  atlas: Atlas,
  x: number,
  z: number,
) {
  const ground = terrainHeight(x, z)
  const group = new THREE.Group()
  group.position.set(x, ground, z)
  parent.add(group)

  const wood = surfaceMaterial(disposal, atlas.weathered)
  const dark = surfaceMaterial(disposal, atlas.darkWood, { roughness: 0.8 })
  const black = standard(disposal, { color: '#23211f', roughness: 0.6, metalness: 0.1 })
  const cone = standard(disposal, { color: '#3a3733', roughness: 0.45, metalness: 0.3 })
  const chrome = standard(disposal, { color: '#c9ccc9', roughness: 0.25, metalness: 0.85 })
  const warm = standard(disposal, {
    color: '#ffd9a0',
    emissive: '#ffb45c',
    emissiveIntensity: 1.6,
    roughness: 0.3,
  })

  // Deck: loose boards over a dark skirt, with a two-step stair on the side.
  const width = 3.6
  const depth = 2.3
  const top = 0.34
  addMesh(group, disposal.geo(new THREE.BoxGeometry(width, 0.24, depth)), dark, [0, 0.18, 0])
  const board = disposal.geo(new THREE.BoxGeometry(width + 0.04, 0.05, 0.17))
  const boards = 13
  for (let i = 0; i < boards; i++) {
    const bz = -depth / 2 + 0.09 + (i / (boards - 1)) * (depth - 0.18)
    const plank = addMesh(group, board, wood, [0, top, bz])
    plank.position.x = ((i * 5) % 3) * 0.01 - 0.01
  }
  const step = disposal.geo(new THREE.BoxGeometry(0.42, 0.06, 0.7))
  addMesh(group, step, wood, [width / 2 + 0.24, 0.22, 0.5])
  addMesh(group, step, wood, [width / 2 + 0.5, 0.1, 0.5])

  // Truss across the back with four warm cans aimed at the deck.
  const postGeo = disposal.geo(new THREE.BoxGeometry(0.12, 2.3, 0.12))
  const trussY = top + 2.3
  for (const side of [-1, 1]) {
    addMesh(group, postGeo, black, [side * 1.62, top + 1.15, -depth / 2 + 0.12])
    addMesh(group, disposal.geo(new THREE.BoxGeometry(0.34, 0.05, 0.34)), black, [side * 1.62, top + 0.03, -depth / 2 + 0.12])
  }
  const chord = disposal.geo(new THREE.BoxGeometry(3.36, 0.05, 0.05))
  for (const [cy, cz] of [
    [0, 0],
    [0.24, 0],
    [0, 0.22],
    [0.24, 0.22],
  ] as const) {
    addMesh(group, chord, chrome, [0, trussY - 0.12 + cy, -depth / 2 + 0.01 + cz])
  }
  const lace = disposal.geo(new THREE.CylinderGeometry(0.012, 0.012, 0.33, 4))
  for (let i = 0; i < 12; i++) {
    const lx = -1.55 + i * 0.28
    const brace = addMesh(group, lace, chrome, [lx, trussY, -depth / 2 + 0.01], { cast: false })
    brace.rotation.z = i % 2 === 0 ? 0.7 : -0.7
  }
  const can = disposal.geo(new THREE.CylinderGeometry(0.08, 0.1, 0.22, 10))
  const lens = disposal.geo(new THREE.CircleGeometry(0.075, 10))
  for (const lx of [-1.05, -0.35, 0.35, 1.05]) {
    const light = new THREE.Group()
    light.position.set(lx, trussY - 0.26, -depth / 2 + 0.22)
    light.rotation.x = 0.85
    group.add(light)
    addMesh(light, can, black, [0, 0, 0])
    addMesh(light, lens, warm, [0, -0.112, 0], { cast: false, rotation: [Math.PI / 2, 0, 0] })
  }
  const wash = new THREE.PointLight('#ffc27a', 1.2, 4.2, 2)
  wash.position.set(0, top + 1.3, 0.1)
  group.add(wash)

  // Bunting strung between the posts.
  const flag = disposal.geo(new THREE.ConeGeometry(0.07, 0.18, 3))
  flag.rotateX(Math.PI)
  const bunting = ['#c4523a', '#f0c43a', '#3f6f7a', '#f4efe6']
  const flagMats = bunting.map((color) => standard(disposal, { color, roughness: 0.8 }))
  for (let i = 0; i < 13; i++) {
    const u = i / 12
    const fx = -1.5 + u * 3
    const sag = Math.sin(u * Math.PI) * 0.22
    addMesh(group, flag, flagMats[i % flagMats.length], [fx, trussY - 0.34 - sag, -depth / 2 + 0.36], {
      cast: false,
    })
  }

  // Speaker stacks at the front corners.
  const cabinet = disposal.geo(new THREE.BoxGeometry(0.46, 0.5, 0.4))
  const woofer = disposal.geo(new THREE.CircleGeometry(0.14, 14))
  const tweeter = disposal.geo(new THREE.CircleGeometry(0.05, 10))
  for (const side of [-1, 1]) {
    for (let level = 0; level < 2; level++) {
      const cy = top + 0.27 + level * 0.52
      const cx = side * 1.45
      const cz = depth / 2 - 0.3
      const box = addMesh(group, cabinet, black, [cx, cy, cz])
      box.rotation.y = -side * 0.2
      const facePoint = new THREE.Vector3(0, 0, 0.201).applyEuler(box.rotation).add(box.position)
      addMesh(group, level === 0 ? woofer : tweeter, cone, [facePoint.x, cy - (level === 0 ? 0.04 : -0.1), facePoint.z], {
        cast: false,
        rotation: [0, box.rotation.y, 0],
      })
      if (level === 1) {
        addMesh(group, woofer, cone, [facePoint.x, cy - 0.06, facePoint.z], {
          cast: false,
          rotation: [0, box.rotation.y, 0],
        }).scale.setScalar(0.7)
      }
    }
  }

  // Mic stand, amp and stool.
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.12, 0.14, 0.03, 10)), black, [0, top + 0.03, 0.55])
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.014, 0.014, 1.25, 5)), chrome, [0, top + 0.65, 0.55])
  const boom = addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.01, 0.01, 0.34, 5)), chrome, [0, top + 1.3, 0.66])
  boom.rotation.x = 1.1
  addMesh(group, disposal.geo(new THREE.CapsuleGeometry(0.025, 0.06, 2, 6)), black, [0, top + 1.36, 0.8], {
    rotation: [1.1, 0, 0],
  })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.56, 0.44, 0.3)), black, [0.9, top + 0.22, -0.55])
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.5, 0.26, 0.02)), cone, [0.9, top + 0.2, -0.39], { cast: false })
  addMesh(group, disposal.geo(new THREE.BoxGeometry(0.5, 0.05, 0.02)), wood, [0.9, top + 0.39, -0.39], { cast: false })
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12)), wood, [-0.55, top + 0.55, -0.3])
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.02, 0.03, 0.52, 5)), chrome, [-0.55, top + 0.27, -0.3])

  // The old gig-poster post, now planted beside the stage.
  const postX = -width / 2 - 0.45
  addMesh(group, disposal.geo(new THREE.CylinderGeometry(0.06, 0.07, 1.5, 6)), wood, [postX, 0.75, 0.3])
  const posterA = standard(disposal, { color: '#b85a48', roughness: 0.84, metalness: 0.02 })
  const posterB = standard(disposal, { color: '#d9c7a2', roughness: 0.84, metalness: 0.02 })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.42, 0.58)), posterA, [postX, 1.05, 0.38], {
    cast: false,
  })
  addMesh(group, disposal.geo(new THREE.PlaneGeometry(0.38, 0.5)), posterB, [postX, 0.58, 0.36], {
    cast: false,
    rotation: [0, 0.08, 0],
  })

  return {
    label: new THREE.Vector3(x, ground + 3.2, z),
    focus: new THREE.Vector3(x, ground + 0.8, z),
  }
}
