import './styles/fonts.css';
import './styles/base.css';
import './styles/themes.css';
import './styles/splash.css';
import { dismissSplash } from './ui/splash.js';

import { createStore } from './core/store.js';
import { load, save, flush } from './core/storage.js';
import { cleanSettings, cleanHistory, cleanNumber, cleanAngle, cleanBool, cleanView } from './core/schema.js';
import * as C from './core/calculator.js';
import { formatNumber, toExpr, evaluate } from './engine/index.js';
import { THEMES, themeById } from './themes.js';
import { $, $$, h, reducedMotion } from './ui/dom.js';
import { mountKeypad, keyboardAction, idForAction, flash, nope, setBroken, isBroken, setSecond, isSecond, setAngleLabel } from './ui/keypad.js';
import { createDisplay } from './ui/display.js';
import { createHistory } from './ui/history.js';
import { applyTheme, createThemeSheet, createMenuSheet } from './ui/themes-ui.js';
import { createPalette } from './ui/palette.js';
import { createTools } from './ui/tools.js';
import { closePicker, isPickerOpen } from './ui/picker.js';
import { setupTyping } from './ui/typing.js';
import { createGames, GAMES } from './ui/games/index.js';
import { toast } from './ui/toast.js';
import { sendFeedback } from './ui/feedback.js';
import { buzz, setHaptics, setHapticLevel } from './fx/haptics.js';
import { play, setSound, setSoundProfile, setSoundLevel } from './fx/sound.js';
import { burst } from './fx/confetti.js';

/* ---------------- Android app: system-bar sizes ---------------- */
// The app draws edge-to-edge (each theme's background runs behind the status and gesture bars), so it
// needs the bar sizes as CSS safe areas. Android WebView doesn't report env(safe-area-inset-*)
// reliably, so the native side provides them ("top,right,bottom,left" in CSS px) and pushes updates.
try {
  const v = window.BouncyNative?.insets?.();
  if (typeof v === 'string' && /^\d+(\.\d+)?(,\d+(\.\d+)?){3}$/.test(v)) {
    const [t, r, b, l] = v.split(',');
    const st = document.documentElement.style;
    st.setProperty('--sa-t', t + 'px'); st.setProperty('--sa-r', r + 'px');
    st.setProperty('--sa-b', b + 'px'); st.setProperty('--sa-l', l + 'px');
  }
} catch { /* web: CSS env() values are used */ }

/* ---------------- state ---------------- */
// Key sounds are on by default since 1.0. Earlier installs saved "off" as their default, so turn
// sounds on once for them; after that, whatever the person chooses is kept.
function soundOnOnce(settings) {
  if (load('soundDefaultV2', false) === true) return settings;
  save('soundDefaultV2', true, 0);
  return { ...settings, sound: true };
}

const VIEWS = ['calc', 'tools', 'games'];
// Everything from storage is validated: corrupted data falls back to defaults instead of crashing.
const store = createStore({
  calc: { ...C.initialCalc(), ans: cleanNumber(load('ans', 0)) },
  angle: cleanAngle(load('angle', 'deg')),
  memory: cleanNumber(load('memory', 0)),
  history: cleanHistory(load('history', [])),
  theme: themeById(document.documentElement.dataset.theme).id,
  sci: cleanBool(load('sci', false)),
  view: cleanView(load('view', 'calc'), VIEWS),
  settings: soundOnOnce(cleanSettings(load('settings', {}))),
});
const S = () => store.get();
const undo = [], redo = [];

function setCalc(next, { record = true } = {}) {
  const cur = S().calc;
  if (next === cur) return;
  if (record && (next.expr !== cur.expr)) {
    undo.push({ expr: cur.expr, caret: cur.caret, evaluated: cur.evaluated, prevExpr: cur.prevExpr });
    if (undo.length > 100) undo.shift();
    redo.length = 0;
  }
  store.set({ calc: next });
}

/* ---------------- fx helpers ---------------- */
const feedback = (kind) => { buzz(kind); play(kind); };
const shake = (el) => { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };

async function copy(text) {
  try {
    if (window.BouncyNative?.copy) window.BouncyNative.copy(String(text)); // Android app: system clipboard
    else await navigator.clipboard.writeText(text);
  } catch {
    const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
    document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } catch { /* ignore */ }
    ta.remove();
  }
  toast(`Copied ${text}`);
  buzz('op');
}

