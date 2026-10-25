// Focused mini-tools: Tip & Split, Units, Percent.
import { h } from './dom.js';
import { formatNumber, clean } from '../engine/index.js';
import { load, save } from '../core/storage.js';

const num = (v) => {
  const n = parseFloat(String(v).replace(/,/g, '').replace('−', '-'));
  return Number.isFinite(n) ? n : NaN;
};
const fmt = (n, d = 2) => (Number.isFinite(n) ? formatNumber(clean(Number(n.toFixed(d)))) : '—');
const field = (label, input) => h('label.field', {}, h('span', {}, label), input);
const numInput = (value, oninput, extra = {}) => h('input', { type: 'text', inputmode: 'decimal', value, oninput, autocomplete: 'off', ...extra });

/* ---------- units (factor to base unit) ---------- */
export const UNITS = {
  Length: { base: 'm', u: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852 } },
  Mass: { base: 'kg', u: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318 } },
  Temperature: { base: '°C', u: { '°C': 'c', '°F': 'f', K: 'k' } },
  Area: { base: 'm²', u: { 'cm²': 1e-4, 'm²': 1, ha: 1e4, 'km²': 1e6, 'ft²': 0.09290304, acre: 4046.8564224 } },
  Volume: { base: 'L', u: { mL: 0.001, L: 1, 'm³': 1000, tsp: 0.00492892, tbsp: 0.0147868, cup: 0.25, 'fl oz': 0.0295735, gal: 3.785411784 } },
  Speed: { base: 'm/s', u: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, knot: 0.514444 } },
  Data: { base: 'B', u: { bit: 0.125, B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824 } },
  Time: { base: 's', u: { ms: 0.001, s: 1, min: 60, h: 3600, day: 86400, week: 604800, year: 31557600 } },
};
export function convert(cat, v, from, to) {
  const c = UNITS[cat];
  if (cat === 'Temperature') {
    const toC = { c: (x) => x, f: (x) => (x - 32) * 5 / 9, k: (x) => x - 273.15 }[c.u[from]];
    const fromC = { c: (x) => x, f: (x) => x * 9 / 5 + 32, k: (x) => x + 273.15 }[c.u[to]];
    return fromC(toC(v));
  }
  return (v * c.u[from]) / c.u[to];
}

