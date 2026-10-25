// Display: syntax-coloured expression with a caret, ghost brackets, live preview, rolling result.
import { $ } from './dom.js';
import { openBrackets, formatNumber } from '../engine/index.js';

const CLASS = (c, prev) => {
  if (/[0-9.]/.test(c)) return 't-num';
  if (c === 'E' && /[0-9.]/.test(prev || '')) return 't-num';
  if ('+−×÷^%!²³'.includes(c)) return 't-op';
  if (c === '(' || c === ')') return 't-paren';
  if (c === 'π' || c === 'e') return 't-const';
  return 't-fn';
};
const escapeChar = (c) => (c === '<' ? '&lt;' : c === '&' ? '&amp;' : c);

/** Indices before which a thousands separator is drawn (integer digit runs only). */
function separatorSlots(expr) {
  const slots = new Set();
  const re = /\d+/g;
  let m;
  while ((m = re.exec(expr))) {
    const start = m.index;
    if (expr[start - 1] === '.' || expr[start - 1] === 'E' || (expr[start - 1] === '−' && expr[start - 2] === 'E')) continue;
    const len = m[0].length;
    for (let k = len - 3; k > 0; k -= 3) slots.add(start + k);
  }
  return slots;
}

export function createDisplay({ onCaret, onCopy, onSwipe }) {
  const root = $('#display');
  const exprEl = $('#expr');
  const resEl = $('#result');
  const ghost = root.querySelector('.lcd-ghost');
  let lastRolled = '';

  function render(calc, { preview, group, error }) {
    const evaluated = calc.evaluated;
    root.classList.toggle('is-evaluated', evaluated);
    root.classList.toggle('has-error', !!error);

    // expression line
    const src = evaluated ? calc.prevExpr : calc.expr;
    const slots = group ? separatorSlots(src) : new Set();
    let html = '';
    for (let i = 0; i < src.length; i++) {
      if (!evaluated && i === calc.caret) html += '<span class="caret"></span>';
      if (slots.has(i)) html += '<span class="t-sep t-num">,</span>';
      const c = src[i];
      html += `<span class="${CLASS(c, src[i - 1])}" data-i="${i}">${escapeChar(c)}</span>`;
    }
    if (!evaluated && calc.caret >= src.length) html += '<span class="caret"></span>';
    const ghosts = openBrackets(src);
    if (ghosts) html += `<span class="t-ghost">${')'.repeat(ghosts)}</span>`;
    if (evaluated) html += '<span class="t-op"> =</span>';
    if (!src && !evaluated) html = '<span class="caret"></span><span class="t-ghost">0</span>';
    exprEl.innerHTML = html;
    const shown = src.length + ghosts;
    exprEl.style.setProperty('--fit', evaluated ? 1 : Math.max(0.42, Math.min(1, 11 / Math.max(1, shown))).toFixed(3));
    if (!evaluated && calc.caret >= src.length) exprEl.scrollLeft = exprEl.scrollWidth;
    else {
      const c = exprEl.querySelector('.caret');
      if (c) {
        const x = c.offsetLeft; // .expr is position:relative
        if (x < exprEl.scrollLeft + 12) exprEl.scrollLeft = x - 24;
        else if (x > exprEl.scrollLeft + exprEl.clientWidth - 12) exprEl.scrollLeft = x - exprEl.clientWidth + 24;
      }
    }

    // result line
    if (error) {
      resEl.textContent = error;
      resEl.style.setProperty('--fit', 1);
    } else if (evaluated) {
      const txt = formatNumber(calc.ans, { group });
      resEl.style.setProperty('--fit', Math.max(0.4, Math.min(1, 10 / txt.length)).toFixed(3));
      const key = calc.prevExpr + '=' + txt;
      if (key !== lastRolled) {
        lastRolled = key;
        resEl.innerHTML = [...txt].map((c, i) => `<span class="roll" style="--i:${i}">${c}</span>`).join('');
      }
      if (ghost) ghost.textContent = '8'.repeat(Math.min(12, Math.max(10, txt.length)));
    } else {
      lastRolled = '';
      resEl.textContent = preview == null ? '' : '= ' + formatNumber(preview, { group });
      resEl.style.setProperty('--fit', 1);
    }
    resEl.setAttribute('aria-label', evaluated ? `Result ${resEl.textContent}. Tap to copy.` : preview != null ? `Preview ${resEl.textContent}` : 'Result');
  }

  // Tap a character to move the caret; swipe the display for gestures.
  let sx = 0, sy = 0, st = 0, tracking = false;
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    tracking = true; sx = e.clientX; sy = e.clientY; st = performance.now();
  });
  root.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    const fast = performance.now() - st < 600;
    if (fast && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) return onSwipe(dx < 0 ? 'left' : 'right');
    if (fast && Math.abs(dy) > 46 && Math.abs(dy) > Math.abs(dx) * 1.3) return onSwipe(dy > 0 ? 'down' : 'up');
    // a tap
    const span = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-i]');
    if (span && exprEl.contains(span)) {
      const r = span.getBoundingClientRect();
      onCaret(Number(span.dataset.i) + (e.clientX > r.left + r.width / 2 ? 1 : 0));
    } else if (exprEl.contains(e.target) || e.target === exprEl) onCaret(Infinity);
  });
  root.addEventListener('pointercancel', () => { tracking = false; });
  resEl.addEventListener('click', onCopy);

  return {
    render,
    shake() { root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake'); },
    pulse() { root.classList.remove('pulse'); void root.offsetWidth; root.classList.add('pulse'); },
  };
}