/* ---------------- calculator actions ---------------- */
function currentValue() {
  const { calc, angle } = S();
  if (calc.evaluated) return calc.ans;
  const p = C.preview(calc, angle);
  if (p != null) return p;
  const r = evaluate(calc.expr, { angle, ans: calc.ans });
  return r.ok ? r.value : null;
}

const EGGS = [
  [(v, e) => e.replace(/\s/g, '') === '0.1+0.2', '0.3 — floating point, tamed.'],
  [(v) => v === 42, 'The answer to life, the universe and everything.'],
  [(v) => v === 1337, 'l33t. Respect.', { glyph: '1' }],
  [(v) => v === 404, 'Result not found. (Just kidding.)'],
  [(v, e) => Math.abs(v - Math.PI) < 1e-4 && !e.includes('π'), 'That’s π, give or take.', { glyph: 'π' }],
  [(v) => v === 111111111, 'All ones. Mathematical magic.'],
  [(v) => Math.abs(v) >= 1e100, 'Googol territory.'],
];

function doEquals() {
  const { calc, angle } = S();
  if (calc.evaluated || !calc.expr) return;
  const { state, result } = C.equals(calc, angle);
  if (!result.ok) {
    setCalc(state, { record: false });
    display.shake(); feedback('error');
    return;
  }
  setCalc(state);
  feedback('eq');
  const hist = [{ id: Date.now(), expr: state.prevExpr, value: state.ans, t: Date.now() }, ...S().history].slice(0, 200);
  store.set({ history: hist });
  for (const [test, msg, opts] of EGGS) {
    if (test(state.ans, state.prevExpr)) {
      toast(msg, 2600);
      const r = $('#result').getBoundingClientRect();
      burst({ x: r.right - 60, y: r.top + 20, count: 60, ...(opts || {}) });
      break;
    }
  }
}

function memory(op) {
  const { memory: m, calc } = S();
  if (op === 'mc') { store.set({ memory: 0 }); toast('Memory cleared'); return; }
  if (op === 'mr') {
    if (!m) { toast('Memory is empty'); return; }
    setCalc(C.insertValue(calc, m));
    return;
  }
  const v = currentValue();
  if (v == null) { toast('Nothing to store yet'); nope('mplus'); return; }
  const next = op === 'mplus' ? m + v : m - v;
  if (!Number.isFinite(next)) { toast('Memory overflow — not stored'); nope(op); feedback('error'); return; }
  store.set({ memory: Number(next.toPrecision(12)) });
  toast(`M = ${formatNumber(Number(next.toPrecision(12)))}`);
}

function calcAction(a) {
  const st = S();
  if (a.type === 'ins') return setCalc(C.insert(st.calc, a.tok));
  switch (a.cmd) {
    case 'eq': return doEquals();
    case 'bksp': return setCalc(C.backspace(st.calc));
    case 'ac': return setCalc(C.clear(st.calc));
    case 'del': return setCalc(C.del(st.calc));
    case 'left': return setCalc(C.moveCaret(st.calc, -1), { record: false });
    case 'right': return setCalc(C.moveCaret(st.calc, 1), { record: false });
    case 'home': return setCalc(C.setCaret(st.calc, 0), { record: false });
    case 'end': return setCalc(C.setCaret(st.calc, Infinity), { record: false });
    case 'mc': case 'mr': case 'mplus': case 'mminus': return memory(a.cmd);
  }
}

/** Every input (pointer, keyboard, palette) comes through here. */
function dispatch(a, meta = {}) {
  const kind = meta.kind || (a.type === 'ins' && /^[0-9.]$/.test(a.tok) ? 'num' : a.cmd === 'eq' ? 'eq' : 'op');
  // global commands
  if (a.type === 'cmd') {
    switch (a.cmd) {
      case 'second': setSecond(!isSecond()); feedback('fn'); return;
      case 'angle': toggleAngle(); return;
      case 'sci': store.set({ sci: !S().sci }); feedback('fn'); return;
      case 'history': history.toggle(); return;
      case 'palette': palette.open(); return;
    }
  }
  if (S().view === 'games' && games.wantsKeys()) {
    if (kind !== 'eq') feedback(kind);
    games.action(a, meta);
    return;
  }
  if (S().view === 'tools') return;
  if (S().view === 'games') return; // on the games menu, keys do nothing
  if (kind !== 'eq') feedback(kind);
  calcAction(a);
  if (isSecond() && a.type === 'ins' && meta.kind === 'fn') setSecond(false);
}

