import * as THREE from 'three';
import { Portrait } from './portrait.js';
import { createComposer } from './postfx.js';
import { cappedDPR, prefersReducedMotion, isTouch } from '../lib/utils.js';

/* ============================================================
   Scene
   Owns renderer, camera, the portrait mesh and the post chain.
   Exposes a tiny imperative API consumed by the GSAP layer:
     setProgress / setVelocity / setReveal / start / stop
   ============================================================ */
export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(0.5, 0.5);
    this.targetMouse = new THREE.Vector2(0.5, 0.5);
    this.velocity = 0;
    this.progress = prefersReducedMotion() ? 0 : 1;
    this.reveal = prefersReducedMotion() ? 1 : 0;
    this.running = false;
    this.visible = true;
    this.reduced = prefersReducedMotion();
    this.mobile = isTouch() || window.innerWidth < 760;

    this._init();
  }

  _init() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.mobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(cappedDPR(this.mobile ? 1.5 : 2));
    this.renderer.setSize(w, h);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 5.2);

    // Texture
    const loader = new THREE.TextureLoader();
    const tex = loader.load('/images/headshot.jpg');
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;

    this.portrait = new Portrait({ texture: tex });
    this.portrait.setSize(w, h);
    this.scene.add(this.portrait.object);

    // Post FX
    this.composer = createComposer({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      size: new THREE.Vector2(w, h)
    });
    if (this.mobile) {
      this.composer.setIntensity({ aberration: 0.0015, grain: 0.04, vignette: 0.7 });
    }

    // Pause rendering when canvas scrolls offscreen
    this._io = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    this._io.observe(this.canvas);

    this._onResize = this._resize.bind(this);
    this._onPointer = this._pointer.bind(this);
    window.addEventListener('resize', this._onResize);
    window.addEventListener('pointermove', this._onPointer, { passive: true });
  }

  _resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(cappedDPR(this.mobile ? 1.5 : 2));
    this.renderer.setSize(w, h);
    this.portrait.setSize(w, h);
    this.composer.setSize(w, h);
  }

  _pointer(e) {
    this.targetMouse.x = e.clientX / window.innerWidth;
    this.targetMouse.y = 1 - e.clientY / window.innerHeight;
  }

  /* ---- public API ---- */
  setProgress(p) {
    this.progress = p;
  }
  setVelocity(v) {
    this.velocity = v;
  }
  setReveal(r) {
    this.reveal = r;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    this._loop();
  }

  stop() {
    this.running = false;
  }

  _loop = () => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this._loop);

    if (!this.visible) return; // skip frames when offscreen

    const t = this.clock.getElapsedTime();

    // ease mouse
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // gentle camera parallax following mouse
    const px = (this.mouse.x - 0.5) * 0.4;
    const py = (this.mouse.y - 0.5) * 0.3;
    this.camera.position.x += (px - this.camera.position.x) * 0.04;
    this.camera.position.y += (py - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);

    this.portrait.update({
      time: t,
      mouse: this.mouse,
      velocity: this.velocity,
      progress: this.progress,
      reveal: this.reveal
    });
    this.composer.updateTime(t);
    this.composer.composer.render();
  };

  dispose() {
    this.stop();
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointer);
    this._io.disconnect();
    this.portrait.dispose();
    this.composer.composer.dispose?.();
    this.renderer.dispose();
  }
}
