// Theme picker sheet + settings toggles.
import { $, h, reducedMotion } from './dom.js';
import { THEMES, themeById } from '../themes.js';

export function applyTheme(id, { animate = true } = {}) {
  const t = themeById(id);
  const doc = document.documentElement;
  const swap = () => {
    doc.dataset.theme = t.id;
    $('#themeLabel').textContent = t.label;
    const meta = document.querySelector('meta[name="theme-color"]');
    const bg = getComputedStyle(doc).getPropertyValue('--bg').trim() || t.swatch.bg;
    if (meta) meta.content = bg;
    // Android app: tint the system bars to match (no-op on the web).
    try { window.BouncyNative?.setBars?.(/^#[0-9a-f]{6}$/i.test(bg) ? bg : t.swatch.bg, t.scheme === 'dark'); } catch { /* ignore */ }
  };
  if (animate && document.startViewTransition && !reducedMotion()) {
    // Rapid switching skips the previous transition; its promises then reject with AbortError.
    // That's expected, so swallow it instead of spamming unhandled rejections.
    const vt = document.startViewTransition(swap);
    for (const p of [vt.ready, vt.finished, vt.updateCallbackDone]) p?.catch?.(() => {});
  } else swap();
  return t;
}

function miniPreview(t) {
  const s = t.swatch;
  const keys = Array.from({ length: 12 }, (_, i) => {
    const bg = i === 11 ? s.accent : i % 4 === 3 ? s.op : s.key;
    return h('i', { style: { background: bg, borderRadius: t.square ? '3px' : '99px', border: s.key.startsWith('rgba') || s.key === s.bg ? `1px solid ${s.op}` : '0' } });
  });
  return h('div.mini', { style: { background: s.bg } },
    h('div.mini-display', { style: { background: t.scheme === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)', color: s.text === s.bg ? s.key : (t.scheme === 'dark' ? s.text : '#222') } }, '1,337'),
    h('div.mini-keys', {}, keys));
}

export function createThemeSheet({ getState, onTheme, onSetting }) {
  const dlg = $('#themeSheet');
  const grid = $('#themeGrid');
  const settingsEl = $('#settings');

  function renderGrid() {
    const cur = getState().theme;
    grid.replaceChildren(...THEMES.map((t) =>
      h('button.theme-card', { 'aria-pressed': String(t.id === cur), onclick: () => { onTheme(t.id); renderGrid(); } },
        miniPreview(t), h('span.theme-name', {}, t.name), h('span.theme-ref', {}, t.ref))));
  }

  const SETTINGS = [
    ['sound', 'Key sounds', 'Synthesised per theme. No audio files.'],
    ['haptics', 'Haptics', 'Vibration on supported phones.'],
    ['group', 'Thousands separators', '1,234,567 instead of 1234567.'],
    ['hints', 'Gesture hints', 'Show swipe hints on the display.'],
    ['reduceMotion', 'Reduce motion', 'Calmer animations (also follows your OS).'],
  ];
  function renderSettings() {
    const st = getState().settings;
    settingsEl.replaceChildren(...SETTINGS.map(([key, label, sub]) =>
      h('label.switch', {}, h('span', {}, label, h('small', {}, sub)),
        h('input', { type: 'checkbox', checked: !!st[key], onchange: (e) => onSetting(key, e.target.checked) }))));
  }

  $('#themeShuffle').addEventListener('click', () => {
    const cur = getState().theme;
    const others = THEMES.filter((t) => t.id !== cur);
    onTheme(others[Math.floor(Math.random() * others.length)].id);
    renderGrid();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });

  return {
    open() { renderGrid(); renderSettings(); dlg.showModal(); grid.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true }); },
    close() { dlg.close(); },
    isOpen: () => dlg.open,
  };
}
