// Dismiss the loading screen once the app is mounted and its fonts are in.
// First launch in a session plays the full ~2 s intro; reloads in the same session get a
// shorter ~1 s version so it never becomes a chore.
import { reducedMotion } from './dom.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  let first = true;
  try { first = !sessionStorage.getItem('bouncy.splash'); sessionStorage.setItem('bouncy.splash', '1'); } catch { /* private mode */ }
  const minMs = reducedMotion() ? 900 : first ? 1650 : 900; // + 460 ms exit ≈ 2.1 s / 1.4 s
  const fonts = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fonts, wait(1800)])
    .then(() => wait(Math.max(0, minMs - performance.now())))
    .then(() => {
      el.classList.add('is-leaving');
      el.setAttribute('aria-busy', 'false');
      document.documentElement.classList.add('app-in');
      setTimeout(() => { el.remove(); document.documentElement.classList.remove('app-in'); }, reducedMotion() ? 260 : 760);
    });
}
