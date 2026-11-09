// Theme picker sheet + settings toggles.
import { $, h, reducedMotion } from './dom.js';
import { THEMES, themeById } from '../themes.js';
import { applyArt, charUrl } from './theme-art.js';

/** Light status-bar icons only when they out-contrast dark ones (WCAG luminance below ~0.18). */
export function isDarkColor(hex) {
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const n = parseInt(hex.slice(1), 16);
  const L = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
  return L < 0.18;
}

// Theme switching must always land on the LAST theme picked, however fast someone taps.
//  - `wanted` holds the latest choice; every pending swap applies that, never a stale one.
//  - A running transition is skipped (not stacked), and rapid taps switch instantly without a
//    transition at all, so nothing queues up, freezes, or swallows a tap.
let wanted = null;
let activeVT = null;
let lastSwitch = -1e9;
const RAPID_MS = 600;

function swapTo(t) {
  const doc = document.documentElement;
  doc.dataset.theme = t.id;
  applyArt(t.id);
  $('#themeLabel').textContent = t.label;
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = screenColour() || getComputedStyle(doc).getPropertyValue('--bg').trim() || t.swatch.bg;
  if (meta) meta.content = bg;
  // Android app: tint the system bars to match (no-op on the web).
  // Icon colour follows the real background brightness, not just the theme's light/dark label.
  const hex = /^#[0-9a-f]{6}$/i.test(bg) ? bg : /^#[0-9a-f]{6}$/i.test(t.swatch.bg) ? t.swatch.bg : null;
  try { if (hex) window.BouncyNative?.setBars?.(hex, isDarkColor(hex)); } catch { /* ignore */ }
}

/**
 * The colour actually filling the screen: on phones the calculator body (.app) covers everything,
 * and in some themes it differs from the backdrop. Used for the status/navigation bars and the
 * Android window colour, so nothing flashes a different shade while the app starts or resumes.
 */
function screenColour() {
  const app = document.querySelector('.app');
  if (!app || !matchMedia('(max-width: 919px), (max-height: 599px)').matches) return ''; // desktop: the backdrop is what shows
  const m = getComputedStyle(app).backgroundColor.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
  if (!m || (m[4] !== undefined && Number(m[4]) < 1)) return ''; // transparent body: the backdrop shows
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
}

export function applyTheme(id, { animate = true } = {}) {
  const t = themeById(id);
  wanted = t;
  const now = performance.now();
  const rapid = now - lastSwitch < RAPID_MS;
  lastSwitch = now;

  if (activeVT) {
    try { activeVT.skipTransition(); } catch { /* already done */ }
  }
  if (animate && !rapid && !activeVT && document.startViewTransition && !reducedMotion()) {
    const vt = document.startViewTransition(() => swapTo(wanted));
    activeVT = vt;
    // Rapid switching skips transitions; their promises then reject with AbortError. Expected.
    for (const p of [vt.ready, vt.updateCallbackDone]) p?.catch?.(() => {});
    vt.finished.catch(() => {}).finally(() => { if (activeVT === vt) activeVT = null; });
  } else {
    swapTo(t);
  }
  return t;
}

