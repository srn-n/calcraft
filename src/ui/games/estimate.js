import { h } from '../dom.js';
import { gameHead, floatScore } from './index.js';
import { estimateQuestion, estimateScore } from './logic.js';
import { formatNumber } from '../../engine/index.js';

const ROUNDS = 10, SECONDS = 8;

export function estimate(stage, ctx) {
  let round = 0, total = 0, input = '', q, t0 = 0, raf = 0, waiting = false, over = false, dead = false;
  // Every delayed step goes through later() so quitting mid-round cancels it. Before this, a round
  // that ended during the 1.3 s pause kept playing invisibly (sounds, vibration) after you left.
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!dead) fn(); }, ms); timers.add(id); };
  const roundEl = h('b');
  const totalEl = h('b', {}, '0');
  const bar = h('div.timebar', {}, h('i'));
  const qEl = h('div.game-q');
  const inEl = h('div.game-in');
  const msg = h('div.game-msg', {}, 'Guess, then press =. Closer = more points.');
  stage.append(gameHead('Estimate', ctx, h('span', {}, 'Rd ', roundEl), h('span', {}, 'Pts ', totalEl)), bar, qEl, inEl, msg);

  const draw = () => { inEl.textContent = input ? formatNumber(Number(input)) : ' '; roundEl.textContent = `${Math.min(round + 1, ROUNDS)}/${ROUNDS}`; totalEl.textContent = total; };
  const tick = () => {
    const left = Math.max(0, SECONDS - (performance.now() - t0) / 1000);
    bar.style.setProperty('--t', (left / SECONDS).toFixed(4));
    if (dead) return;
    if (left <= 0) return submit();
    raf = requestAnimationFrame(tick);
  };
  function ask() {
    if (dead) return;
    q = estimateQuestion(round);
    qEl.textContent = q.q;
    input = ''; waiting = false;
    draw();
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function submit() {
    if (waiting) return;
    waiting = true;
    cancelAnimationFrame(raf);
    const pts = estimateScore(input ? Number(input) : NaN, q.answer);
    total += pts;
    floatScore(stage, '+' + pts);
    msg.textContent = `${q.q} = ${formatNumber(Math.round(q.answer * 100) / 100)}`;
    ctx.buzz(pts > 70 ? 'win' : pts > 0 ? 'op' : 'error');
    ctx.play(pts > 70 ? 'win' : 'op');
    if (pts >= 95) ctx.burst({ count: 40 });
    draw();
    later(() => { round++; if (round >= ROUNDS) end(); else ask(); }, 1300);
  }
  function end() {
    over = true;
    const record = ctx.setBest('estimate', total);
    if (record) ctx.burst({ count: 120 });
    stage.replaceChildren(gameHead('Estimate', ctx), h('div.game-over', { style: { flex: 1 } },
      h('div.out-label', {}, record ? 'New best!' : 'Final score'), h('div.big-out', {}, `${total}`), h('div.out-label', {}, 'out of 1000'),
      h('div.btn-row', {}, h('button.pill-btn', { onclick: restart }, 'Again (=)'), h('button.pill-btn.ghost', { onclick: () => ctx.exit() }, 'Menu'))));
  }
  function restart() {
    stage.replaceChildren();
    const fresh = estimate(stage, ctx);
    api.action = fresh.action; api.destroy = fresh.destroy;
  }

  ask();
  const api = {
    action(a) {
      if (over) { if (a.type === 'cmd' && a.cmd === 'eq') restart(); return true; }
      if (waiting) return true;
      if (a.type === 'ins' && /^[0-9]$/.test(a.tok)) { if (input.length < 9) input = input === '0' ? a.tok : input + a.tok; draw(); return true; }
      if (a.type === 'ins' && a.tok === '.' && !input.includes('.')) { input = (input || '0') + '.'; draw(); return true; }
      if (a.type === 'cmd' && a.cmd === 'bksp') { input = input.slice(0, -1); draw(); return true; }
      if (a.type === 'cmd' && a.cmd === 'ac') { input = ''; draw(); return true; }
      if (a.type === 'cmd' && a.cmd === 'eq') { submit(); return true; }
      ctx.nope(a); return true;
    },
    destroy() { dead = true; cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); },
  };
  return api;
}