function toggleAngle() {
  const angle = S().angle === 'deg' ? 'rad' : 'deg';
  store.set({ angle });
  toast(angle === 'deg' ? 'Degrees' : 'Radians', 900);
  feedback('fn');
}

/** Android back button / gesture: close the top-most layer. Returns false when there's nothing left to close. */
/** Is there a layer the Back gesture should close (dialog, tape, game, non-calculator tab)? No side effects. */
function canGoBack() {
  if (document.getElementById('splash')) return false; // Back during the loading screen leaves the app
  if (isPickerOpen()) return true;
  if (document.querySelector('dialog[open]')) return true;
  if (history.isOpen()) return true;
  return S().view !== 'calc';
}

function goBack() {
  if (closePicker()) return true;
  const open = [...document.querySelectorAll('dialog[open]')].pop(); // the top-most one
  if (open) { open.close(); return true; }
  if (history.isOpen()) { history.close(); return true; }
  if (S().view === 'games' && !document.querySelector('#games .game-menu')) { games.leave(); return true; } // game or intro → games menu
  if (S().view !== 'calc') { setView('calc'); return true; }
  return false;
}

function setView(view) {
  if (!VIEWS.includes(view)) return;
  closePicker();
  if (S().view === 'games' && view !== 'games') games.leave();
  store.set({ view });
  history.close();
}

function doUndo(dir) {
  const from = dir < 0 ? undo : redo, to = dir < 0 ? redo : undo;
  const snap = from.pop();
  if (!snap) { nope('bksp'); return; }
  const cur = S().calc;
  to.push({ expr: cur.expr, caret: cur.caret, evaluated: cur.evaluated, prevExpr: cur.prevExpr });
  store.set({ calc: { ...cur, ...snap, error: '' } });
  feedback('op');
}

function wipeAll() {
  store.set({ history: [], memory: 0, calc: { ...C.clear(S().calc), ans: 0 } });
  buzz('long');
  toast('Tape, memory and Ans wiped');
}

/* ---------------- mount UI ---------------- */
mountKeypad(dispatch, { onLongAC: () => { if (S().view === 'calc') wipeAll(); } });

const display = createDisplay({
  onCaret: (i) => setCalc(C.setCaret(S().calc, i), { record: false }),
  onCopy: () => {
    const v = currentValue();
    if (v != null) copy(toExpr(v));
  },
  onSwipe: (dir) => {
    if (dir === 'left') dispatch({ type: 'cmd', cmd: 'bksp' }, { kind: 'op' });
    else if (dir === 'right') doUndo(-1);
    else if (dir === 'down') dispatch({ type: 'cmd', cmd: 'ac' }, { kind: 'ac' });
    else history.open();
  },
});

const history = createHistory({
  onUseExpr: (it) => { setView('calc'); setCalc({ ...C.initialCalc(), ans: S().calc.ans, expr: it.expr, caret: it.expr.length }); },
  onUseValue: (it) => { setView('calc'); setCalc(C.insertValue(S().calc, it.value)); },
  onClear: () => { store.set({ history: [] }); toast('Tape cleared'); },
});

function setTheme(id) {
  const t = applyTheme(id);
  setSoundProfile(t.id);
  store.set({ theme: t.id });
  save('theme', t.id, 0);
  play('eq');
}
const themeSheet = createThemeSheet({ getState: S, onTheme: setTheme });
const menuSheet = createMenuSheet({
  getState: S,
  onSetting: (key, val) => store.set({ settings: { ...S().settings, [key]: val } }),
  onSettings: (patch) => store.set({ settings: { ...S().settings, ...patch } }),
  preview: { sound: () => play('eq'), vibrate: () => buzz('eq') },
});

