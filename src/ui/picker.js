// Themed dropdown that replaces <select>. A native <select> opens the operating system's own
// picker (a plain white Android dialog), which ignores the app's theme. This one is drawn by the
// app, so it matches every theme, on the web and in the Android app.
//
// API mirrors the bits of <select> the tools use: el.value (get/set), el.setOptions(list), onchange.
import { h } from './dom.js';

let openPicker = null; // only one open at a time

/** Close the open picker, if any. Returns true when one was open (used by the Back gesture). */
export function closePicker() {
  if (!openPicker) return false;
  openPicker();
  return true;
}
export const isPickerOpen = () => !!openPicker;

export function createPicker({ label, onchange }) {
  let options = [];
  let value = '';
  const text = h('span.picker-value');
  const btn = h('button.picker', { type: 'button', 'aria-label': label, 'aria-haspopup': 'listbox', 'aria-expanded': 'false' },
    text, h('span.picker-chevron', { 'aria-hidden': 'true' }));

  const set = (v, fire) => {
    if (!options.includes(v)) return;
    const changed = v !== value;
    value = v;
    text.textContent = v;
    if (fire && changed) onchange?.(v);
  };

  function open() {
    closePicker();
    const r = btn.getBoundingClientRect();
    const list = h('ul.picker-list', { role: 'listbox', 'aria-label': label, tabindex: '-1' },
      options.map((o) => h('li', { role: 'option', 'aria-selected': String(o === value), tabindex: '-1', 'data-v': o }, o)));
    const scrim = h('div.picker-scrim');
    const pop = h('div.picker-pop', {}, list);
    // Place below the button, or above it when there isn't room; never off-screen.
    const vh = innerHeight, below = vh - r.bottom - 12, above = r.top - 12;
    const up = below < 220 && above > below;
    const maxH = Math.max(160, Math.min(320, up ? above : below));
    Object.assign(pop.style, {
      left: `${Math.max(8, Math.min(r.left, innerWidth - Math.max(r.width, 140) - 8))}px`,
      minWidth: `${Math.max(r.width, 140)}px`,
      maxHeight: `${maxH}px`,
      ...(up ? { bottom: `${vh - r.top + 6}px` } : { top: `${r.bottom + 6}px` }),
    });
    pop.classList.toggle('is-up', up);

    const close = () => {
      if (openPicker !== close) return;
      openPicker = null;
      btn.setAttribute('aria-expanded', 'false');
      removeEventListener('keydown', onKey, true);
      removeEventListener('resize', close);
      pop.classList.add('is-closing');
      scrim.remove();
      setTimeout(() => pop.remove(), 160);
      btn.focus({ preventScroll: true });
    };
    const choose = (v) => { set(v, true); close(); };
    const items = () => [...list.children];
    const onKey = (e) => {
      const cur = items().indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); e.stopPropagation();
        const n = items().length, i = cur < 0 ? options.indexOf(value) : cur;
        items()[(i + (e.key === 'ArrowDown' ? 1 : -1) + n) % n]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (cur >= 0) { e.preventDefault(); e.stopPropagation(); choose(options[cur]); }
      } else if (e.key === 'Tab') close();
    };

    list.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) choose(li.dataset.v); });
    scrim.addEventListener('pointerdown', (e) => { e.preventDefault(); close(); });
    document.body.append(scrim, pop);
    openPicker = close;
    btn.setAttribute('aria-expanded', 'true');
    addEventListener('keydown', onKey, true);
    addEventListener('resize', close);
    const sel = list.querySelector('[aria-selected="true"]');
    sel?.scrollIntoView({ block: 'center' });
    sel?.focus({ preventScroll: true });
  }

  btn.addEventListener('click', () => (openPicker ? closePicker() : open()));

  Object.defineProperty(btn, 'value', { get: () => value, set: (v) => set(v, false) });
  btn.setOptions = (list, selected) => {
    options = list.slice();
    set(options.includes(selected) ? selected : options[0], false);
  };
  return btn;
}
