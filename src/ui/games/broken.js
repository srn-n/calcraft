import { h } from '../dom.js';
import { gameHead } from './index.js';
import { brokenPuzzle, checkBroken } from './logic.js';
import { idForAction } from '../keypad.js';
import { initialCalc, insert, backspace, clear } from '../../core/calculator.js';

const DIGIT_IDS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9'];
const OP_IDS = { '+': 'add', '−': 'sub', '×': 'mul', '÷': 'div' };

export function broken(stage, ctx) {
  let level = ctx.best('broken') || 1, puzzle, calc, presses = 0, done = false;
  const levelEl = h('b');
  const qEl = h('div.game-q');
  const inEl = h('div.game-in');
  const msg = h('div.game-msg');
  const pressEl = h('span');
  const giveUp = h('button.pill-btn.ghost', { onclick: () => reveal() }, 'Show a way');
  stage.append(gameHead('Broken Keys', ctx, h('span', {}, 'Lvl ', levelEl)), qEl, inEl, h('div.game-head', {}, pressEl, h('span.spacer'), msg), h('div.btn-row', {}, giveUp));

  function setup() {
    puzzle = brokenPuzzle(level);
    calc = initialCalc();
    presses = 0; done = false;
    const dead = DIGIT_IDS.filter((id) => !puzzle.working.includes(id[1]))
      .concat(Object.entries(OP_IDS).filter(([op]) => !puzzle.ops.includes(op)).map(([, id]) => id), ['pct', 'dot']);
    ctx.setBroken(dead);
    qEl.replaceChildren(String(puzzle.target), h('small', {}, `make this number · par ${puzzle.par} presses`));
    msg.textContent = '';
    draw();
  }
  function draw() {
    inEl.textContent = calc.expr || ' ';
    levelEl.textContent = level;
    pressEl.textContent = `${presses} press${presses === 1 ? '' : 'es'}`;
  }
  function reveal() {
    if (done) return;
    calc = { ...initialCalc(), expr: puzzle.example, caret: puzzle.example.length };
    msg.textContent = 'One way. Press = for a new one.';
    done = 'revealed';
    draw();
  }
  function submit() {
    if (done) { if (done === 'won') level++; setup(); return; }
    const r = checkBroken(calc.expr, puzzle, presses);
    if (!r.ok) { msg.textContent = r.reason; ctx.buzz('error'); ctx.play('error'); ctx.shake?.(stage); return; }
    done = 'won';
    ctx.setBest('broken', level + 1);
    qEl.replaceChildren(h('span.stars', {}, '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars)), h('small', {}, `${r.presses} presses · par ${puzzle.par} · = next level`));
    ctx.burst({ count: 30 + r.stars * 30 }); ctx.buzz('win'); ctx.play('win');
    ctx.setBroken([]);
  }

  setup();
  return {
    action(a) {
      const id = idForAction(a);
      if (a.type === 'cmd' && a.cmd === 'eq') { submit(); return true; }
      if (done) return true;
      if (ctx.isBroken(id)) { ctx.nope(a); ctx.buzz('error'); return true; }
      presses++;
      if (a.type === 'cmd') {
        if (a.cmd === 'bksp') calc = backspace(calc);
        else if (a.cmd === 'ac') calc = clear(calc);
      } else if (/^[0-9]$|^[+−×÷]$|^\(\)$|^[()]$/.test(a.tok)) calc = insert(calc, a.tok);
      else { presses--; ctx.nope(a); }
      msg.textContent = '';
      draw();
      return true;
    },
    destroy() { ctx.setBroken([]); },
  };
}