const palette = createPalette({
  getAngle: () => S().angle,
  onCalc: (expr) => { setView('calc'); setCalc({ ...C.initialCalc(), ans: S().calc.ans, expr, caret: expr.length }); doEquals(); },
  commands: () => [
    ...VIEWS.map((v) => ({ title: `Go to ${v[0].toUpperCase() + v.slice(1)}`, sub: 'view', run: () => setView(v) })),
    ...GAMES.map((g) => ({ title: `Play ${g.name}`, sub: g.desc, run: () => { setView('games'); games.start(g.id); } })),
    ...THEMES.map((t) => ({ title: `Theme: ${t.name}`, sub: t.ref, run: () => setTheme(t.id) })),
    { title: 'Toggle scientific panel', keys: 'F', run: () => store.set({ sci: !S().sci }) },
    { title: 'Toggle degrees / radians', keys: 'D', run: toggleAngle },
    { title: 'Open history tape', keys: 'H', run: () => history.open() },
    { title: 'Open themes', run: () => themeSheet.open() },
    { title: 'Open settings', run: () => menuSheet.open() },
    { title: 'Copy result', keys: 'Ctrl C', run: () => { const v = currentValue(); if (v != null) copy(toExpr(v)); } },
    { title: 'Undo', keys: 'Ctrl Z', run: () => doUndo(-1) },
    { title: 'Redo', keys: 'Ctrl Y', run: () => doUndo(1) },
    { title: `Key sounds: ${S().settings.sound ? 'on → off' : 'off → on'}`, run: () => store.set({ settings: { ...S().settings, sound: !S().settings.sound } }) },
    { title: 'Clear history tape', run: () => store.set({ history: [] }) },
    { title: 'Wipe everything (tape, memory, Ans)', run: wipeAll },
    { title: 'Send feedback', sub: 'opens your mail app', run: openFeedback },
    { title: 'Keyboard shortcuts', sub: 's c t l g r p e · Enter = · Esc AC · Del · ←→ caret', run: () => toast('s c t → sin cos tan · l ln · g log · r √ · p π · ^ power · ! factorial · Enter = · Esc AC · Del deletes forward · ←/→ move caret · Ctrl+K commands', 6000) },
    { title: 'Surprise me (random theme)', run: () => { const o = THEMES.filter((t) => t.id !== S().theme); setTheme(o[Math.floor(Math.random() * o.length)].id); } },
  ],
});

const tools = createTools($('#tools'), {
  getAns: () => S().calc.ans,
  feedback: (k) => feedback(k),
  sendToCalc: (v) => {
    const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, '').replace(/−/g, '-'));
    if (!String(v).trim() || !Number.isFinite(n)) { toast('Nothing to send yet'); return; }
    setView('calc');
    setCalc(C.insertValue({ ...C.initialCalc(), ans: S().calc.ans }, n));
    toast('Sent to calculator');
  },
});

const games = createGames($('#games'), {
  buzz, play, burst, toast, setBroken, isBroken,
  shake,
  // The keypad only shows while a game runs; on the menu and intro it would just eat the screen.
  onPlayingChange: (on) => { $('#app').toggleAttribute('data-playing', on); },
  nope: (a) => { const id = idForAction(a); if (id) nope(id); },
});

/* ---------------- feedback ---------------- */
function openFeedback() {
  const ua = navigator.userAgent.replace(/\s+/g, ' ').slice(0, 160);
  sendFeedback({
    version: __APP_VERSION__,
    theme: themeById(S().theme).name,
    screen: `${innerWidth}×${innerHeight} @${Math.round((devicePixelRatio || 1) * 10) / 10}x`,
    browser: ua,
  });
}
$('#feedbackBtn').addEventListener('click', openFeedback);

/* ---------------- chrome: tabs, buttons ---------------- */
$$('.tabs [role="tab"]').forEach((b) => b.addEventListener('click', () => { setView(b.dataset.view); buzz('fn'); }));
$('#btnHistory').addEventListener('click', () => history.toggle());
$('#btnTheme').addEventListener('click', () => themeSheet.open());
$('#btnMenu').addEventListener('click', () => menuSheet.open()); // Ctrl+K still opens the command palette
$('#angleChip').addEventListener('click', toggleAngle);

