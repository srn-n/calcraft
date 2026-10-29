// Dismiss the loading screen once the app is mounted and its fonts are in.
// First visit in a session plays the whole intro (about 1.3 s); later reloads in the same
// session only wait for readiness, so the splash never becomes a chore.
import { reducedMotion } from './dom.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  let first = true;
  try { first = !sessionStorage.getItem('bouncy.splash'); sessionStorage.setItem('bouncy.splash', '1'); } catch { /* private mode */ }
  const minMs = reducedMotion() ? 200 : first ? 1350 : 500;
  const fonts = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fonts, wait(1800)])
    .then(() => wait(Math.max(0, minMs - performance.now())))
    .then(() => {
      el.classList.add('is-leaving');
      el.setAttribute('aria-busy', 'false');
      document.documentElement.classList.add('app-in');
      // the exit animation lasts 600 ms (420 ms fade after a 180 ms head start for the falling keys)
      setTimeout(() => { el.remove(); document.documentElement.classList.remove('app-in'); }, reducedMotion() ? 220 : 640);
    });
}
