// Keypad: definitions, rendering, pointer + keyboard input → actions.
import { h, $ } from './dom.js';

const ins = (tok) => ({ type: 'ins', tok });
const cmd = (c) => ({ type: 'cmd', cmd: c });

export const MAIN_KEYS = [
  { id: 'ac', label: 'AC', kind: 'ac', act: cmd('ac'), aria: 'All clear — hold to wipe memory and tape', alt: 'esc' },
  { id: 'paren', label: '( )', kind: 'op', act: ins('()'), aria: 'Brackets', alt: '( )' },
  { id: 'pct', label: '%', kind: 'op', act: ins('%'), aria: 'Percent', alt: '%' },
  { id: 'div', label: '÷', kind: 'op', act: ins('÷'), aria: 'Divide', alt: '/' },
  ...['7', '8', '9'].map((d) => ({ id: 'd' + d, label: d, kind: 'num', act: ins(d) })),
  { id: 'mul', label: '×', kind: 'op', act: ins('×'), aria: 'Multiply', alt: '*' },
  ...['4', '5', '6'].map((d) => ({ id: 'd' + d, label: d, kind: 'num', act: ins(d) })),
  { id: 'sub', label: '−', kind: 'op', act: ins('−'), aria: 'Minus', alt: '-' },
  ...['1', '2', '3'].map((d) => ({ id: 'd' + d, label: d, kind: 'num', act: ins(d) })),
  { id: 'add', label: '+', kind: 'op', act: ins('+'), aria: 'Plus', alt: '+' },
  { id: 'd0', label: '0', kind: 'num', act: ins('0') },
  { id: 'dot', label: '.', kind: 'num', act: ins('.'), aria: 'Decimal point' },
  { id: 'bksp', label: '⌫', kind: 'op', act: cmd('bksp'), aria: 'Delete — hold to repeat', alt: 'bksp' },
  { id: 'eq', label: '=', kind: 'eq', act: cmd('eq'), aria: 'Equals', alt: 'enter' },
];

// [id, label, act, label2nd, act2nd]
const SCI = [
  ['second', '2nd', cmd('second')], ['angle', 'DEG', cmd('angle')],
  ['sin', 'sin', ins('sin('), 'sin<sup>−1</sup>', ins('asin(')],
  ['cos', 'cos', ins('cos('), 'cos<sup>−1</sup>', ins('acos(')],
  ['tan', 'tan', ins('tan('), 'tan<sup>−1</sup>', ins('atan(')],
  ['ln', 'ln', ins('ln('), 'e<sup>x</sup>', ins('e^(')],
  ['log', 'log', ins('log('), '10<sup>x</sup>', ins('10^(')],
  ['sqrt', '√', ins('√('), '∛', ins('∛(')],
  ['sq', 'x<sup>2</sup>', ins('²'), 'x<sup>3</sup>', ins('³')],
  ['pow', 'x<sup>y</sup>', ins('^'), 'x<sup>y</sup>', ins('^')],
  ['pi', 'π', ins('π'), 'π', ins('π')],
  ['e', 'e', ins('e'), 'e', ins('e')],
  ['fact', 'n!', ins('!'), 'n!', ins('!')],
  ['inv', '1/x', ins('^(−1)'), '|x|', ins('abs(')],
  ['ee', 'EE', ins('E'), 'Ans', ins('Ans')],
];

const MEM = [
  { id: 'mc', label: 'MC', act: cmd('mc'), aria: 'Memory clear' },
  { id: 'mr', label: 'MR', act: cmd('mr'), aria: 'Memory recall' },
  { id: 'mplus', label: 'M+', act: cmd('mplus'), aria: 'Memory add' },
  { id: 'mminus', label: 'M−', act: cmd('mminus'), aria: 'Memory subtract' },
  { id: 'fx', label: 'fx', act: cmd('sci'), aria: 'Scientific panel' },
];

const KEY_INDEX = new Map();
let secondOn = false;

function keyButton(def, kind) {
  const b = h('button.key', { type: 'button', 'aria-label': def.aria || null, dataset: { id: def.id, kind } });
  b.innerHTML = `<span class="lbl">${def.label}</span>`;
  if (def.alt) b.append(h('span.alt', { 'aria-hidden': 'true' }, def.alt));
  KEY_INDEX.set(def.id, def);
  return b;
}

/** Map an action back to the key id (for flashing keys and the broken-keys game). */
export function idForAction(a) {
  if (a.type === 'cmd') return { ac: 'ac', bksp: 'bksp', eq: 'eq' }[a.cmd] || null;
  const t = a.tok;
  if (/^[0-9]$/.test(t)) return 'd' + t;
  return { '.': 'dot', '+': 'add', '−': 'sub', '×': 'mul', '÷': 'div', '%': 'pct', '()': 'paren', '(': 'paren', ')': 'paren' }[t] || null;
}

