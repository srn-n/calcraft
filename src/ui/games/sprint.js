import { h } from '../dom.js';
import { gameHead, floatScore } from './index.js';
import { sprintQuestion } from './logic.js';

const DURATION = 60;

export function sprint(stage, ctx) {
  let score = 0, streak = 0, correct = 0, wrong = 0, input = '', q, t0 = 0, raf = 0, over = false, started = false;
  const scoreEl = h('b', {}, '0');
  const comboEl = h('span.combo');
  const bar = h('div.timebar', {}, h('i'));
  const qEl = h('div.game-q');
  const inEl = h('div.game-in');
  const msg = h('div.game-msg', {}, 'Type the answer — it checks itself.');
  stage.append(gameHead('Sprint', ctx, comboEl, h('span', {}, 'Score ', scoreEl)), bar, qEl, inEl, msg);

  const mult = () => Math.min(5, 1 + Math.floor(streak / 3));
  const next = () => { q = sprintQuestion(Math.floor(correct / 4)); qEl.textContent = q.q + ' = ?'; input = ''; draw(); };
  const draw = () => {
    inEl.textContent = input || ' ';
    scoreEl.textContent = score;
    comboEl.textContent = mult() > 1 ? `×${mult()} combo` : '';
  };
  let dead = false;
  const tick = () => {
    if (dead) return;
    const left = Math.max(0, DURATION - (performance.now() - t0) / 1000);
    bar.style.setProperty('--t', (left / DURATION).toFixed(4));
    if (left <= 0) return end();
    raf = requestAnimationFrame(tick);
  };
  const begin = () => { started = true; t0 = performance.now(); raf = requestAnimationFrame(tick); msg.textContent = ''; };

  function check(final) {
    if (input === '' || input === '−') return;
    const v = Number(input.replace('−', '-'));
    if (v === q.answer) {
      streak++; correct++;
      const pts = 10 * mult();
      score += pts;
      floatScore(stage, '+' + pts);
      ctx.buzz('op'); ctx.play('eq');
      inEl.classList.add('good');
      setTimeout(() => inEl.classList.remove('good'), 150);
      if (streak > 0 && streak % 9 === 0) ctx.burst({ count: 40 });
      next();
    } else if (final || input.replace('−', '').length >= String(Math.abs(q.answer)).length) {
      streak = 0; wrong++;
      ctx.buzz('error'); ctx.play('error'); ctx.shake?.(stage);
      msg.textContent = `${q.q} = ${q.answer}`;
      next();
    }
  }

  function end() {
    over = true;
    cancelAnimationFrame(raf);
    const record = ctx.setBest('sprint', score);
    if (record && score > 0) ctx.burst({ count: 120 });
    ctx.play('win');
    const acc = correct + wrong ? Math.round((correct / (correct + wrong)) * 100) : 0;
    stage.replaceChildren(gameHead('Sprint', ctx), h('div.game-over', { style: { flex: 1 } },
      h('div.out-label', {}, record ? 'New best!' : 'Time'), h('div.big-out', {}, score),
      h('div.stat-grid', { style: { width: '100%' } },
        h('div.stat', {}, h('small', {}, 'Correct'), h('b', {}, correct)), h('div.stat', {}, h('small', {}, 'Accuracy'), h('b', {}, acc + '%')),
        h('div.stat', {}, h('small', {}, 'Best'), h('b', {}, ctx.best('sprint')))),
      h('div.btn-row', {}, h('button.pill-btn', { onclick: () => restart() }, 'Again (=)'), h('button.pill-btn.ghost', { onclick: () => ctx.exit() }, 'Menu'))));
  }
  function restart() {
    stage.replaceChildren();
    const fresh = sprint(stage, ctx);
    api.action = fresh.action; api.destroy = fresh.destroy;
  }

  next();
  const api = {
    action(a) {
      if (over) { if (a.type === 'cmd' && a.cmd === 'eq') restart(); return true; }
      if (a.type === 'ins' && /^[0-9]$/.test(a.tok)) { if (!started) begin(); if (input.length < 7) input += a.tok; draw(); check(false); return true; }
      if (a.type === 'ins' && a.tok === '−' && !input) { input = '−'; draw(); return true; }
      if (a.type === 'cmd' && a.cmd === 'bksp') { input = input.slice(0, -1); draw(); return true; }
      if (a.type === 'cmd' && a.cmd === 'ac') { input = ''; draw(); return true; }
      if (a.type === 'cmd' && a.cmd === 'eq') { if (!started) begin(); else check(true); return true; }
      ctx.nope(a); return true;
    },
    destroy() { dead = true; cancelAnimationFrame(raf); },
  };
  return api;
}
