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
//  - `wanted` holds the latest choice; the swap always applies that, never a stale one.
//  - A colour burst grows from the tap, the theme swaps underneath it while it covers the screen
//    (so the expensive restyle is never seen), then the burst fades and the new theme bounces in.
//    Only clip-path and opacity animate, never the whole page, so it stays smooth on slow phones.
//  - Taps during the burst just retarget it; taps while it fades swap instantly.
let wanted = null;
let wipe = null; // { el, swapped }
const landers = new Set();

/** Called after every animated theme change lands (the character, sound, etc. hook in here). */
export const onThemeLanded = (fn) => landers.add(fn);

/** Swap with every CSS transition suspended for that frame, so 40 keys don't each animate a colour. */
// Lifting the class restyles the page once more, so after an animated switch it waits until the
// burst has faded and nothing is moving.
let restoreTimer = 0;
function quickSwap(holdMs = 0) {
  const d = document.documentElement;
  d.classList.add('theme-swap');
  swapTo(wanted);
  clearTimeout(restoreTimer);
  const lift = () => d.classList.remove('theme-swap');
  if (holdMs) restoreTimer = setTimeout(lift, holdMs);
  else requestAnimationFrame(() => requestAnimationFrame(lift));
}

const host = () => document.querySelector('dialog[open]') || document.body;

function startWipe(from) {
  const x = from?.x ?? innerWidth / 2, y = from?.y ?? innerHeight / 2;
  const r = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 2;
  const el = document.createElement('div');
  el.className = 'theme-wipe';
  el.style.background = wanted.swatch.bg;
  host().append(el);
  const w = { el, swapped: false };
  wipe = w;
  const grow = el.animate(
    [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${r}px at ${x}px ${y}px)` }],
    { duration: 340, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'forwards' });
  grow.finished.catch(() => {}).then(() => {
    quickSwap(900);
    w.swapped = true;
    // Two frames: let the restyle finish under the cover before anything moves again.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
      land(from);
      fade.finished.catch(() => {}).then(() => { el.remove(); if (wipe === w) wipe = null; });
    }));
  });
}

/** The bounce: the chosen card pops, and with no sheet open the keys ripple out from the tap. */
function land(from) {
  const card = document.querySelector(`.theme-card[data-theme-id="${wanted.id}"]`);
  card?.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1.06)' }, { transform: 'scale(.98)' }, { transform: 'scale(1)' }],
    { duration: 560, easing: 'cubic-bezier(.3,.6,.3,1)' });
  const sheet = document.querySelector('dialog[open]');
  if (sheet) {
    // The grid, not the sheet: transforming the sheet would re-anchor the fixed burst inside it.
    sheet.querySelector('.theme-grid')?.animate([{ transform: 'none' }, { transform: 'translateY(6px) scaleY(.992)' }, { transform: 'translateY(-3px)' }, { transform: 'none' }],
      { duration: 520, easing: 'ease-out' });
  } else {
    const ox = from?.x ?? innerWidth / 2, oy = from?.y ?? innerHeight / 2;
    for (const k of document.querySelectorAll('#keypad .key')) {
      const b = k.getBoundingClientRect();
      if (!b.width) continue;
      const delay = Math.min(260, Math.hypot(b.left + b.width / 2 - ox, b.top + b.height / 2 - oy) * 0.35);
      k.animate([{ transform: 'scale(1)' }, { transform: 'scale(.86)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }],
        { duration: 460, delay, easing: 'ease-out' });
    }
  }
  for (const fn of landers) { try { fn(wanted); } catch { /* never break the switch */ } }
}

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

export function applyTheme(id, { animate = true, from } = {}) {
  const t = themeById(id);
  wanted = t;
  if (!animate || reducedMotion()) {
    if (wipe) { wipe.el.remove(); wipe = null; }
    quickSwap();
    if (animate) for (const fn of landers) { try { fn(t); } catch { /* ignore */ } }
    return t;
  }
  if (wipe && !wipe.swapped) { wipe.el.style.background = t.swatch.bg; return t; } // still covering: lands on `wanted`
  if (wipe) { quickSwap(900); land(from); return t; } // fading out: swap right away
  startWipe(from);
  return t;
}

/** Load every theme font while the picker is open, so a switch never waits on a font. */
let fontsWarm = false;
function warmFonts() {
  if (fontsWarm || !document.fonts) return;
  fontsWarm = true;
  const go = () => document.fonts.forEach((f) => { if (f.status === 'unloaded') f.load().catch(() => {}); });
  if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 300);
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
    return h('button.theme-card', { 'aria-pressed': String(t.id === cur), 'data-theme-id': t.id, onclick: (e) => {
      const b = e.currentTarget.getBoundingClientRect();
      onTheme(t.id, { x: b.left + b.width / 2, y: b.top + b.height / 2 }); markPressed();
    } },
      miniPreview(t), h('span.theme-name', {}, t.name), h('span.theme-ref', {}, t.ref),
      t.exclusive ? h('span.theme-badge', {}, 'Exclusive') : null);
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
    const b = $('#themeShuffle').getBoundingClientRect();
    onTheme(others[Math.floor(Math.random() * others.length)].id, { x: b.left + b.width / 2, y: b.top + b.height / 2 });
    markPressed();
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });

  return {
    open() { renderGrid(); dlg.showModal(); warmFonts(); grid.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true }); },
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
