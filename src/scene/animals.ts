import * as THREE from 'three'
import type { Disposal } from './disposal'
import { standard } from './disposal'
import { WATER_Y, terrainHeight } from './ground'

type Bob = (object: THREE.Object3D, amplitude?: number) => void

export function buildAnimals(parent: THREE.Object3D, disposal: Disposal, bob: Bob) {
  const cream = standard(disposal, { color: '#f3eadc', roughness: 0.78 })
  const tan = standard(disposal, { color: '#c4a06a', roughness: 0.8 })
  const brown = standard(disposal, { color: '#8a5a32', roughness: 0.82 })
  const green = standard(disposal, { color: '#2f6d45', roughness: 0.7 })
  const beak = standard(disposal, { color: '#e2a23a', roughness: 0.55 })
  const heronBody = standard(disposal, { color: '#e4e7ea', roughness: 0.62 })
  const heronDark = standard(disposal, { color: '#3c4650', roughness: 0.6 })
  const shell = standard(disposal, { color: '#5f7348', roughness: 0.84 })
  const turtle = standard(disposal, { color: '#8ea36a', roughness: 0.8 })

  const mallard = makeDuck(disposal, brown, green, beak)
  const hen = makeDuck(disposal, tan, tan, beak)
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
  })

  const rabbit = makeRabbit(disposal, cream, beak)
  const bunny = makeRabbit(disposal, tan, beak)
  ;[
    [1.5, 15.6, 0.6, rabbit],
    [-5.1, 15.9, -0.4, bunny],
    [2.7, 16.7, 1.8, rabbit],
  ].forEach(([x, z, yaw, source]) => {
    const animal = (source as THREE.Group).clone(true)
    animal.position.set(x as number, terrainHeight(x as number, z as number), z as number)
    animal.rotation.y = yaw as number
    parent.add(animal)
  })

  const bird = makeHeron(disposal, heronBody, heronDark, beak)
  bird.position.set(-4.7, terrainHeight(-4.7, 11.15), 11.15)
  bird.rotation.y = 0.8
  parent.add(bird)

  const shellback = makeTurtle(disposal, shell, turtle)
  shellback.position.set(-5.5, terrainHeight(-5.5, 11.55) + 0.02, 11.55)
  shellback.rotation.y = -0.4
  parent.add(shellback)
}

function makeDuck(disposal: Disposal, body: THREE.Material, head: THREE.Material, beak: THREE.Material) {
  const group = new THREE.Group()
  const torso = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.22, 8, 6)), body)
  torso.scale.set(1.15, 0.72, 1.55)
  torso.position.set(0, 0.2, 0)
  torso.castShadow = true
  group.add(torso)
  const crown = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.12, 8, 6)), head)
  crown.position.set(0, 0.36, 0.24)
  crown.castShadow = true
  group.add(crown)
  const bill = new THREE.Mesh(disposal.geo(new THREE.ConeGeometry(0.04, 0.16, 5)), beak)
  bill.rotation.x = Math.PI / 2
  bill.position.set(0, 0.34, 0.38)
  bill.castShadow = true
  group.add(bill)
  return group
}

function makeRabbit(disposal: Disposal, fur: THREE.Material, nose: THREE.Material) {
  const group = new THREE.Group()
  const torso = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.2, 8, 6)), fur)
  torso.scale.set(0.85, 0.7, 1.25)
  torso.position.set(0, 0.2, 0)
  torso.castShadow = true
  group.add(torso)
  const crown = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.12, 8, 6)), fur)
  crown.position.set(0, 0.36, 0.16)
  crown.castShadow = true
  group.add(crown)
  const ear = disposal.geo(new THREE.CapsuleGeometry(0.025, 0.16, 3, 5))
  const left = new THREE.Mesh(ear, fur)
  left.position.set(-0.05, 0.56, 0.16)
  left.rotation.z = 0.18
  left.castShadow = true
  const right = new THREE.Mesh(ear, fur)
  right.position.set(0.05, 0.56, 0.16)
  right.rotation.z = -0.18
  right.castShadow = true
  group.add(left, right)
  const tail = new THREE.Mesh(disposal.geo(new THREE.SphereGeometry(0.06, 6, 5)), nose)
  tail.position.set(0, 0.24, -0.22)
  group.add(tail)
  group.scale.setScalar(1.25)
  return group
}

function makeHeron(disposal: Disposal, body: THREE.Material, dark: THREE.Material, beak: THREE.Material) {
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
  group.scale.setScalar(1.4)
  return group
}
