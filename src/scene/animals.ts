import * as THREE from 'three'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { WATER_Y, terrainHeight } from './ground'

type Bob = (object: THREE.Object3D, amplitude?: number) => void

export function buildAnimals(parent: THREE.Object3D, disposal: Disposal, bob: Bob) {
  const interactive: Array<{ id: string; label: string; object: THREE.Group; kind: 'duck' | 'rabbit' | 'turtle'; part?: THREE.Object3D }> = []
  const cream = standard(disposal, { color: '#f3eadc', roughness: 0.78 })
  const tan = standard(disposal, { color: '#c4a06a', roughness: 0.8 })
  const brown = standard(disposal, { color: '#8a5a32', roughness: 0.82 })
  const green = standard(disposal, { color: '#2f6d45', roughness: 0.7 })
  const beak = standard(disposal, { color: '#e2a23a', roughness: 0.55 })
  const heronBody = standard(disposal, { color: '#e4e7ea', roughness: 0.62 })
  const heronDark = standard(disposal, { color: '#3c4650', roughness: 0.6 })
  const shell = standard(disposal, { color: '#5f7348', roughness: 0.84 })
  const eye = standard(disposal, { color: '#1c1a18', roughness: 0.3 })
  const blush = standard(disposal, { color: '#e8b4b0', roughness: 0.8 })
  const collar = standard(disposal, { color: '#f4efe6', roughness: 0.7 })
  const wingMallard = standard(disposal, { color: '#6f6a62', roughness: 0.8 })
  const wingHen = standard(disposal, { color: '#9c7b50', roughness: 0.82 })
  const turtle = standard(disposal, { color: '#8ea36a', roughness: 0.8 })

  const mallard = makeDuck(disposal, brown, green, beak, eye, wingMallard, collar)
  const hen = makeDuck(disposal, tan, tan, beak, eye, wingHen)
  const ducks: Array<[number, number, number, THREE.Group]> = [
    [-1.5, -1.6, 0.4, mallard],
    [-0.7, -1.05, 1.1, mallard],
    [-1.9, -0.7, -0.5, hen],
    [7.1, 0.9, 0.2, hen],
    [7.7, 1.55, 1.4, mallard],
    [6.5, 0.35, -0.8, hen],
  ]
  ducks.forEach(([x, z, yaw, source], index) => {
    const duck = source.clone(true)
    duck.position.set(x, WATER_Y + 0.02, z)
    duck.rotation.y = yaw
    duck.scale.setScalar(index % 2 === 0 ? 1.15 : 1)
    parent.add(duck)
    bob(duck, 0.02)
    interactive.push({ id: `duck-${index}`, label: 'Make a duck wiggle', object: duck, kind: 'duck' })
  })

  const rabbit = makeRabbit(disposal, cream, blush, eye)
  const bunny = makeRabbit(disposal, tan, blush, eye)
  ;[
    [1.5, 15.6, 0.6, rabbit],
    [-5.1, 15.9, -0.4, bunny],
    [2.7, 16.7, 1.8, rabbit],
  ].forEach(([x, z, yaw, source], index) => {
    const animal = (source as THREE.Group).clone(true)
    animal.position.set(x as number, terrainHeight(x as number, z as number), z as number)
    animal.rotation.y = yaw as number
    parent.add(animal)
    interactive.push({ id: `rabbit-${index}`, label: 'Make a rabbit hop', object: animal, kind: 'rabbit' })
  })

  const bird = makeHeron(disposal, heronBody, heronDark, beak, eye)
  bird.position.set(-4.7, terrainHeight(-4.7, 11.15), 11.15)
  bird.rotation.y = 0.8
  parent.add(bird)

  const shellback = makeTurtle(disposal, shell, turtle)
  shellback.position.set(-5.5, terrainHeight(-5.5, 11.55) + 0.02, 11.55)
  shellback.rotation.y = -0.4
  parent.add(shellback)
  interactive.push({ id: 'turtle', label: 'Make the turtle peek', object: shellback, kind: 'turtle', part: shellback.userData.head as THREE.Object3D })
  return interactive
}

