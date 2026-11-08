// Loading screen: about 5 seconds (studio card ~2 s, calculator ~2.5 s, exit ~0.5 s).
// A tap, click or key press skips it, but only after the studio name has been on screen for a
// moment, so it's always seen. Links in the footer (Privacy, Terms) work normally.

// In the Android app the full 5 s intro plays on the very first launch only. After that, a cold
// start shows just the studio card (~1.5 s, skippable straight away), because the system splash
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
const FULL_MS = QUICK ? 1500 : 4500;  // full: + 460 ms exit ≈ 5 s
const SKIP_AFTER_MS = QUICK ? 300 : 1600;

/**
 * Phones: paint the splash with the calculator body's own background (solid colour or gradient), so
 * the hand-over to the app is seamless in every theme. Translucent bodies (Liquid Glass) keep the
 * theme backdrop, which is what shows through them. Set through the CSSOM, which the CSP allows.
 */
function matchScreen(el) {
  try {
    if (!matchMedia('(max-width: 919px), (max-height: 599px)').matches) return;
    const app = document.querySelector('.app');
    if (!app) return;
    const cs = getComputedStyle(app);
    const img = cs.backgroundImage;
    const alpha = (cs.backgroundColor.match(/rgba\([^)]*[,/]\s*([\d.]+)\s*\)/) || [])[1];
    const solid = alpha === undefined || Number(alpha) >= 1;
    if (img && img !== 'none' && /gradient/.test(img)) el.style.backgroundImage = img;
    else if (solid) { el.style.backgroundImage = 'none'; el.style.backgroundColor = cs.backgroundColor; }
  } catch { /* keep the CSS default */ }
}

export function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  if (IS_APP) markSeen();
  matchScreen(el);
  if (QUICK) el.classList.add('is-quick');
  let done = false;
  const start = performance.now();
  const elapsed = () => performance.now() - start;

  const leave = () => {
    if (done) return;
    done = true;
    el.removeEventListener('pointerup', onTap);
    window.removeEventListener('keydown', onKey, true);
    el.classList.add('is-leaving');
    el.setAttribute('aria-busy', 'false');
    document.documentElement.classList.add('app-in');
    setTimeout(() => {
      el.remove();
      document.documentElement.classList.remove('app-in');
      window.dispatchEvent(new Event('bouncy:splash-gone'));
    }, 900);
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