export function setSecond(on) {
  secondOn = on;
  for (const row of SCI) {
    const el = document.querySelector(`.key[data-id="${row[0]}"]`);
    if (!el || !row[3]) continue;
    el.innerHTML = `<span class="lbl">${on ? row[3] : row[1]}</span>`;
    KEY_INDEX.get(row[0]).act = on ? row[4] : row[2];
  }
  document.querySelector('.key[data-id="second"]')?.classList.toggle('is-on', on);
}
export const isSecond = () => secondOn;

export function setAngleLabel(angle) {
  const el = document.querySelector('.key[data-id="angle"]');
  if (el) el.innerHTML = `<span class="lbl">${angle.toUpperCase()}</span>`;
}

export function setBroken(ids = []) {
  const set = new Set(ids);
  for (const el of document.querySelectorAll('#keypad .key')) el.classList.toggle('is-broken', set.has(el.dataset.id));
}
export const isBroken = (id) => !!id && document.querySelector(`.key[data-id="${id}"]`)?.classList.contains('is-broken');

export function flash(id) {
  const el = document.querySelector(`.key[data-id="${id}"]`);
  if (!el) return;
  el.classList.add('is-down');
  setTimeout(() => el.classList.remove('is-down'), 90);
}

export function nope(id) {
  const el = document.querySelector(`.key[data-id="${id}"]`);
  if (!el) return;
  el.classList.remove('nope');
  void el.offsetWidth;
  el.classList.add('nope');
}

/**
 * @param {(action:object, meta:{id:string, kind:string, source:string})=>void} onAction
 * @param {{onLongAC:()=>void}} hooks
 */
export function mountKeypad(onAction, hooks = {}) {
  const pad = $('#keypad');
  const sci = $('#sci');
  const mem = $('#memRow');
  pad.append(...MAIN_KEYS.map((k) => keyButton(k, k.kind)));
  const sciInner = h('div');
  sciInner.append(...SCI.map(([id, label, act]) => keyButton({ id, label, act, alt: null }, 'fn')));
  sci.append(sciInner);
  mem.append(...MEM.map((k) => keyButton(k, 'mem')));

  let holdTimer = 0, repeatTimer = 0, longFired = false;
  const stopHold = (el) => {
    clearTimeout(holdTimer); clearInterval(repeatTimer);
    el?.classList.remove('is-down', 'is-holding');
  };
  const fire = (el, source) => {
    const def = KEY_INDEX.get(el.dataset.id);
    if (def) onAction(def.act, { id: def.id, kind: el.dataset.kind, source });
  };

  for (const root of [pad, sci, mem]) {
    root.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.key');
      if (!el || e.button > 0) return;
      e.preventDefault(); // keep focus where it is, no text selection, instant response
      el.classList.add('is-down');
      longFired = false;
      fire(el, 'pointer');
      const id = el.dataset.id;
      if (id === 'ac') {
        el.classList.add('is-holding');
        holdTimer = setTimeout(() => { longFired = true; el.classList.remove('is-holding'); hooks.onLongAC?.(); }, 650);
      } else if (id === 'bksp') {
        holdTimer = setTimeout(() => { repeatTimer = setInterval(() => fire(el, 'repeat'), 55); }, 380);
      }
      const up = () => { stopHold(el); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    });
    // Keyboard activation of a focused key (Enter/Space) arrives as a click with detail 0.
    root.addEventListener('click', (e) => {
      const el = e.target.closest('.key');
      if (el && e.detail === 0) { flash(el.dataset.id); fire(el, 'key'); }
    });
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  return { longFired: () => longFired };
}

/** Physical keyboard → action. Returns null if the key isn't ours. */
export function keyboardAction(e) {
  const k = e.key;
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (/^[0-9]$/.test(k)) return ins(k);
  const map = {
    '.': ins('.'), ',': ins('.'), '+': ins('+'), '-': ins('−'), '*': ins('×'), x: ins('×'), X: ins('×'), '/': ins('÷'), ':': ins('÷'),
    '%': ins('%'), '^': ins('^'), '!': ins('!'), '(': ins('('), ')': ins(')'), p: ins('π'), e: ins('e'), E: ins('E'),
    s: ins('sin('), c: ins('cos('), t: ins('tan('), l: ins('ln('), g: ins('log('), r: ins('√('), a: ins('Ans'),
    Enter: cmd('eq'), '=': cmd('eq'), Backspace: cmd('bksp'), Delete: cmd('ac'), Escape: cmd('ac'),
    ArrowLeft: cmd('left'), ArrowRight: cmd('right'), Home: cmd('home'), End: cmd('end'),
    d: cmd('angle'), h: cmd('history'), f: cmd('sci'), '?': cmd('palette'),
  };
  return map[k] || null;
}
