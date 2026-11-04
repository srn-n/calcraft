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

const timers = new Map();   // key -> pending timeout
const pending = new Map();  // key -> value waiting to be written

function write(key, value) {
  try {
    const json = JSON.stringify(value);
    if (json === undefined || json.length > MAX_BYTES) return; // never persist something load() would refuse
    localStorage.setItem(NS + key, json);
  } catch { /* storage unavailable or full */ }
}

/** Debounced save so rapid key presses don't hammer storage. */
export function save(key, value, delay = 250) {
  clearTimeout(timers.get(key));
  pending.set(key, value);
  timers.set(key, setTimeout(() => {
    timers.delete(key);
    pending.delete(key);
    write(key, value);
  }, delay));
}

/** Write every pending save now: called when the page is hidden or the app is closed/backgrounded. */
export function flush() {
  for (const [key, value] of pending) {
    clearTimeout(timers.get(key));
    write(key, value);
  }
  timers.clear();
  pending.clear();
}

export function wipe(key) {
  try { localStorage.removeItem(NS + key); } catch { /* ignore */ }
}
