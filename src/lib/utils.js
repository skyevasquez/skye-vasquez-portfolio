// Small DOM/feature utilities used across the app.

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const mapRange = (v, inMin, inMax, outMin, outMax) =>
  outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTouch = () =>
  window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

/** Cap device pixel ratio for perf. */
export const cappedDPR = (max = 2) => Math.min(window.devicePixelRatio || 1, max);

/** True if WebGL is available in this browser. */
export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGL2RenderingContext &&
      (canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

/**
 * Split an element's text into <span class="char"> wrappers.
 * Preserves inner HTML whitespace via &nbsp; for spaces.
 * Adds .is-split once complete.
 */
export function splitChars(el) {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  el.classList.add('is-split');

  const chars = text.split('');
  chars.forEach((ch) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = ch === ' ' ? '\u00A0' : ch;
    el.appendChild(span);
  });
  return el.querySelectorAll('.char');
}

/**
 * Split into word spans, each word wrapped so the inner span can slide up
 * from an overflow-hidden mask. Returns the inner spans (the animated targets).
 */
export function splitWords(el) {
  const text = el.textContent;
  el.setAttribute('aria-label', text);
  el.textContent = '';
  el.classList.add('is-split');

  const words = text.split(/(\s+)/);
  const targets = [];
  words.forEach((w) => {
    if (/^\s+$/.test(w)) {
      el.appendChild(document.createTextNode(w));
      return;
    }
    const word = document.createElement('span');
    word.className = 'word';
    const inner = document.createElement('span');
    inner.textContent = w;
    word.appendChild(inner);
    el.appendChild(word);
    targets.push(inner);
  });
  return targets;
}

/** Run a callback once an image is decoded/loaded. */
export function onImageReady(img) {
  if (img.complete && img.naturalWidth !== 0) return Promise.resolve(img);
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(img), { once: true });
    img.addEventListener('error', () => resolve(img), { once: true });
  });
}
