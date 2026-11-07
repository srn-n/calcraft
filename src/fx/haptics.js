// Vibration for keys, =, errors and wins. Strength: 1 light, 2 medium, 3 strong.
const PATTERNS = { num: 8, op: 12, fn: 10, ac: 12, mem: 10, eq: [8, 24, 14], error: [30, 40, 30], win: [12, 40, 12, 40, 30], long: 25 };
const SCALE = { 1: 0.6, 2: 1, 3: 1.8 };
let enabled = true;
let level = 2;

export const setHaptics = (on) => { enabled = on; };
export const setHapticLevel = (lvl) => { level = SCALE[lvl] ? lvl : 2; };

export function buzz(kind = 'num') {
  if (!enabled) return;
  try {
    // Android app: the vibration motor via the native bridge (WebView's navigator.vibrate is a no-op).
    // Web: navigator.vibrate on Android browsers (iPhones don't support web vibration).
    if (window.BouncyNative?.haptic) window.BouncyNative.haptic(`${kind}:${level}`);
    else if (navigator.vibrate) {
      const p = PATTERNS[kind] ?? 8, k = SCALE[level];
      navigator.vibrate(Array.isArray(p) ? p.map((ms, i) => (i % 2 ? ms : Math.round(ms * k))) : Math.round(p * k));
    }
  } catch { /* not supported */ }
}
