// Command palette (Ctrl+K): fuzzy commands + inline calculation, Spotlight-style.
import { $, h } from './dom.js';
import { evaluate, formatNumber } from '../engine/index.js';
import { sanitizePaste } from '../core/calculator.js';

const score = (q, text) => {
  if (!q) return 1;
  const t = text.toLowerCase();
  if (t.includes(q)) return 3 - t.indexOf(q) / 100;
  let i = 0;
  for (const c of t) if (c === q[i]) i++;
  return i === q.length ? 1 : 0;
};

export function createPalette({ commands, onCalc, getAngle }) {
  const dlg = $('#palette');
  const input = $('#paletteInput');
  const list = $('#paletteList');
  let items = [];
  let sel = 0;

  function render() {
    const q = input.value.trim().toLowerCase();
    items = commands()
      .map((c) => ({ ...c, s: score(q, c.title + ' ' + (c.sub || '')) }))
      .filter((c) => c.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40);
    // Type a sum → top result is the answer
    if (/[0-9π]/.test(q)) {
      const expr = sanitizePaste(input.value);
      const r = evaluate(expr, { angle: getAngle() });
      if (r.ok) items.unshift({ title: `= ${formatNumber(r.value)}`, sub: 'Enter to put in the calculator', run: () => onCalc(expr) });
    }
    sel = Math.min(sel, Math.max(0, items.length - 1));
    list.replaceChildren(...items.map((c, i) =>
      // Run on a completed tap/click, never on pointerdown: on phones a swipe to scroll starts with a
      // pointerdown, so the item under your finger used to run (e.g. "Go to Calc") instead of scrolling.
      // Mouse pointerdown is still cancelled so the search box keeps focus.
      h('li', { role: 'option', 'aria-selected': String(i === sel), onclick: () => run(i), onpointerdown: (e) => { if (e.pointerType === 'mouse') e.preventDefault(); }, onmousemove: () => { if (sel !== i) { sel = i; mark(); } } },
        h('span', {}, c.title), c.keys ? h('kbd', {}, c.keys) : c.sub ? h('span.sub', {}, c.sub) : null)));
  }
  const mark = () => [...list.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === sel)));
  function run(i) {
    const c = items[i];
    if (!c) return;
    dlg.close();
    c.run();
  }

  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); mark(); list.children[sel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); mark(); list.children[sel]?.scrollIntoView({ block: 'nearest' }); e.preventDefault(); }
    else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  return {
    open() {
      input.value = ''; sel = 0; render(); dlg.showModal();
      list.scrollTop = 0;
      // On touch screens don't pop the keyboard over the list; tap the box to type.
      if (!matchMedia('(pointer: coarse)').matches) input.focus();
      else dlg.focus();
    },
    isOpen: () => dlg.open,
  };
}