function makeDuck(
  disposal: Disposal,
  body: THREE.Material,
  head: THREE.Material,
  beak: THREE.Material,
  eye: THREE.Material,
  wing: THREE.Material,
  ring?: THREE.Material,
) {
  const group = new THREE.Group()
  const torso = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.22, 12, 8)), body)
  torso.scale.set(1.15, 0.72, 1.55)
  torso.position.set(0, 0.2, 0)
  torso.castShadow = true
  group.add(torso)
  const wingGeo = disposal.geo(new THREE.SphereGeometry(0.16, 10, 6))
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(wingGeo, wing)
    panel.scale.set(0.45, 0.55, 1.45)
    panel.position.set(side * 0.19, 0.25, -0.06)
    panel.rotation.set(-0.15, side * 0.08, side * -0.25)
    panel.castShadow = true
    group.add(panel)
  }
  const tail = new THREE.Mesh(disposal.geo(new THREE.ConeGeometry(0.09, 0.2, 5)), wing)
  tail.rotation.x = -2.2
  tail.position.set(0, 0.3, -0.36)
  group.add(tail)
  const neck = new THREE.Mesh(disposal.geo(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 8)), head)
  neck.position.set(0, 0.32, 0.22)
  neck.rotation.x = 0.3
  group.add(neck)
  if (ring) {
    const band = new THREE.Mesh(disposal.geo(new THREE.TorusGeometry(0.078, 0.016, 5, 12)), ring)
    band.position.set(0, 0.29, 0.21)
    band.rotation.x = Math.PI / 2 + 0.3
    group.add(band)
  }
  const crown = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.12, 10, 8)), head)
  crown.position.set(0, 0.4, 0.26)
  crown.scale.set(0.9, 0.95, 1.1)
  crown.castShadow = true
  group.add(crown)
  const bill = new THREE.Mesh(disposal.geo(new THREE.BoxGeometry(0.08, 0.03, 0.14)), beak)
  bill.position.set(0, 0.37, 0.41)
  bill.rotation.x = 0.12
  bill.castShadow = true
  group.add(bill)
  addEyes(group, disposal, eye, 0.021, [0.075, 0.43, 0.33])
  return group
}

function addEyes(
  group: THREE.Group,
  disposal: Disposal,
  material: THREE.Material,
  size: number,
  [x, y, z]: [number, number, number],
) {
  const geometry = disposal.geo(new THREE.SphereGeometry(size, 6, 4))
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(geometry, material)
    eye.position.set(side * x, y, z)
    group.add(eye)
  }
}

