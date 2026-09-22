import * as THREE from 'three'
import { WATER_Y } from './ground'

/** Shared by every water material so one mirrored render feeds the lake and the river. */
export const reflectionUniforms = {
  uReflection: { value: null as THREE.Texture | null },
  uReflMatrix: { value: new THREE.Matrix4() },
}

export const REFLECT_VERTEX = `#include <project_vertex>
         vReflWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`

export const REFLECT_PARS_VERTEX = `varying vec3 vReflWorld;`

export const REFLECT_PARS_FRAGMENT = `varying vec3 vReflWorld;
         uniform sampler2D uReflection;
         uniform mat4 uReflMatrix;`

/** Mixes the mirrored scene over the lit water. Needs `mapN` from the water normal chunk and `foam`. */
export const reflectFragment = (strength = '1.0', glints = '0.0', tint = '0.0') => `vec4 reflClip = uReflMatrix * vec4(vReflWorld, 1.0);
         vec2 reflUv = reflClip.xy / reflClip.w + mapN.xy * 0.05;
         vec3 mirrored = texture2D(uReflection, reflUv).rgb;
         vec3 toEye = normalize(cameraPosition - vReflWorld);
         vec3 surfaceN = normalize(vec3(mapN.x * 0.25, 1.0, mapN.y * 0.25));
         float fresnel = 0.04 + 0.96 * pow(1.0 - clamp(dot(surfaceN, toEye), 0.0, 1.0), 5.0);
         outgoingLight = mix(outgoingLight, mirrored, clamp(fresnel * 0.9 + 0.06, 0.0, 0.45) * (1.0 - foam) * (${strength}));
         outgoingLight = mix(outgoingLight, vec3(0.07, 0.36, 0.42), (${tint}) * (1.0 - foam));
         outgoingLight = mix(outgoingLight, vec3(0.78, 1.0, 1.0), clamp((${glints}) * 0.7, 0.0, 0.7) * (1.0 - foam));
         #include <opaque_fragment>`

/** Planar mirror for a horizontal water plane, after three's Reflector but shared across meshes. */
export class WaterReflection {
  readonly target: THREE.WebGLRenderTarget
  private readonly camera = new THREE.PerspectiveCamera()
  private readonly plane = new THREE.Plane()
  private readonly clip = new THREE.Vector4()
  private readonly q = new THREE.Vector4()
  private readonly eye = new THREE.Vector3()
  private readonly look = new THREE.Vector3()
  private readonly rotation = new THREE.Matrix4()
  private readonly normal = new THREE.Vector3(0, 1, 0)
  private readonly origin = new THREE.Vector3(0, WATER_Y, 0)

  constructor(private readonly hidden: THREE.Object3D[]) {
    this.target = new THREE.WebGLRenderTarget(256, 256, { depthBuffer: true, stencilBuffer: false })
    reflectionUniforms.uReflection.value = this.target.texture
  }

  setSize(width: number, height: number, scale: number) {
    this.target.setSize(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)))
  }

  update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const mirror = this.camera
    this.eye.setFromMatrixPosition(camera.matrixWorld)
    this.rotation.extractRotation(camera.matrixWorld)
    this.look.set(0, 0, -1).applyMatrix4(this.rotation).add(this.eye)

    mirror.position.set(this.eye.x, 2 * WATER_Y - this.eye.y, this.eye.z)
    mirror.up.set(0, 1, 0).applyMatrix4(this.rotation).reflect(this.normal)
    mirror.lookAt(this.look.x, 2 * WATER_Y - this.look.y, this.look.z)
    mirror.far = camera.far
    mirror.updateMatrixWorld()
    mirror.projectionMatrix.copy(camera.projectionMatrix)

    const matrix = reflectionUniforms.uReflMatrix.value
    matrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
    matrix.multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse)

    // Oblique near plane so nothing under the water leaks into the mirror.
    this.plane.setFromNormalAndCoplanarPoint(this.normal, this.origin).applyMatrix4(mirror.matrixWorldInverse)
    this.clip.set(this.plane.normal.x, this.plane.normal.y, this.plane.normal.z, this.plane.constant)
    const projection = mirror.projectionMatrix.elements
    this.q.set(
      (Math.sign(this.clip.x) + projection[8]) / projection[0],
      (Math.sign(this.clip.y) + projection[9]) / projection[5],
      -1,
      (1 + projection[10]) / projection[14],
    )
    this.clip.multiplyScalar(2 / this.clip.dot(this.q))
    projection[2] = this.clip.x
    projection[6] = this.clip.y
    projection[10] = this.clip.z + 1 - 0.003
    projection[14] = this.clip.w

    const visibility = this.hidden.map((object) => object.visible)
    for (const object of this.hidden) object.visible = false
    const previous = renderer.getRenderTarget()
    const shadows = renderer.shadowMap.autoUpdate
    renderer.shadowMap.autoUpdate = false
    renderer.setRenderTarget(this.target)
    renderer.state.buffers.depth.setMask(true)
    renderer.clear()
    renderer.render(scene, mirror)
    renderer.setRenderTarget(previous)
    renderer.shadowMap.autoUpdate = shadows
    this.hidden.forEach((object, index) => { object.visible = visibility[index] })
  }

  dispose() {
    this.target.dispose()
  }
}
