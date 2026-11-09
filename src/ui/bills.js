// Bills: a small recurring-bill tracker inside Tools.
// Upcoming list sorted by due date, "due in N days" / overdue badges, mark as paid (rolls the due
// date to the next cycle and keeps a short history), monthly totals, presets and notes.
// Everything stays on the device, saved with the other tools (validated by cleanBills()).
import { h } from './dom.js';
import { formatNumber } from '../engine/index.js';
import { parseNumberStrict } from '../core/numbers.js';
import { createPicker } from './picker.js';

/* ---------- icons (stroke = currentColor, so they follow every theme) ---------- */
const ICON = {
  electricity: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  water: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  gas: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  internet: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/>',
  rent: '<path d="M3 11 12 4l9 7M5 10v10h14V10M10 20v-6h4v6"/>',
  insurance: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
  council: '<path d="M3 9h18L12 4zM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18"/>',
  streaming: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m10 9 5 2.5-5 2.5z"/>',
  car: '<path d="M5 16h14l-1.5-5.5A2 2 0 0 0 15.6 9H8.4a2 2 0 0 0-1.9 1.5zM4 16v3M20 16v3"/><circle cx="7.5" cy="16" r="1.4"/><circle cx="16.5" cy="16" r="1.4"/>',
  other: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
};
const icon = (kind) => h('span.bill-icon', { 'aria-hidden': 'true', html: `<svg viewBox="0 0 24 24">${ICON[kind] || ICON.other}</svg>` });

/* ---------- presets ---------- */
export const BILL_PRESETS = [
  { kind: 'electricity', name: 'Electricity', freq: 'quarter' },
  { kind: 'water', name: 'Water', freq: 'quarter' },
  { kind: 'gas', name: 'Gas', freq: 'quarter' },
  { kind: 'internet', name: 'Internet', freq: 'month' },
  { kind: 'phone', name: 'Phone', freq: 'month' },
  { kind: 'rent', name: 'Rent', freq: 'month' },
  { kind: 'insurance', name: 'Insurance', freq: 'month' },
  { kind: 'council', name: 'Council rates', freq: 'quarter' },
  { kind: 'streaming', name: 'Streaming', freq: 'month' },
  { kind: 'car', name: 'Car rego', freq: 'year' },
  { kind: 'other', name: 'Other', freq: 'month' },
];
export const BILL_KINDS = BILL_PRESETS.map((p) => p.kind);

