import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/* ============================================================
   Custom composite post-FX pass:
   - chromatic aberration (radial, intensity uniform)
   - film grain (animated)
   - vignette
   - subtle warm tint
   ============================================================ */
export const CompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0.0025 },
    uGrain: { value: 0.05 },
    uVignette: { value: 0.85 },
    uResolution: { value: new THREE.Vector2(1, 1) }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uGrain;
    uniform float uVignette;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p){
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main(){
      vec2 uv = vUv;
      vec2 dir = normalize(uv - 0.5 + 0.0001);

      // radial chromatic aberration, stronger toward edges
      float d = length(uv - 0.5);
      float amt = uAberration * (0.4 + d * 1.8);

      float r = texture2D(tDiffuse, uv + dir * amt).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - dir * amt).b;
      vec3 col = vec3(r, g, b);

      // warm tint lift
      col = mix(col, col * vec3(1.04, 0.99, 0.93), 0.4);

      // vignette
      float vig = smoothstep(0.85, 0.25, d);
      col *= mix(1.0, vig, uVignette);

      // animated film grain
      float grain = (hash(uv * uResolution + fract(uTime)) - 0.5) * uGrain;
      col += grain;

      gl_FragColor = vec4(col, 1.0);
    }
  `
};

export function createComposer({ renderer, scene, camera, size }) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const composite = new ShaderPass(CompositeShader);
  composite.uniforms.uResolution.value.set(size.x, size.y);
  composer.addPass(composite);
  composer.renderToScreen = true;

  return {
    composer,
    setIntensity({ aberration, grain, vignette } = {}) {
      if (typeof aberration === 'number')
        composite.uniforms.uAberration.value = aberration;
      if (typeof grain === 'number') composite.uniforms.uGrain.value = grain;
      if (typeof vignette === 'number') composite.uniforms.uVignette.value = vignette;
    },
    setSize(w, h) {
      composer.setSize(w, h);
      composite.uniforms.uResolution.value.set(w, h);
    },
    updateTime(t) {
      composite.uniforms.uTime.value = t;
    }
  };
}
