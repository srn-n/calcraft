// Loading screen: about 5 seconds (studio card ~2 s, calculator ~2.5 s, exit ~0.5 s).
// A tap, click or key press skips it, but only after the studio name has been on screen for a
// moment, so it's always seen. Links in the footer (Privacy, Terms) work normally.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FULL_MS = 4500;  // + 460 ms exit ≈ 5 s
const SKIP_AFTER_MS = 1600;

export function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  let done = false;

  const leave = () => {
    if (done) return;
    done = true;
    el.removeEventListener('pointerup', onTap);
    window.removeEventListener('keydown', onKey, true);
    el.classList.add('is-leaving');
    el.setAttribute('aria-busy', 'false');
    document.documentElement.classList.add('app-in');
    setTimeout(() => { el.remove(); document.documentElement.classList.remove('app-in'); }, 760);
  };
  const canSkip = () => performance.now() >= SKIP_AFTER_MS;
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

  const fonts = document.fonts?.ready ?? Promise.resolve();
  Promise.race([fonts, wait(2500)])
    .then(() => wait(Math.max(0, FULL_MS - performance.now())))
    .then(leave);
}