function miniPreview(t) {
  const s = t.swatch;
  const keys = Array.from({ length: 12 }, (_, i) => {
    const bg = i === 11 ? s.accent : i % 4 === 3 ? s.op : s.key;
    const art = i === 11 && t.exclusive ? { backgroundImage: charUrl(t.id), backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' } : {};
    return h('i', { style: { background: bg, ...art, borderRadius: t.square ? '3px' : '99px', border: s.key.startsWith('rgba') || s.key === s.bg ? `1px solid ${s.op}` : '0' } });
  });
  return h('div.mini', { style: { background: s.bg } },
    h('div.mini-display', { style: { background: t.scheme === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)', color: s.text === s.bg ? s.key : (t.scheme === 'dark' ? s.text : '#222') } }, '1,337'),
    h('div.mini-keys', {}, keys));
}

export function createThemeSheet({ getState, onTheme }) {
  const dlg = $('#themeSheet');
  const grid = $('#themeGrid');

  function card(t, cur) {
    return h('button.theme-card', { 'aria-pressed': String(t.id === cur), 'data-theme-id': t.id, onclick: () => { onTheme(t.id); markPressed(); } },
      miniPreview(t), h('span.theme-name', {}, t.name, t.exclusive ? h('span.theme-badge', {}, 'Exclusive') : null), h('span.theme-ref', {}, t.ref));
  }
  function renderGrid() {
    const cur = getState().theme;
    const ex = THEMES.filter((t) => t.exclusive), std = THEMES.filter((t) => !t.exclusive);
    grid.replaceChildren(
      h('h3.theme-section', {}, 'Exclusive', h('small', {}, 'Original characters on the keys')),
      ...ex.map((t) => card(t, cur)),
      h('h3.theme-section', {}, 'Classic', h('small', {}, `${std.length} themes inspired by real objects`)),
      ...std.map((t) => card(t, cur)));
  }

  function markPressed() {
    const cur = getState().theme;
    for (const b of grid.querySelectorAll('.theme-card')) b.setAttribute('aria-pressed', String(b.dataset.themeId === cur));
  }

  $('#themeShuffle').addEventListener('click', () => {
    const cur = getState().theme;
    const others = THEMES.filter((t) => t.id !== cur);
    onTheme(others[Math.floor(Math.random() * others.length)].id);
    markPressed();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });

  return {
    open() { renderGrid(); dlg.showModal(); grid.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true }); },
    close() { dlg.close(); },
    isOpen: () => dlg.open,
  };
}

/**
 * The ☰ menu: settings (sound, vibration, display options), feedback, legal and credits.
 * The theme sheet now holds only the themes.
 */
export function createMenuSheet({ getState, onSetting, onSettings, preview }) {
  const dlg = $('#menuSheet');
  const settingsEl = $('#settings');

  // Sound and vibration: Off + three levels, with a preview when you pick one.
  const LEVELS = [
    { on: 'sound', lvl: 'soundLevel', label: 'Sound', sub: window.BouncyNative ? 'Each theme has its own sounds. Follows your phone: muted on silent or vibrate.' : 'Each theme has its own key sounds.', names: ['Off', 'Low', 'Medium', 'High'], test: () => preview?.sound() },
    { on: 'haptics', lvl: 'hapticLevel', label: 'Vibration', sub: 'On key presses, results and games. Independent of your phone\u2019s sound and vibration settings.', names: ['Off', 'Light', 'Medium', 'Strong'], test: () => preview?.vibrate() },
  ];
  function levelRow(c) {
    const st = getState().settings;
    const cur = st[c.on] ? st[c.lvl] : 0;
    return h('div.level-setting', {},
      h('span', {}, c.label, h('small', {}, c.sub)),
      h('div.seg', { role: 'radiogroup', 'aria-label': c.label },
        c.names.map((name, i) => h('button', {
          type: 'button', role: 'radio', 'aria-checked': String(i === cur),
          onclick: () => {
            onSettings(i === 0 ? { [c.on]: false } : { [c.on]: true, [c.lvl]: i });
            renderSettings();
            if (i > 0) setTimeout(c.test, 30); // let the new level apply first
          },
        }, name))));
  }

  const SETTINGS = [
    ['group', 'Thousands separators', '1,234,567 instead of 1234567.'],
    ['hints', 'Gesture hints', 'Show swipe hints on the display.'],
    ['reduceMotion', 'Reduce motion', 'Calmer animations (also follows your OS).'],
  ];
  function renderSettings() {
    const st = getState().settings;
    settingsEl.replaceChildren(...LEVELS.map(levelRow), ...SETTINGS.map(([key, label, sub]) =>
      h('label.switch', {}, h('span', {}, label, h('small', {}, sub)),
        h('input', { type: 'checkbox', checked: !!st[key], onchange: (e) => onSetting(key, e.target.checked) }))));
  }

  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });

  return {
    open() { renderSettings(); dlg.showModal(); },
    close() { dlg.close(); },
    isOpen: () => dlg.open,
  };
}