/* ---------------- keyboard & paste ---------------- */
window.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  const t = e.target;
  const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); palette.open(); return; }
  if (typing) return;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); doUndo(e.shiftKey ? 1 : -1); return; }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doUndo(1); return; }
  if (mod && e.key.toLowerCase() === 'c' && !String(getSelection())) {
    e.preventDefault(); const v = currentValue(); if (v != null) copy(toExpr(v)); return;
  }
  if (t?.closest?.('.key') && (e.key === 'Enter' || e.key === ' ')) return; // handled by the button click
  if (e.key === 'Tab' || e.key === ' ') return;
  if (e.key === 'Escape' && history.isOpen()) { history.close(); return; }
  const a = keyboardAction(e);
  if (!a) return;
  e.preventDefault();
  const id = idForAction(a);
  if (id) flash(id);
  dispatch(a, { id, source: 'keyboard' });
});

/** Insert pasted text (Ctrl+V or the paste button). Same strict clean-up either way. */
function pasteText(rawText) {
  const text = C.sanitizePaste(rawText);
  if (!text) {
    if (String(rawText).trim()) { toast('Couldn’t read that as a sum'); feedback('error'); }
    return false;
  }
  setView('calc');
  setCalc(C.insert(S().calc, text));
  toast('Pasted');
  return true;
}

window.addEventListener('paste', (e) => {
  const t = e.target;
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;
  const rawText = e.clipboardData?.getData('text') || '';
  if (!rawText.trim()) return;
  e.preventDefault();
  pasteText(rawText);
});

// Paste button next to DEG/RAD. Android app: the system clipboard through the native bridge.
// Web: the Clipboard API (the browser may ask for permission or show its own "Paste" bubble).
$('#pasteChip').addEventListener('click', async () => {
  let raw = '';
  try {
    if (window.BouncyNative?.paste) raw = String(window.BouncyNative.paste() || '');
    else if (navigator.clipboard?.readText) raw = await navigator.clipboard.readText();
    else { toast('Use Ctrl+V or long-press to paste'); return; }
  } catch {
    toast('Allow clipboard access to paste'); feedback('error'); return;
  }
  if (!raw.trim()) { toast('Clipboard is empty'); feedback('error'); return; }
  if (pasteText(raw.slice(0, 400))) feedback('op');
});

/* ---------------- render + persist ---------------- */
let prev = {};
function render(s) {
  const tabIndex = VIEWS.indexOf(s.view);
  if (s.view !== prev.view) {
    $('.tabs').style.setProperty('--tab', tabIndex);
    $$('.tabs [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === s.view)));
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.dataset.view === s.view));
    $('#app').dataset.view = s.view;
    save('view', s.view);
  }
  if (s.calc !== prev.calc || s.angle !== prev.angle || s.settings !== prev.settings) {
    const pv = C.preview(s.calc, s.angle);
    display.render(s.calc, { preview: pv, group: s.settings.group, error: s.calc.error });
    if (s.calc.ans !== prev.calc?.ans) save('ans', s.calc.ans);
  }
  if (s.angle !== prev.angle) { $('#angleChip').textContent = s.angle.toUpperCase(); setAngleLabel(s.angle); save('angle', s.angle); }
  if (s.memory !== prev.memory) {
    const chip = $('#memChip');
    chip.hidden = !s.memory;
    chip.textContent = `M ${formatNumber(s.memory)}`;
    save('memory', s.memory);
  }
  if (s.sci !== prev.sci) {
    $('#app').classList.toggle('is-sci', s.sci);
    document.querySelector('.key[data-id="fx"]')?.classList.toggle('is-on', s.sci);
    save('sci', s.sci);
  }
  if (s.history !== prev.history || s.settings.group !== prev.settings?.group) {
    history.set(s.history, { group: s.settings.group });
    save('history', s.history, 600);
  }
  if (s.settings !== prev.settings) {
    setSound(s.settings.sound);
    setSoundLevel(s.settings.soundLevel);
    setHaptics(s.settings.haptics);
    setHapticLevel(s.settings.hapticLevel);
    document.documentElement.classList.toggle('reduce-motion', s.settings.reduceMotion);
    $('#metaHint').hidden = !s.settings.hints;
    save('settings', s.settings);
  }
  prev = s;
}
store.sub(render);

