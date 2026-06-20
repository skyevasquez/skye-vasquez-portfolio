import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { hasWebGL, prefersReducedMotion } from './lib/utils.js';
import { initSmoothScroll } from './gsap/smoothScroll.js';
import {
  initCursor,
  initMarquee,
  initReveals,
  playIntro,
  initScrollScene
} from './gsap/animations.js';

gsap.registerPlugin(ScrollTrigger);
const reduced = prefersReducedMotion();

/* ---------- Footer clock + year ---------- */
function initFooterClock() {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const time = document.getElementById('localTime');
  if (time) {
    const fmt = () =>
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    time.textContent = fmt();
    if (!reduced) setInterval(() => (time.textContent = fmt()), 1000);
  }
}

/* ---------- Loader (0-100 counter + curtain) ---------- */
function runLoader() {
  return new Promise((resolve) => {
    const loader = document.getElementById('loader');
    const count = document.getElementById('loaderCount');
    const bar = document.getElementById('loaderBar');

    if (!loader) {
      resolve();
      return;
    }

    if (reduced) {
      loader.style.display = 'none';
      document.body.classList.add('is-loaded');
      resolve();
      return;
    }

    const counter = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        document.body.classList.add('is-loaded');
        resolve();
      }
    });

    tl.to(counter, {
      v: 100,
      duration: 2.2,
      ease: 'power2.inOut',
      onUpdate: () => {
        const v = Math.round(counter.v);
        count.textContent = v;
        bar.style.width = v + '%';
      }
    })
      .to('.loader__inner', { opacity: 0, duration: 0.5, ease: 'power2.in' }, '+=0.15')
      .to(loader, { yPercent: -100, duration: 1, ease: 'power4.inOut' }, '-=0.1')
      .set(loader, { display: 'none' });
  });
}

/* ---------- Boot ---------- */
async function boot() {
  initFooterClock();
  initMarquee();
  initCursor();

  const webglOk = hasWebGL();
  let scene = null;

  // Race the loader against the three.js chunk load
  const loaderDone = runLoader();

  if (webglOk) {
    const canvas = document.getElementById('webgl');
    // Dynamic import — three.js loads in a separate chunk after initial paint
    const sceneReady = import('./three/scene.js')
      .then(({ Scene }) => {
        scene = new Scene(canvas);
        scene.start();
      })
      .catch((err) => {
        console.warn('[scene] Failed to load three.js chunk.', err);
        document.body.classList.add('no-webgl');
      });

    // Wait for both: loader animation + three.js chunk
    await Promise.all([loaderDone, sceneReady]);

    // Wire scroll-driven portrait once scene is guaranteed live
    const lenis = initSmoothScroll();
    initScrollScene({ scene });
    initReveals();

    if (scene) playIntro({ scene });
    if (lenis) lenis.scrollTo(0, { immediate: true });
  } else {
    document.body.classList.add('no-webgl');

    await loaderDone;

    const lenis = initSmoothScroll();
    initReveals();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }

  // Refresh once fonts/images have fully settled
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
