// Validates everything read back from localStorage.
// Storage can be corrupted (old versions, browser bugs, a user poking DevTools, or a
// compromised extension). Bad data must never brick the app, so every value is checked
// and anything unexpected falls back to a safe default.

const finite = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const str = (v, max = 400) => (typeof v === 'string' ? v.slice(0, max) : '');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

// soundLevel / hapticLevel: 1 = low/light, 2 = medium, 3 = high/strong (Off is sound/haptics = false).
export const SETTINGS_DEFAULT = { sound: true, haptics: true, group: true, hints: true, reduceMotion: false, soundLevel: 2, hapticLevel: 2 };

export function cleanSettings(v) {
  const o = obj(v);
  const out = {};
  for (const [k, d] of Object.entries(SETTINGS_DEFAULT)) {
    out[k] = typeof d === 'number' ? (Number.isInteger(o[k]) && o[k] >= 1 && o[k] <= 3 ? o[k] : d) : bool(o[k], d);
  }
  return out;
}

// Only characters the calculator itself can produce. Planted text (markup, bidi overrides that
// visually reverse a sum) is dropped instead of being shown on the tape.
const EXPR_CHARS = /^[0-9.+−×÷^%!²³()πeE√∛a-zA-Z]+$/;

export function cleanHistory(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const it of v) {
    if (!it || typeof it !== 'object') continue;
    const expr = str(it.expr);
    const value = finite(it.value, NaN);
    if (!expr || !EXPR_CHARS.test(expr) || Number.isNaN(value)) continue;
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
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
function cleanISO(v) {
  const m = typeof v === 'string' && ISO_DATE.exec(v);
  if (!m) return '';
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(y, mo - 1, d);
  return y >= 2000 && y <= 2100 && dt.getMonth() === mo - 1 && dt.getDate() === d ? v : '';
}

/** Bills (Tools → Bills). Up to 60 bills, short strings, known kinds/frequencies, real dates. */
export function cleanBills(v, { kinds, freqs }) {
  const o = obj(v);
  const items = [];
  const seen = new Set();
  for (const it of Array.isArray(o.items) ? o.items : []) {
    if (items.length >= 60) break;
    const b = obj(it);
    const id = str(b.id, 24);
    const due = cleanISO(b.due);
    if (!/^[a-z0-9]+$/i.test(id) || seen.has(id) || !due) continue;
    seen.add(id);
    const paid = [];
    for (const p of Array.isArray(b.paid) ? b.paid : []) {
      if (paid.length >= 12) break;
      const pd = cleanISO(obj(p).d);
      if (pd) paid.push({ d: pd, a: Math.max(0, Math.min(1e12, finite(obj(p).a, 0))) });
    }
    items.push({
      id,
      kind: kinds.includes(b.kind) ? b.kind : 'other',
      name: str(b.name, 30),
      amount: str(b.amount, 20),
      freq: freqs.includes(b.freq) ? b.freq : 'month',
      due,
      note: str(b.note, 200),
      paid,
      done: bool(b.done, false),
    });
  }
  const CUR = ['$', '€', '£', '¥', '₹', '৳'];
  return { items, note: str(o.note, 2000), cur: CUR.includes(o.cur) ? o.cur : '$' };
}

export function cleanTools(v, units, billOpts = { kinds: ['other'], freqs: ['month'] }) {
  const o = obj(v);
  const tip = obj(o.tip);
  const u = obj(o.units);
  const cat = Object.prototype.hasOwnProperty.call(units, u.cat) ? u.cat : 'Length';
  const keys = Object.keys(units[cat].u);
  return {
    tab: ['tip', 'units', 'pct', 'bills'].includes(o.tab) ? o.tab : 'tip',
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
    bills: cleanBills(o.bills, billOpts),
  };
}
