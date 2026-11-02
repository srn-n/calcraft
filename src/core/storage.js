// localStorage behind try/catch — private windows and some WebViews throw.
// Every value read here is then validated by its caller with src/core/schema.js; this layer only
// guarantees "parsed JSON of a sane size, or the fallback".
const NS = 'bouncy.v5.';
/** Largest value we read or write per key. The biggest real one (200-entry tape) is ~90 KB. */
export const MAX_BYTES = 256 * 1024;

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw == null || raw.length > MAX_BYTES) return fallback; // oversized: don't even parse it
    const v = JSON.parse(raw);
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

const timers = new Map();
/** Debounced save so rapid key presses don't hammer storage. */
export function save(key, value, delay = 250) {
  clearTimeout(timers.get(key));
  timers.set(key, setTimeout(() => {
    try {
      const json = JSON.stringify(value);
      if (json === undefined || json.length > MAX_BYTES) return; // never persist something load() would refuse
      localStorage.setItem(NS + key, json);
    } catch { /* storage unavailable or full */ }
  }, delay));
}

export function wipe(key) {
  try { localStorage.removeItem(NS + key); } catch { /* ignore */ }
}
