# Skye Vasquez

An awwwards-style single-page portfolio for **Skye Vasquez** (Director of Business Development). Dark editorial design with a Three.js **distorted-portrait** hero and GSAP scroll-driven motion.

## Stack
- **Vite** — dev server + build, with manual chunk splitting
- **Three.js** — WebGL distorted portrait (custom GLSL vertex/fragment shaders) + post-FX (chromatic aberration, grain, vignette). Loaded as a **dynamic import** so it never blocks initial paint.
- **GSAP + ScrollTrigger** — intro timeline, scroll reveals, count-up stats, marquee
- **Lenis** — smooth scroll, synced to ScrollTrigger

## Bundle strategy (code-split for fast first paint)
The main entry stays tiny; heavy vendors load in their own chunks:

| chunk | raw | gzip | loads |
|-------|-----|------|-------|
| `index.js` (entry) | 8.5K | 3.4K | sync, on first paint |
| `vendor-gsap` | 112K | 45K | preload |
| `vendor-lenis` | 18K | 5.3K | preload |
| `scene.js` (three bootstrap) | 11K | 4.1K | async, dynamic `import()` |
| `vendor-three` | 457K | 117K | async, requested by scene chunk |

So the browser paints the page with only ~54K gzip on the critical path, and three.js streams in behind the loader curtain.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> /dist
npm run preview  # serve the production build
```

## Structure
```
index.html              semantic one-pager
src/
  main.js               bootstrap: loader -> scene -> smooth scroll -> animations
  style.css             dark editorial design system
  three/
    scene.js            renderer, camera, render loop, resize
    portrait.js         subdivided plane + headshot texture (inline GLSL)
    postfx.js           EffectComposer composite pass
  gsap/
    animations.js       intro, reveals, marquee, cursor, scroll-driven scene
    smoothScroll.js     Lenis <-> ScrollTrigger sync
  lib/
    utils.js            reduced-motion, DPR cap, split-text, helpers
public/
  images/headshot.jpg   source portrait (also used as 3D texture)
  favicon.svg
```

## Accessibility
- Full `prefers-reduced-motion` support (loader skipped, portrait frozen reformed, no scrub).
- Touch/mobile: reduced displacement + DPR cap, custom cursor disabled, stacked layouts.
- Semantic HTML, heading hierarchy, `alt` text on the portrait.
- Graceful fallback (CSS gradient backdrop) when WebGL is unavailable.