export function createTools(host, { getAns, sendToCalc }) {
  const st = load('tools', { tab: 'tip', tip: { bill: '', pct: 15, people: 2, round: false }, units: { cat: 'Length', from: 'km', to: 'mi', v: '10' } });
  const persist = () => save('tools', st);

  const tabs = [['tip', 'Tip & Split'], ['units', 'Units'], ['pct', 'Percent']];
  const tabBar = h('div.subtabs', { role: 'tablist' });
  const body = h('div.panel.tool');
  host.append(tabBar, body);

  function renderTabs() {
    tabBar.replaceChildren(...tabs.map(([id, label]) =>
      h('button', { 'aria-pressed': String(st.tab === id), onclick: () => { st.tab = id; persist(); renderTabs(); renderBody(); } }, label)));
  }

  /* Tip & Split */
  function tip() {
    const t = st.tip;
    if (!t.bill && getAns()) t.bill = String(getAns());
    const out = { tip: h('b'), total: h('b'), per: h('div.big-out') };
    const pctLabel = h('span', {}, `Tip ${t.pct}%`);
    const peopleOut = h('b', { style: { minWidth: '2ch', textAlign: 'center', font: '800 22px var(--font-display)' } }, t.people);
    const update = () => {
      const bill = num(t.bill);
      const tipAmt = bill * t.pct / 100;
      let per = (bill + tipAmt) / Math.max(1, t.people);
      if (t.round) per = Math.ceil(per);
      out.tip.textContent = fmt(tipAmt);
      out.total.textContent = fmt(t.round ? per * t.people : bill + tipAmt);
      out.per.textContent = fmt(per);
      pctLabel.textContent = `Tip ${t.pct}%`;
      peopleOut.textContent = t.people;
      chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.p) === t.pct)));
      persist();
    };
    const range = h('input.range', { type: 'range', min: 0, max: 30, step: 1, value: t.pct, oninput: (e) => { t.pct = Number(e.target.value); update(); } });
    const chips = h('div.chips', {}, [10, 12, 15, 18, 20, 25].map((p) => h('button', { dataset: { p }, onclick: () => { t.pct = p; range.value = p; update(); } }, p + '%')));
    const step = (d) => { t.people = Math.max(1, Math.min(99, t.people + d)); update(); };
    const node = h('div.tool', {},
      field('Bill', numInput(t.bill, (e) => { t.bill = e.target.value; update(); }, { placeholder: '0.00' })),
      h('label.field', {}, pctLabel, range), chips,
      h('div.row', {},
        h('div.field', {}, h('span', {}, 'People'), h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
          h('button.swap-btn', { onclick: () => step(-1), 'aria-label': 'Fewer people' }, '−'), peopleOut,
          h('button.swap-btn', { onclick: () => step(1), 'aria-label': 'More people' }, '+'))),
        h('label.switch', {}, h('span', {}, 'Round up', h('small', {}, 'per person')), h('input', { type: 'checkbox', checked: t.round, onchange: (e) => { t.round = e.target.checked; update(); } }))),
      h('div.stat-grid', {}, h('div.stat', {}, h('small', {}, 'Tip'), out.tip), h('div.stat', {}, h('small', {}, 'Total'), out.total)),
      h('div', {}, h('div.out-label', {}, 'Each person pays'), out.per),
      h('div.btn-row', {}, h('button.pill-btn', { onclick: () => sendToCalc(out.per.textContent.replace(/,/g, '')) }, 'Send to calc')));
    update();
    return node;
  }

  /* Units */
  function units() {
    const u = st.units;
    const fromIn = numInput(u.v, () => { u.v = fromIn.value; calc('ltr'); });
    const toIn = numInput('', () => calc('rtl'));
    const fromSel = h('select', { 'aria-label': 'From unit', onchange: () => { u.from = fromSel.value; calc('ltr'); } });
    const toSel = h('select', { 'aria-label': 'To unit', onchange: () => { u.to = toSel.value; calc('ltr'); } });
    const all = h('div.stat-grid');
    const cats = h('div.chips');
    const fill = () => {
      const keys = Object.keys(UNITS[u.cat].u);
      if (!keys.includes(u.from)) u.from = keys[0];
      if (!keys.includes(u.to)) u.to = keys[1];
      fromSel.replaceChildren(...keys.map((k) => h('option', { value: k, selected: k === u.from }, k)));
      toSel.replaceChildren(...keys.map((k) => h('option', { value: k, selected: k === u.to }, k)));
      cats.replaceChildren(...Object.keys(UNITS).map((c) => h('button', { 'aria-pressed': String(c === u.cat), onclick: () => { u.cat = c; fill(); calc('ltr'); } }, c)));
    };
    const calc = (dir) => {
      if (dir === 'ltr') {
        const v = num(fromIn.value);
        toIn.value = Number.isFinite(v) ? String(clean(convert(u.cat, v, u.from, u.to))) : '';
      } else {
        const v = num(toIn.value);
        if (Number.isFinite(v)) { fromIn.value = String(clean(convert(u.cat, v, u.to, u.from))); u.v = fromIn.value; }
      }
      const v = num(fromIn.value);
      all.replaceChildren(...Object.keys(UNITS[u.cat].u).filter((k) => k !== u.from).map((k) =>
        h('button.stat', { style: { all: 'unset', cursor: 'pointer', background: 'var(--surface)', borderRadius: '12px', padding: '10px 12px' }, onclick: () => { u.to = k; toSel.value = k; calc('ltr'); } },
          h('small', {}, k), h('b', {}, Number.isFinite(v) ? formatNumber(clean(convert(u.cat, v, u.from, k))) : '—'))));
      persist();
    };
    const swap = h('button.swap-btn', { 'aria-label': 'Swap units', onclick: () => { [u.from, u.to] = [u.to, u.from]; fromIn.value = toIn.value || fromIn.value; u.v = fromIn.value; fill(); calc('ltr'); } }, '⇄');
    fill();
    const node = h('div.tool', {}, cats,
      h('div.row-3', {}, h('div.tool', {}, field('From', fromIn), fromSel), swap, h('div.tool', {}, field('To', toIn), toSel)),
      h('div.out-label', { style: { textAlign: 'left' } }, 'All conversions — tap to pick'), all,
      h('div.btn-row', {}, h('button.pill-btn.ghost', { onclick: () => { if (getAns()) { fromIn.value = String(getAns()); u.v = fromIn.value; calc('ltr'); } } }, 'Use last answer'),
        h('button.pill-btn', { onclick: () => toIn.value && sendToCalc(toIn.value) }, 'Send to calc')));
    calc('ltr');
    return node;
  }

  /* Percent */
  function pct() {
    const card = (title, a, b, compute, labels) => {
      const ia = numInput(a, () => go());
      const ib = numInput(b, () => go());
      const out = h('div.big-out', { style: { fontSize: 'calc(var(--fs-scale) * 28px)' } });
      const sub = h('div.out-label');
      const go = () => { const [main, extra] = compute(num(ia.value), num(ib.value)); out.textContent = main; sub.textContent = extra || ''; };
      go();
      return h('div.stat', { style: { display: 'grid', gap: '8px', padding: '12px' } },
        h('small', {}, title), h('div.row', {}, field(labels[0], ia), field(labels[1], ib)), out, sub);
    };
    return h('div.tool', {},
      card('What is X% of Y?', '15', '80', (x, y) => [fmt(x / 100 * y, 4)], ['X %', 'Y']),
      card('X is what % of Y?', '30', '120', (x, y) => [fmt(x / y * 100, 4) + '%'], ['X', 'Y']),
      card('% change from A to B', '80', '100', (a, b) => { const c = (b - a) / Math.abs(a) * 100; return [(c > 0 ? '+' : '') + fmt(c, 4) + '%', Number.isFinite(c) ? (c >= 0 ? 'increase' : 'decrease') : '']; }, ['From A', 'To B']),
      card('Discount', '129.99', '25', (p, d) => [fmt(p * (1 - d / 100)), `you save ${fmt(p * d / 100)}`], ['Price', '% off']));
  }

  function renderBody() {
    body.replaceChildren(st.tab === 'tip' ? tip() : st.tab === 'units' ? units() : pct());
  }

  renderTabs();
  renderBody();
  return { refresh: renderBody };
}
