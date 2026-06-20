import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  splitChars,
  splitWords,
  prefersReducedMotion,
  isTouch,
  clamp
} from '../lib/utils.js';

gsap.registerPlugin(ScrollTrigger);

const reduced = prefersReducedMotion();

/* ============================================================
   Custom cursor (desktop, fine-pointer only)
   ============================================================ */
export function initCursor() {
  if (isTouch() || reduced) return;
  const cursor = document.getElementById('cursor');
  if (!cursor) return;

  const dot = cursor.querySelector('.cursor__dot');
  const ring = cursor.querySelector('.cursor__ring');

  // Center each element on its anchor point. We translate the dot and ring
  // directly (not the parent) so the ring can lag the dot for a trailing
  // effect without compounding the parent's transform.
  gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });

  // Dot tracks the pointer tightly; ring trails with a slower ease.
  const xTo = gsap.quickTo(dot, 'x', { duration: 0.15, ease: 'power3' });
  const yTo = gsap.quickTo(dot, 'y', { duration: 0.15, ease: 'power3' });
  const rxTo = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
  const ryTo = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });

  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
    rxTo(e.clientX);
    ryTo(e.clientY);
  });

  document.querySelectorAll('[data-cursor="link"], a, button').forEach((el) => {
    el.addEventListener('pointerenter', () => cursor.classList.add('is-link'));
    el.addEventListener('pointerleave', () => cursor.classList.remove('is-link'));
  });

  // dot follows faster than ring -> already separate quickTo vars
  dot && (dot.style.opacity = 1);
}

/* ============================================================
   Marquee — duplicate items for seamless loop, scrub with scroll
   ============================================================ */
export function initMarquee() {
  const track = document.getElementById('marqueeTrack');
  if (!track) return;
  const words = [
    'Business Development',
    'Relationships',
    'Partnerships',
    'Growth',
    'Account Management',
    'Strategy'
  ];
  const group = words
    .map((w) => `<span class="marquee__item">${w}</span>`)
    .join('');
  track.innerHTML = group + group; // duplicate for seamless loop

  if (reduced) return;

  // Base continuous drift — slow enough to read each word as it passes.
  // We keep a reference to the tween so the scroll handler can drive its
  // timeScale without using `overwrite`, which would otherwise kill the
  // drift tween (and has been freezing the marquee on the first scroll).
  const drift = gsap.to(track, {
    xPercent: -50,
    duration: 60,
    ease: 'none',
    repeat: -1
  });

  // Velocity boost on scroll — scale the drift tween's timeScale only.
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = clamp(Math.abs(self.getVelocity()) / 2000, 0, 6);
      gsap.to(drift, { timeScale: 1 + v, duration: 0.4, overwrite: false });
      gsap.to(drift, { timeScale: 1, duration: 1.2, delay: 0.2, overwrite: false });
    }
  });
}

/* ============================================================
   Reveal animations driven by ScrollTrigger
   ============================================================ */
export function initReveals() {
  if (reduced) return;

  // generic [data-reveal]
  gsap.utils.toArray('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // about bio lines
  gsap.utils.toArray('[data-reveal-line]').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      delay: i * 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
  });

  // stats
  gsap.utils.toArray('[data-stat]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%' }
    });
    const numEl = el.querySelector('[data-count]');
    if (numEl) {
      const target = parseFloat(numEl.getAttribute('data-count'));
      const o = { v: 0 };
      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => {
          gsap.to(o, {
            v: target,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => {
              numEl.textContent = Math.round(o.v);
            }
          });
        }
      });
    }
  });

  // focus items stagger
  gsap.utils.toArray('[data-focus-item]').forEach((el, i) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1,
      delay: i * 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  // split-words titles (about + focus)
  gsap.utils.toArray('[data-split-words]').forEach((el) => {
    const inners = splitWords(el);
    gsap.set(inners, { yPercent: 110 });
    gsap.to(inners, {
      yPercent: 0,
      duration: 1.1,
      ease: 'power4.out',
      stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });
}

/* ============================================================
   Intro sequence — runs after the loader finishes.
   Drives the portrait reveal uniform too.
   ============================================================ */
export function playIntro({ scene } = {}) {
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  // reveal the portrait (fade in + reform to flat)
  if (scene) {
    tl.to(
      { v: 0 },
      {
        v: 1,
        duration: 1.6,
        ease: 'power2.inOut',
        onUpdate: function () {
          scene.setReveal(this.targets()[0].v);
        }
      },
      0
    ).to(
      { v: scene.progress },
      {
        v: 0,
        duration: 1.8,
        ease: 'power3.inOut',
        onUpdate: function () {
          scene.setProgress(this.targets()[0].v);
        }
      },
      0
    );
  }

  // hero title char reveal
  const heroWords = document.querySelectorAll('[data-hero-line] .hero__word');
  heroWords.forEach((w) => {
    const chars = splitChars(w);
    tl.to(
      w,
      { yPercent: 0, duration: 1.1, ease: 'power4.out' },
      0.1
    );
    tl.fromTo(
      chars,
      { yPercent: 120 },
      { yPercent: 0, duration: 1.1, stagger: 0.03, ease: 'power4.out' },
      0.1
    );
  });

  return tl;
}

/* ============================================================
   Scroll-driven portrait progress + velocity, plus scroll rail.
   progress: dispersed (1) at top -> reformed (0) as hero enters, then
   we disperse again through the page for a living backdrop.
   ============================================================ */
export function initScrollScene({ scene }) {
  if (!scene) return;
  const rail = document.getElementById('scrollRailFill');

  // progress: hero section maps 1 -> 0 (dispersed -> reformed),
  // then through the rest of the page drift gently 0 -> 0.55
  ScrollTrigger.create({
    trigger: '#hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 0.6,
    onUpdate: (self) => {
      scene.setProgress(self.progress * 1.0); // 0 (top) -> 1 (bottom of hero)
    }
  });

  ScrollTrigger.create({
    trigger: '#about',
    start: 'top bottom',
    end: 'bottom top',
    scrub: 1,
    onUpdate: (self) => {
      // gentle re-dispersion after hero
      scene.setProgress(0.15 + self.progress * 0.4);
    }
  });

  // velocity from scroll
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = clamp(Math.abs(self.getVelocity()) / 4000, 0, 1.5);
      scene.setVelocity(v);
    }
  });

  // scroll rail + static progress
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      if (rail) rail.style.height = (self.progress * 100).toFixed(2) + '%';
    }
  });
}