export const FREQS = { week: 'Weekly', fortnight: 'Fortnightly', month: 'Monthly', quarter: 'Quarterly', half: 'Every 6 months', year: 'Yearly', once: 'One-off' };
const PER_MONTH = { week: 52 / 12, fortnight: 26 / 12, month: 1, quarter: 1 / 3, half: 1 / 6, year: 1 / 12, once: 0 };
const CURRENCIES = ['$', '€', '£', '¥', '₹', '৳'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------- dates (local, as YYYY-MM-DD strings) ---------- */
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
const daysBetween = (a, b) => Math.round((b - a) / 86400000);

/** The next due date after `iso` for a frequency. Month steps keep the day, clamped to short months. */
export function nextDue(iso, freq) {
  const d = fromISO(iso);
  if (freq === 'week' || freq === 'fortnight') { d.setDate(d.getDate() + (freq === 'week' ? 7 : 14)); return toISO(d); }
  const months = { month: 1, quarter: 3, half: 6, year: 12 }[freq];
  if (!months) return iso;
  const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return toISO(t);
}

/** Amount due from today to the end of this month (overdue included, repeats counted). */
export function dueThisMonth(items) {
  const t = today();
  const end = new Date(t.getFullYear(), t.getMonth() + 1, 0);
  let sum = 0;
  for (const b of items) {
    if (b.done) continue;
    const amt = parseNumberStrict(b.amount);
    if (!(amt > 0)) continue;
    let iso = b.due;
    for (let i = 0; i < 6 && fromISO(iso) <= end; i++) {
      sum += amt;
      if (b.freq === 'once') break;
      iso = nextDue(iso, b.freq);
    }
  }
  return sum;
}
export const monthlyAverage = (items) => items.reduce((s, b) => {
  const a = parseNumberStrict(b.amount);
  return s + (a > 0 && !b.done ? a * PER_MONTH[b.freq] : 0);
}, 0);

function dueLabel(b) {
  if (b.done) return { text: 'Paid', cls: 'is-paid' };
  const n = daysBetween(today(), fromISO(b.due));
  const date = (() => { const d = fromISO(b.due); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; })();
  if (n < 0) return { text: `Overdue ${-n} day${n === -1 ? '' : 's'}`, cls: 'is-overdue' };
  if (n === 0) return { text: 'Due today', cls: 'is-soon' };
  if (n === 1) return { text: 'Due tomorrow', cls: 'is-soon' };
  if (n <= 7) return { text: `In ${n} days · ${date}`, cls: 'is-soon' };
  return { text: `In ${n} days · ${date}`, cls: '' };
}

/* ---------- UI ---------- */
export function createBills(state, persist, { sendToCalc, feedback }) {
  const B = state; // { items, note, cur }
  let editing = null; // id being edited, or 'new'
  let draft = null;
  let armedDelete = null;
  // $120 / $342.50 / $1,234.05: cents shown only when there are some, always as two digits.
  const money = (n) => {
    const v = Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
    const whole = formatNumber(Math.trunc(v));
    const cents = Math.round(Math.abs(v - Math.trunc(v)) * 100);
    return `${B.cur}${whole}${cents ? '.' + String(cents).padStart(2, '0') : ''}`;
  };
  const root = h('div.bills');

  const uid = () => 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // Taps only touch the part that changes: opening or closing the editor swaps one row in place,
  // instead of rebuilding the whole list (which replayed every row's entry animation and could
  // jump the scroll position).
  function dropEditor() {
    const ed = root.querySelector('.bill-editor');
    if (!ed) return;
    if (editing && editing !== 'new') {
      const b = B.items.find((x) => x.id === editing);
      if (b) { ed.replaceWith(row(b, 0, false)); return; }
    }
    ed.remove();
  }
  function startNew(preset) {
    dropEditor();
    const t = today(); t.setDate(t.getDate() + 7);
    draft = { id: uid(), kind: preset.kind, name: preset.kind === 'other' ? '' : preset.name, amount: '', freq: preset.freq, due: toISO(t), note: '', paid: [] };
    editing = 'new';
    armedDelete = null;
    const ed = editor();
    root.querySelector('.bill-summary').after(ed);
    ed.querySelector('input')?.focus({ preventScroll: true });
    ed.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function startEdit(b) {
    dropEditor();
    draft = { ...b, paid: b.paid.slice() };
    editing = b.id;
    armedDelete = null;
    const r = root.querySelector(`.bill-row[data-bill="${b.id}"]`);
    if (!r) { render(); return; }
    const ed = editor();
    r.replaceWith(ed);
    ed.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function closeEditor() { dropEditor(); editing = null; draft = null; armedDelete = null; }
  function saveDraft() {
    if (!draft.name.trim()) draft.name = BILL_PRESETS.find((p) => p.kind === draft.kind)?.name || 'Bill';
    const clean = { ...draft, name: draft.name.trim().slice(0, 30), note: draft.note.slice(0, 200) };
    if (editing === 'new') B.items.push(clean);
    else B.items = B.items.map((b) => (b.id === clean.id ? clean : b));
    persist();
    feedback('eq');
    editing = null; draft = null; armedDelete = null;
    render(clean.id); // totals and order changed; the saved bill gets a little pop
  }
  function markPaid(b, row) {
    const amt = parseNumberStrict(b.amount);
    b.paid = [{ d: toISO(today()), a: amt > 0 ? amt : 0 }, ...b.paid].slice(0, 12);
    if (b.freq === 'once') b.done = true;
    else b.due = nextDue(b.due, b.freq);
    persist();
    feedback('win');
    row?.classList.add('is-paying');
    setTimeout(() => render(), 380);
  }

  function editor() {
    const d = draft;
    const name = h('input', { type: 'text', value: d.name, maxlength: 30, placeholder: 'Name', autocomplete: 'off', oninput: (e) => { d.name = e.target.value; } });
    const amount = h('input', { type: 'text', inputmode: 'decimal', value: d.amount, maxlength: 20, placeholder: '0.00', autocomplete: 'off', oninput: (e) => { d.amount = e.target.value; } });
    const freq = createPicker({ label: 'How often', onchange: (v) => { d.freq = Object.keys(FREQS).find((k) => FREQS[k] === v) || 'month'; } });
    freq.setOptions(Object.values(FREQS), FREQS[d.freq]);
    // Next due date as three themed pickers (a native date input opens the plain system dialog).
    const due = fromISO(d.due);
    const thisYear = today().getFullYear();
    const setDue = (y, m, day) => { const last = new Date(y, m + 1, 0).getDate(); d.due = toISO(new Date(y, m, Math.min(day, last))); };
    const dayP = createPicker({ label: 'Day', onchange: (v) => { const x = fromISO(d.due); setDue(x.getFullYear(), x.getMonth(), Number(v)); } });
    const monP = createPicker({ label: 'Month', onchange: (v) => { const x = fromISO(d.due); setDue(x.getFullYear(), MONTHS.indexOf(v), x.getDate()); } });
    const yrP = createPicker({ label: 'Year', onchange: (v) => { const x = fromISO(d.due); setDue(Number(v), x.getMonth(), x.getDate()); } });
    dayP.setOptions(Array.from({ length: 31 }, (_, i) => String(i + 1)), String(due.getDate()));
    monP.setOptions(MONTHS, MONTHS[due.getMonth()]);
    const years = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2].map(String);
    yrP.setOptions(years, String(due.getFullYear()));
    const note = h('textarea', { maxlength: 200, rows: 2, placeholder: 'Account number, how you pay, reminders…', oninput: (e) => { d.note = e.target.value; } });
    note.value = d.note;
    const kinds = h('div.bill-kinds', {}, BILL_PRESETS.map((p) =>
      h('button', { type: 'button', 'aria-pressed': String(p.kind === d.kind), 'aria-label': p.name, title: p.name,
        onclick: (e) => { d.kind = p.kind; kinds.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === e.currentTarget))); } }, icon(p.kind))));
    const isNew = editing === 'new';
    const del = !isNew && h('button.pill-btn.ghost.bill-delete', { type: 'button', onclick: (e) => {
      if (armedDelete !== d.id) { armedDelete = d.id; e.currentTarget.textContent = 'Tap again to delete'; return; }
      B.items = B.items.filter((b) => b.id !== d.id); persist(); feedback('op'); closeEditor();
    } }, 'Delete');
    const history = !isNew && d.paid.length ? h('div.bill-history', {}, h('small', {}, 'Recently paid'),
      d.paid.slice(0, 4).map((p) => { const x = fromISO(p.d); return h('span', {}, `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()} · ${money(p.a)}`); })) : null;
    return h('div.bill-editor', {},
      h('div.bill-editor-head', {}, h('b', {}, isNew ? 'New bill' : 'Edit bill'),
        h('button.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: closeEditor, html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' })),
      kinds,
      h('div.row', {}, h('label.field', {}, h('span', {}, 'Name'), name), h('label.field', {}, h('span', {}, `Amount (${B.cur})`), amount)),
      h('div.field', {}, h('span', {}, 'How often'), freq),
      h('div.field', {}, h('span', {}, d.freq === 'once' ? 'Due on' : 'Next due'), h('div.bill-date', {}, dayP, monP, yrP)),
      h('label.field', {}, h('span', {}, 'Note'), note),
      history,
      h('div.btn-row', {}, del, h('button.pill-btn.ghost', { type: 'button', onclick: closeEditor }, 'Cancel'), h('button.pill-btn', { type: 'button', onclick: saveDraft }, 'Save')));
  }

  function row(b, i, enter) {
    const lab = dueLabel(b);
    const amt = parseNumberStrict(b.amount);
    const r = h('div.bill-row', { class: `bill-row ${lab.cls}${enter ? ' is-enter' : ''}`, 'data-bill': b.id, style: enter ? { animationDelay: `${Math.min(i, 8) * 40}ms` } : {} });
    const main = h('button.bill-main', { type: 'button', 'aria-label': `Edit ${b.name}`, onclick: () => startEdit(b) },
      icon(b.kind),
      h('span.bill-text', {}, h('b', {}, b.name), h('small.bill-due', {}, lab.text + (b.freq !== 'once' && !b.done ? ` · ${FREQS[b.freq].toLowerCase()}` : ''))),
      h('span.bill-amt', {}, amt > 0 ? money(amt) : '—'));
    const pay = b.done
      ? h('span.bill-paid', { 'aria-label': 'Paid', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>' })
      : h('button.bill-pay', { type: 'button', 'aria-label': `Mark ${b.name} as paid`, title: 'Mark as paid', onclick: () => markPaid(b, r),
          html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>' });
    r.append(main, pay);
    return r;
  }

  let firstRender = true;
  function render(savedId) {
    const enter = firstRender; // rows bounce in only when Bills opens, not on every tap
    firstRender = false;
    const items = B.items.slice().sort((a, b) => ((a.done ? 1 : 0) - (b.done ? 1 : 0)) || (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
    const overdue = items.filter((b) => !b.done && fromISO(b.due) < today()).length;
    const cur = createPicker({ label: 'Currency', onchange: (v) => { B.cur = v; persist(); render(); } });
    cur.setOptions(CURRENCIES, B.cur);
    cur.classList.add('bill-cur');

    const summary = h('div.bill-summary', {},
      h('div.stat', {}, h('small', {}, 'Due this month'), h('b', {}, money(dueThisMonth(items)))),
      h('div.stat', {}, h('small', {}, 'Monthly average'), h('b', {}, money(monthlyAverage(items)))),
      h('div.stat', { class: `stat${overdue ? ' is-overdue' : ''}` }, h('small', {}, 'Overdue'), h('b', {}, String(overdue))));

    const list = items.length
      ? h('div.bill-list', {}, items.map((b, i) => (editing === b.id ? editor() : row(b, i, enter))))
      : h('p.bill-empty', {}, 'No bills yet. Pick one below to start tracking it: you’ll see what’s due, what’s overdue and your monthly total.');

    const presets = h('div.bill-presets', {}, BILL_PRESETS.map((p) =>
      h('button', { type: 'button', onclick: () => startNew(p) }, icon(p.kind), h('span', {}, p.name))));

    const notes = h('textarea.bill-notes', { maxlength: 2000, rows: 4, placeholder: 'Anything to remember: payment logins, budget goals, who pays what…', oninput: (e) => { B.note = e.target.value; persist(); } });
    notes.value = B.note;

    root.replaceChildren(...[
      h('div.bill-head', {}, h('div.out-label', { style: { textAlign: 'left' } }, 'Your bills'), cur),
      summary,
      editing === 'new' ? editor() : null,
      list,
      h('div.out-label', { style: { textAlign: 'left' } }, 'Add a bill'),
      presets,
      h('div.out-label', { style: { textAlign: 'left' } }, 'Notes'),
      notes,
      items.length ? h('div.btn-row', {}, h('button.pill-btn.ghost', { type: 'button', onclick: () => sendToCalc(String(Math.round(dueThisMonth(items) * 100) / 100)) }, 'Send this month’s total to calc')) : null,
    ].filter(Boolean)); // (replaceChildren would print a literal "null")
    if (savedId) root.querySelector(`.bill-row[data-bill="${savedId}"]`)?.classList.add('is-saved');
  }

  render();
  return root;
}
