import { h } from '../dom.js';
import { gameHead, floatScore } from './index.js';
import { make24Puzzle, check24 } from './logic.js';
import { literals } from '../../engine/index.js';
import { initialCalc, insert, backspace, clear } from '../../core/calculator.js';

export function make24(stage, ctx) {
  let puzzle, calc, streak = 0, solved = 0, locked = false, dead = false;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); };
  const streakEl = h('b', {}, '0');
  const chips = h('div.n-chips');
  const qEl = h('div.game-q');
  const inEl = h('div.game-in');
  const msg = h('div.game-msg');
  const skipBtn = h('button.pill-btn.ghost', { onclick: () => skip() }, 'Skip & show');
  stage.append(gameHead('Make 24', ctx, h('span', {}, 'Streak ', streakEl)), qEl, chips, inEl, msg, h('div.btn-row', {}, skipBtn));
  ctx.setBroken(['dot', 'pct']);

  function used() {
    try { return literals(calc.expr); } catch { return (calc.expr.match(/\d+/g) || []).map(Number); }
  }
  function drawChips() {
    const pool = [...used()];
    chips.replaceChildren(...puzzle.nums.map((n) => {
      const k = pool.indexOf(n);
      const isUsed = k >= 0;
      if (isUsed) pool.splice(k, 1);
      return h('button', { class: isUsed ? 'used' : '', onclick: () => api.action({ type: 'ins', tok: String(n) }), 'aria-label': `Use ${n}` }, n);
    }));
  }
  function draw() {
    inEl.textContent = calc.expr || ' ';
    streakEl.textContent = streak;
    drawChips();
  }
  function next() {
    puzzle = make24Puzzle();
    calc = initialCalc();
    locked = false;
    qEl.replaceChildren('24', h('small', {}, 'use every number once'));
    msg.textContent = '';
    draw();
  }
  function skip() {
    if (locked) return;
    locked = true;
    streak = 0;
    msg.textContent = `One way: ${puzzle.solution}`;
    ctx.buzz('op');
    later(next, 2200);
  }
  function submit() {
    const r = check24(calc.expr, puzzle.nums);
    if (r.ok) {
      locked = true;
      streak++; solved++;
      ctx.setBest('make24', streak);
      floatScore(stage, '24!');
      ctx.burst({ count: 70 }); ctx.buzz('win'); ctx.play('win');
      msg.textContent = streak > 1 ? `${streak} in a row` : 'Nice.';
      later(next, 900);
    } else {
      ctx.buzz('error'); ctx.play('error'); ctx.shake?.(stage);
      msg.textContent = r.reason;
    }
  }

  next();
  const api = {
    action(a) {
      if (locked) return true;
      if (a.type === 'cmd') {
        if (a.cmd === 'eq') submit();
        else if (a.cmd === 'bksp') calc = backspace(calc);
        else if (a.cmd === 'ac') calc = clear(calc);
        else return true;
      } else if (/^[0-9]$|^[+−×÷()]$|^\(\)$/.test(a.tok)) {
        calc = insert(calc, a.tok);
        msg.textContent = '';
      } else { ctx.nope(a); return true; }
      draw();
      return true;
    },
    destroy() { dead = true; timers.forEach(clearTimeout); timers.clear(); ctx.setBroken([]); },
  };
  return api;
}
