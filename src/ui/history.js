// Paper-tape history: persisted, searchable, tap to reuse.
import { $, h } from './dom.js';
import { formatNumber } from '../engine/index.js';

export function createHistory({ onUseExpr, onUseValue, onClear }) {
  const panel = $('#historyPanel');
  const list = $('#tape');
  const empty = $('#tapeEmpty');
  const search = $('#historySearch');
  const scrim = $('#scrim');
  let items = [];
  let group = true;
  const wide = matchMedia('(min-width: 920px)');

  const time = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  function render() {
    const q = search.value.trim().toLowerCase();
    const shown = q ? items.filter((it) => (it.expr + '=' + it.value).toLowerCase().includes(q)) : items;
    list.replaceChildren(...shown.slice(0, 120).map((it) =>
      h('li', {},
        h('button.t-expr', { title: 'Load this expression', onclick: () => { onUseExpr(it); close(); } }, it.expr + ' ='),
        h('button.t-res', { title: 'Insert this result', onclick: () => { onUseValue(it); close(); } }, formatNumber(it.value, { group })),
        h('span.t-time', {}, time(it.t)),
      )));
    empty.hidden = shown.length > 0;
    empty.textContent = items.length && !shown.length ? 'Nothing on the tape matches.' : '';
    if (!items.length) empty.innerHTML = 'Your calculations print here, like a receipt roll.<br>Tap one to reuse it.';
  }

  function open() {
    if (wide.matches) { search.focus(); return; }
    panel.classList.add('is-open');
    scrim.hidden = false;
  }
  function close() {
    if (wide.matches) return;
    panel.classList.remove('is-open');
    scrim.hidden = true;
  }
  const toggle = () => (panel.classList.contains('is-open') ? close() : open());

  search.addEventListener('input', render);
  scrim.addEventListener('click', close);
  $('#historyClose').addEventListener('click', close);
  $('#historyClear').addEventListener('click', onClear);
  // swipe the sheet down to close
  let y0 = null;
  panel.addEventListener('pointerdown', (e) => { if (!e.target.closest('button, input, li')) y0 = e.clientY; });
  panel.addEventListener('pointerup', (e) => { if (y0 != null && e.clientY - y0 > 60) close(); y0 = null; });

  return {
    set(next, opts = {}) { items = next; group = opts.group ?? group; render(); },
    open, close, toggle,
    isOpen: () => panel.classList.contains('is-open'),
  };
}
