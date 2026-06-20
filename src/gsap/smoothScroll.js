import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../lib/utils.js';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   Lenis smooth scroll, synced to GSAP ScrollTrigger.
   Returns the instance (or null if reduced motion / disabled).
   ============================================================ */
export function initSmoothScroll() {
  if (prefersReducedMotion()) return null;

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.6,
    wheelMultiplier: 1
  });

  lenis.on('scroll', ScrollTrigger.update);

  const ticker = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(ticker);
  gsap.ticker.lagSmoothing(0);

  // Anchor links use Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length > 1) {
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: 0, duration: 1.4 });
        }
      }
    });
  });

  return lenis;
}