/* ---------------- font licences (in-app sheet) ---------------- */
// Opening licenses.txt as a page left the Android app stuck on a plain text file with no way back,
// so the licences open in a sheet on top of the app instead (the link still works without JS).
{
  const dlg = $('#licences');
  const text = $('#licencesText');
  let loaded = false;
  $('#licencesLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!dlg.open) dlg.showModal();
    if (loaded) return;
    fetch('./licenses.txt', { cache: 'force-cache' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => { text.textContent = t.slice(0, 20000); loaded = true; })
      .catch(() => { text.textContent = 'All fonts in this app are licensed under the SIL Open Font License 1.1. The full text could not be loaded right now.'; });
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); });
}

/* ---------------- smooth closing for dialogs ---------------- */
// Every way a dialog closes (Back, Esc, the close button, tapping outside) goes through dlg.close(),
// so wrapping it gives all of them the same exit animation.
for (const dlg of document.querySelectorAll('dialog')) {
  const closeNow = HTMLDialogElement.prototype.close.bind(dlg);
  dlg.close = (value) => {
    if (!dlg.open || dlg.classList.contains('is-closing')) return;
    if (reducedMotion()) { closeNow(value); return; }
    dlg.classList.add('is-closing');
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      dlg.classList.remove('is-closing');
      closeNow(value);
    };
    dlg.addEventListener('animationend', (e) => { if (e.target === dlg) finish(); }, { once: true });
    setTimeout(finish, 360); // never leave a dialog half-closed
  };
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); dlg.close(); }); // Esc animates too
}

/* ---------------- Android app: leave / return animation ---------------- */
function outro() {
  if (reducedMotion()) return false;
  const d = document.documentElement;
  d.classList.remove('app-return');
  d.classList.add('app-out');
  return true;
}
/** Back to normal after leaving. `instant` (used as soon as the app is in the background) skips
 *  any animation, so the recent-apps snapshot and the reopened app look identical: no flash. */
function returnIn(instant = false) {
  const d = document.documentElement;
  if (!d.classList.contains('app-out')) return false;
  if (instant || reducedMotion()) {
    d.classList.add('no-anim');
    d.classList.remove('app-out', 'app-return');
    void d.offsetWidth; // apply the reset now, without transitions
    requestAnimationFrame(() => d.classList.remove('no-anim'));
    setTimeout(() => d.classList.remove('no-anim'), 120); // rAF may not run in the background
    return true;
  }
  d.classList.remove('app-out');
  d.classList.add('app-return');
  setTimeout(() => d.classList.remove('app-return'), 600);
  return true;
}

/* ---------------- boot ---------------- */
setupTyping();
const t = applyTheme(S().theme, { animate: false });
setSoundProfile(t.id);
render(S());
$('#metaHint').textContent = matchMedia('(hover: hover)').matches
  ? 'type to calculate · Ctrl+K commands'
  : 'swipe ← delete · ↓ clear · ↑ tape';

dismissSplash();

// Installable offline app when served over http(s) (not in the single-file build).
if (import.meta.env.PROD && import.meta.env.MODE !== 'single' && import.meta.env.MODE !== 'android' && location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Read-only hook for the Android/Tauri wrappers and automated tests. It can read state and switch
// themes but cannot write arbitrary state, so a stray script can't plant data through it.
window.bouncy = Object.freeze({ getState: () => S(), setTheme, back: goBack, flush, outro, returnIn, themes: Object.freeze(THEMES.map((x) => x.id)) });

// Never lose the last calculation: write pending saves the moment the page is hidden or closed.
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

// Android app: tell the native side whether Back has something to close. When it doesn't, Android
// handles Back itself, so the system "back to home" gesture animation plays and the app exits cleanly.
if (window.BouncyNative?.setCanGoBack) {
  let last = null, queued = false;
  const sync = () => {
    queued = false;
    const v = canGoBack();
    if (v !== last) { last = v; try { window.BouncyNative.setCanGoBack(v); } catch { /* ignore */ } }
  };
  const queue = () => { if (!queued) { queued = true; queueMicrotask(sync); } };
  store.sub(queue);
  new MutationObserver(queue).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'class'] });
  addEventListener('bouncy:splash-gone', queue);
  sync();
}

// Android app: the page is ready to show, so the system splash screen can hand over.
try { window.BouncyNative?.ready?.(); } catch { /* ignore */ }
