const PATTERNS = { num: 6, op: 10, fn: 8, eq: [8, 24, 14], error: [30, 40, 30], win: [12, 40, 12, 40, 30], long: 25 };
let enabled = true;

export const setHaptics = (on) => { enabled = on; };

export function buzz(kind = 'num') {
  if (!enabled) return;
  try {
    if (navigator.vibrate) navigator.vibrate(PATTERNS[kind] ?? 8);
    // Android wrapper bridge (optional): window.BouncyNative?.vibrate(ms)
    else if (window.BouncyNative?.vibrate) window.BouncyNative.vibrate(Array.isArray(PATTERNS[kind]) ? PATTERNS[kind][0] : PATTERNS[kind]);
  } catch { /* not supported */ }
}
