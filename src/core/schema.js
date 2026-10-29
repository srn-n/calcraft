// Validates everything read back from localStorage.
// Storage can be corrupted (old versions, browser bugs, a user poking DevTools, or a
// compromised extension). Bad data must never brick the app, so every value is checked
// and anything unexpected falls back to a safe default.

const finite = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const str = (v, max = 400) => (typeof v === 'string' ? v.slice(0, max) : '');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

export const SETTINGS_DEFAULT = { sound: false, haptics: true, group: true, hints: true, reduceMotion: false };

export function cleanSettings(v) {
  const o = obj(v);
  const out = {};
  for (const [k, d] of Object.entries(SETTINGS_DEFAULT)) out[k] = bool(o[k], d);
  return out;
}

export function cleanHistory(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const it of v) {
    if (!it || typeof it !== 'object') continue;
    const expr = str(it.expr);
    const value = finite(it.value, NaN);
    if (!expr || Number.isNaN(value)) continue;
    const t = finite(it.t, Date.now());
    out.push({ id: finite(it.id, t), expr, value, t });
    if (out.length >= 200) break;
  }
  return out;
}

export const cleanNumber = (v) => finite(v, 0);
export const cleanAngle = (v) => (v === 'rad' ? 'rad' : 'deg');
export const cleanBool = (v, d = false) => bool(v, d);
export const cleanView = (v, views) => (views.includes(v) ? v : views[0]);

export function cleanBests(v) {
  const o = obj(v);
  const out = {};
  for (const k of ['sprint', 'make24', 'broken', 'estimate']) if (typeof o[k] === 'number' && Number.isFinite(o[k])) out[k] = o[k];
  return out;
}

/** Tools state: tab, tip, units. `units` is the UNITS table, passed in to avoid a cycle. */
export function cleanTools(v, units) {
  const o = obj(v);
  const tip = obj(o.tip);
  const u = obj(o.units);
  const cat = Object.prototype.hasOwnProperty.call(units, u.cat) ? u.cat : 'Length';
  const keys = Object.keys(units[cat].u);
  return {
    tab: ['tip', 'units', 'pct'].includes(o.tab) ? o.tab : 'tip',
    tip: {
      bill: str(tip.bill, 20),
      pct: Math.max(0, Math.min(30, Math.round(finite(tip.pct, 15)))),
      people: Math.max(1, Math.min(99, Math.round(finite(tip.people, 2)))),
      round: bool(tip.round, false),
    },
    units: {
      cat,
      from: keys.includes(u.from) ? u.from : keys[0],
      to: keys.includes(u.to) ? u.to : keys[1],
      v: str(u.v, 20) || '10',
    },
  };
}
