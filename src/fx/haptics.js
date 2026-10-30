const PATTERNS = { num: 6, op: 10, fn: 8, eq: [8, 24, 14], error: [30, 40, 30], win: [12, 40, 12, 40, 30], long: 25 };
let enabled = true;

export const setHaptics = (on) => { enabled = on; };

export function buzz(kind = 'num') {
  if (!enabled) return;
  try {
    // Android app: real system haptics (no VIBRATE permission needed). WebView's navigator.vibrate is a no-op.
    if (window.BouncyNative?.haptic) window.BouncyNative.haptic(String(kind));
    else if (navigator.vibrate) navigator.vibrate(PATTERNS[kind] ?? 8);
  } catch { /* not supported */ }
}
