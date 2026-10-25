// localStorage behind try/catch — private windows and some WebViews throw.
const NS = 'bouncy.v5.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const timers = new Map();
/** Debounced save so rapid key presses don't hammer storage. */
export function save(key, value, delay = 250) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  }, delay));
}

export function wipe(key) {
  try { localStorage.removeItem(NS + key); } catch { /* ignore */ }
}
