import * as THREE from 'three';

/* ============================================================
   GLSL — shared simplex noise (Ashima / Stefan Gustavson)
   ============================================================ */
const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

/* ============================================================
   VERTEX SHADER
   Displaces a subdivided plane along Z using layered noise.
   uProgress 0 = reformed (flat), 1 = fully dispersed.
   uVelocity  adds a shimmer proportional to scroll speed.
   ============================================================ */
const VERTEX = /* glsl */ `
uniform float uProgress;
uniform float uTime;
uniform float uVelocity;
uniform float uDispersion;

varying vec2 vUv;
varying float vDisp;
varying float vLum;

${NOISE_GLSL}

// crude luminance estimate from uv-driven radial gradient (we don't sample tex in vertex stage)
float pseudoLum(vec2 uv){
  float d = distance(uv, vec2(0.5,0.45));
  return smoothstep(0.7, 0.0, d);
}

void main(){
  vUv = uv;

  // Center-biased displacement mask
  vec2 c = uv - 0.5;
  float radial = smoothstep(0.55, 0.0, length(c));

  // Layered noise drives the Z wobble
  float n1 = snoise(vec3(uv * 2.4, uTime * 0.18));
  float n2 = snoise(vec3(uv * 6.0, uTime * 0.10));
  float noise = n1 * 0.7 + n2 * 0.3;

  // Dispersion: scatter points outward as progress increases
  vec3 dir = normalize(vec3(c * 2.0, 0.0) + 0.0001);
  float scatter = uProgress * uDispersion;

  vec3 pos = position;
  pos.xy += dir.xy * scatter * (0.6 + radial * 0.8);
  pos.z  += noise * radial * (0.25 + uProgress * 0.9) * 1.6;
  pos.z  += uVelocity * radial * 0.6;

  vDisp = pos.z;
  vLum = pseudoLum(uv);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

/* ============================================================
   FRAGMENT SHADER
   Warm-editorial grade + chromatic aberration + film grain.
   ============================================================ */
const FRAGMENT = /* glsl */ `
precision highp float;

uniform sampler2D uTexture;
uniform float uProgress;
uniform float uTime;
uniform float uVelocity;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uReveal;       // 0 -> 1 as the texture finishes loading / intro
uniform float uGrain;

varying vec2 vUv;
varying float vDisp;
varying float vLum;

// Cheap hash-based grain
float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main(){
  vec2 uv = vUv;

  // ---- chromatic aberration that grows with dispersion + velocity ----
  float aberration = (uProgress * 0.012) + (uVelocity * 0.006);
  vec2 dir = normalize(uv - 0.5 + 0.0001);

  float r = texture2D(uTexture, uv + dir * aberration).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, uv - dir * aberration).b;
  float a = texture2D(uTexture, uv).a;

  vec3 col = vec3(r, g, b);

  // ---- warm editorial grade ----
  col = mix(col, col * vec3(1.06, 0.98, 0.88), 0.35);   // warm
  col = pow(col, vec3(1.05));                            // gentle contrast
  col *= mix(0.86, 1.0, vLum);                           // gentle vignette lift center
  col *= mix(0.7, 1.0, 1.0 - uProgress * 0.55);          // darken as it disperses

  // mouse proximity glow
  float md = distance(uv, uMouse);
  col += vec3(0.20, 0.10, 0.02) * smoothstep(0.55, 0.0, md) * 0.25;

  // ---- film grain ----
  float grain = (hash(uv * uResolution + uTime) - 0.5) * uGrain;
  col += grain;

  // alpha: feather the edges, fade with dispersion, eased in on reveal
  float edge = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x)
             * smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);
  float alpha = a * edge * (1.0 - uProgress * 0.45) * uReveal;

  // subtle dispersion halo at edges
  col += vec3(0.30, 0.16, 0.05) * (uProgress * 0.25) * (1.0 - edge) * 0.4;

  gl_FragColor = vec4(col, alpha);
}
`;

/* ============================================================
   PortraitMesh
   ============================================================ */
export class Portrait {
  constructor({ texture }) {
    this.texture = texture;
    this.uniforms = {
      uTexture: { value: texture },
      uProgress: { value: 1 },     // start dispersed, reform on intro
      uTime: { value: 0 },
      uVelocity: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uDispersion: { value: 0.55 },
      uReveal: { value: 0 },
      uGrain: { value: 0.08 }
    };

    const geo = new THREE.PlaneGeometry(2.4, 3.0, 220, 260);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.material = mat;
  }

  get object() {
    return this.mesh;
  }

  setSize(w, h) {
    this.uniforms.uResolution.value.set(w, h);

    // Fit plane nicely into viewport, biased to the right on wide screens.
    const aspect = w / h;
    let scale = 1;
    if (aspect > 1.2) {
      scale = Math.min(h / 900, 1.05);
      this.mesh.position.x = 0.45 * Math.min(aspect, 2.2) - 0.1;
    } else {
      scale = Math.min(w / 760, 1.1);
      this.mesh.position.x = 0;
    }
    // On short/wide screens push the portrait down slightly
    this.mesh.position.y = aspect > 1.6 ? -0.15 : 0;
    this.mesh.scale.setScalar(scale);
  }

  update({ time, mouse, velocity, progress, reveal }) {
    const u = this.uniforms;
    u.uTime.value = time;
    if (mouse) u.uMouse.value.copy(mouse);
    if (typeof velocity === 'number') u.uVelocity.value += (velocity - u.uVelocity.value) * 0.08;
    if (typeof progress === 'number') u.uProgress.value = progress;
    if (typeof reveal === 'number') u.uReveal.value = reveal;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
