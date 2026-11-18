// Loading screen: about 5 seconds (studio card ~2 s, calculator ~2.5 s, hand-off ~0.7 s).
// A tap, click or key press skips it, but only after the studio name has been on screen for a
// moment, so it's always seen. Links in the footer (Privacy, Terms) work normally.

// In the Android app the full 5 s intro plays on the very first launch only. After that, a cold
// start shows just the studio card (~1 s, skippable straight away), because the system splash
// screen has already been on screen and people open a calculator to use it quickly.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const IS_APP = import.meta.env.MODE === 'android';
const SEEN_KEY = 'bouncy.v5.introSeen';

function seenBefore() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
}

const QUICK = IS_APP && seenBefore();
const FULL_MS = QUICK ? 1000 : 4500;  // quick: the studio card, ~1 s; full: + ~0.7 s hand-off = about 5 s
const SKIP_AFTER_MS = QUICK ? 250 : 1600;
const MORPH_MS = 560;

// The splash is painted in the calculator body's colour by CSS (splash.css, "Phones"), so the very
// first frame already matches the app and the Android window behind it. It used to be repainted by
// script ~80 ms after the first frame, which showed as a blink on every launch.

const reduceMotion = () =>
  document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The hand-off: the splash's little calculator grows into the real one, then dissolves as the real
 * keys settle in underneath, so there's never an empty frame between the two. Transform and opacity
 * (GPU), plus border-radius, counter-scaled so the corners stay round while it grows.
 * Returns false when there's nothing to grow from (skipped before the calculator appeared, or the
 * quick launch); the plain crossfade is used then.
 */
function morphIntoApp(splash) {
  const dev = splash.querySelector('.splash-device');
  const app = document.querySelector('.app');
  if (!dev || !app || typeof dev.animate !== 'function' || reduceMotion()) return false;
  const ds = getComputedStyle(dev);
  if (ds.display === 'none' || Number(ds.opacity) < 0.95) return false;
  const a = dev.getBoundingClientRect(), b = app.getBoundingClientRect();
  if (a.width < 20 || a.height < 20 || b.width < 20 || b.height < 20) return false;

  const sx = b.width / a.width, sy = b.height / a.height;
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const r0 = parseFloat(ds.borderTopLeftRadius) || 0;
  const r1 = parseFloat(getComputedStyle(app).borderTopLeftRadius) || 0;
  // A see-through body (Liquid Glass) would show its edge across the arriving keys, so it's gone by
  // the time it lands; opaque bodies match the app's own body and can linger a little longer.
  const alpha = (ds.backgroundColor.match(/rgba?\([^)]*[,/]\s*([\d.]+)\s*\)/) || [])[1];
  const seeThrough = alpha !== undefined && Number(alpha) < 1;
  const grown = { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderRadius: `${r1 / sx}px / ${r1 / sy}px`, borderColor: 'transparent' };
  dev.animate([
    { transform: 'none', borderRadius: `${r0}px`, opacity: 1, offset: 0, easing: 'cubic-bezier(.55, 0, .15, 1)' },
    { ...grown, opacity: seeThrough ? 0 : 0.4, offset: 0.62 },
    { ...grown, opacity: 0, offset: 1 },
  ], { duration: MORPH_MS, fill: 'forwards' });
  splash.classList.add('is-morph');
  return true;
}

export function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  if (IS_APP) markSeen();
  if (QUICK) el.classList.add('is-quick');
  let done = false;
  const start = performance.now();
  const elapsed = () => performance.now() - start;

  const leave = () => {
    if (done) return;
    done = true;
    el.removeEventListener('pointerup', onTap);
    window.removeEventListener('keydown', onKey, true);
    el.setAttribute('aria-busy', 'false');
    const morph = morphIntoApp(el);
    el.classList.add('is-leaving');
    const doc = document.documentElement;
    doc.classList.add('app-in');
    if (morph) doc.classList.add('app-in-morph');
    setTimeout(() => {
      el.remove();
      doc.classList.remove('app-in', 'app-in-morph');
      window.dispatchEvent(new Event('bouncy:splash-gone'));
    }, morph ? MORPH_MS + 260 : 700);
  };
  const canSkip = () => elapsed() >= SKIP_AFTER_MS;
  const onTap = (e) => { if (!e.target.closest('a') && canSkip()) leave(); };
  // capture phase, so the key that skips the splash isn't also typed into the calculator
  const onKey = (e) => {
    if (done) return;
    if (e.key === 'Tab') return; // let keyboard users reach the Privacy / Terms links
    e.preventDefault(); e.stopPropagation();
    if (canSkip()) leave();
  };
  el.addEventListener('pointerup', onTap);
  window.addEventListener('keydown', onKey, true);

  // Start the animation on a fresh frame, after boot work, so it begins smoothly.
  // ...and only once the fonts are in, so text never swaps typeface mid-animation (a flicker).
  const go = () => requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-go')));
  Promise.race([document.fonts?.ready ?? Promise.resolve(), wait(QUICK ? 450 : 700)]).then(go, go);

  const fonts = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fonts, wait(QUICK ? 800 : 2500)])
    .then(() => wait(Math.max(0, FULL_MS - elapsed())))
    .then(leave);
}