function makeRabbit(disposal: Disposal, fur: THREE.Material, inner: THREE.Material, eye: THREE.Material) {
  const group = new THREE.Group()
  const torso = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.2, 12, 8)), fur)
  torso.scale.set(0.85, 0.78, 1.2)
  torso.position.set(0, 0.2, -0.02)
  torso.castShadow = true
  group.add(torso)
  const haunch = disposal.geo(new THREE.SphereGeometry(0.1, 8, 6))
  const paw = disposal.geo(new THREE.CapsuleGeometry(0.03, 0.1, 2, 5))
  for (const side of [-1, 1]) {
    const hip = new THREE.Mesh(haunch, fur)
    hip.scale.set(0.7, 1, 1.3)
    hip.position.set(side * 0.13, 0.12, -0.1)
    hip.castShadow = true
    const foot = new THREE.Mesh(paw, fur)
    foot.rotation.x = Math.PI / 2
    foot.position.set(side * 0.12, 0.03, -0.02)
    const front = new THREE.Mesh(paw, fur)
    front.scale.setScalar(0.7)
    front.position.set(side * 0.06, 0.07, 0.17)
    group.add(hip, foot, front)
  }
  const crown = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.12, 10, 8)), fur)
  crown.scale.set(0.95, 0.9, 1.05)
  crown.position.set(0, 0.37, 0.17)
  crown.castShadow = true
  group.add(crown)
  const ear = disposal.geo(new THREE.CapsuleGeometry(0.03, 0.16, 3, 6))
  const earInner = disposal.geo(new THREE.CapsuleGeometry(0.016, 0.12, 2, 5))
  for (const side of [-1, 1]) {
    const outer = new THREE.Mesh(ear, fur)
    outer.scale.set(1, 1, 0.55)
    outer.position.set(side * 0.05, 0.57, 0.13)
    outer.rotation.set(-0.25, 0, -side * 0.16)
    outer.castShadow = true
    const pink = new THREE.Mesh(earInner, inner)
    pink.position.set(side * 0.05, 0.575, 0.145)
    pink.rotation.copy(outer.rotation)
    group.add(outer, pink)
  }
  const nose = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.018, 6, 4)), inner)
  nose.position.set(0, 0.36, 0.29)
  group.add(nose)
  addEyes(group, disposal, eye, 0.018, [0.07, 0.41, 0.25])
  const tail = new THREE.Mesh(disposal.geo(new THREE.IcosahedronGeometry(0.06, 1)), fur)
  tail.position.set(0, 0.24, -0.25)
  group.add(tail)
  group.scale.setScalar(1.25)
  return group
}

function makeHeron(
  disposal: Disposal,
  body: THREE.Material,
  dark: THREE.Material,
  beak: THREE.Material,
  eye: THREE.Material,
) {
  const group = new THREE.Group()
  const leg = disposal.geo(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 5))
  const left = new THREE.Mesh(leg, dark)
  left.position.set(-0.06, 0.28, 0)
  const right = new THREE.Mesh(leg, dark)
  right.position.set(0.06, 0.28, 0)
  left.castShadow = true
  right.castShadow = true
  group.add(left, right)
  const torso = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.16, 8, 6)), body)
  torso.scale.set(0.8, 0.7, 1.35)
  torso.position.set(0, 0.62, 0)
  torso.castShadow = true
  group.add(torso)
  const neck = new THREE.Mesh(disposal.geo(new THREE.CylinderGeometry(0.03, 0.045, 0.42, 6)), body)
  neck.position.set(0, 0.88, 0.12)
  neck.rotation.x = 0.4
  neck.castShadow = true
  group.add(neck)
  const crown = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.07, 7, 6)), body)
  crown.position.set(0, 1.08, 0.22)
  crown.castShadow = true
  group.add(crown)
  const bill = new THREE.Mesh(disposal.geo(new THREE.ConeGeometry(0.025, 0.22, 5)), beak)
  bill.rotation.x = Math.PI / 2
  bill.position.set(0, 1.06, 0.36)
  group.add(bill)
  const plume = new THREE.Mesh(disposal.geo(new THREE.ConeGeometry(0.012, 0.18, 4)), dark)
  plume.position.set(0, 1.1, 0.12)
  plume.rotation.x = -1.2
  group.add(plume)
  const wings = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.15, 8, 6)), dark)
  wings.scale.set(0.9, 0.55, 1.3)
  wings.position.set(0, 0.66, -0.05)
  wings.castShadow = true
  group.add(wings)
  addEyes(group, disposal, eye, 0.012, [0.045, 1.1, 0.26])
  group.scale.setScalar(1.35)
  return group
}

function makeTurtle(disposal: Disposal, shellMat: THREE.Material, skin: THREE.Material) {
  const group = new THREE.Group()
  const shell = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.18, 8, 6)), shellMat)
  shell.scale.set(1.15, 0.55, 1.4)
  shell.position.y = 0.12
  shell.castShadow = true
  group.add(shell)
  const head = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.07, 6, 5)), skin)
  head.position.set(0, 0.1, 0.24)
  head.castShadow = true
  group.add(head)
  group.userData.head = head
  group.scale.setScalar(1.4)
  return group
}
