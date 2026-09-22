import * as THREE from 'three'
import { FOG } from './ground'

const fogColor = new THREE.Color(FOG)

/** Fade a MeshStandard material toward the page color at the model rim. */
export function fadeAtRim(material: THREE.MeshStandardMaterial, start = 28, end = 44) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: fogColor }
    shader.uniforms.uRimStart = { value: start }
    shader.uniforms.uRimEnd = { value: end }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vRimWorld;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vRimWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vRimWorld;
         uniform vec3 uRimColor;
         uniform float uRimStart;
         uniform float uRimEnd;`,
      )
      .replace(
        '#include <fog_fragment>',
        `float rim = smoothstep(uRimStart, uRimEnd, length(vRimWorld.xz));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, uRimColor, rim);
         #include <fog_fragment>`,
      )
  }
  material.customProgramCacheKey = () => `rim-${start}-${end}`
}
