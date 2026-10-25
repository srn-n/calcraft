// Games hub: menu + active game. Games receive the same actions as the calculator keypad.
import { h } from '../dom.js';
import { load, save } from '../../core/storage.js';
import { sprint } from './sprint.js';
import { make24 } from './make24.js';
import { broken } from './broken.js';
import { estimate } from './estimate.js';

export const GAMES = [
  { id: 'sprint', icon: '⚡', name: 'Sprint', desc: '60 seconds of mental maths. Streaks multiply your score.', make: sprint, bestLabel: (b) => `Best ${b || 0}` },
  { id: 'make24', icon: '24', name: 'Make 24', desc: 'Four numbers, each once, + − × ÷. Reach exactly 24.', make: make24, bestLabel: (b) => `Best streak ${b || 0}` },
  { id: 'broken', icon: '✕', name: 'Broken Keys', desc: 'Some keys are dead. Hit the target with what still works.', make: broken, bestLabel: (b) => `Level ${b || 1}` },
  { id: 'estimate', icon: '≈', name: 'Estimate', desc: 'No time to calculate. Guess close, score big.', make: estimate, bestLabel: (b) => `Best ${b || 0}/1000` },
];

export function createGames(host, fx) {
  const bests = load('bests', {});
  let active = null;

  const ctx = {
    ...fx,
    best: (id) => bests[id],
    setBest(id, v, higherIsBetter = true) {
      const old = bests[id];
      if (old == null || (higherIsBetter ? v > old : v < old)) {
        bests[id] = v;
        save('bests', bests);
        return true;
      }
      return false;
    },
    exit: () => showMenu(),
  };

  function showMenu() {
    active?.destroy?.();
    active = null;
    fx.setBroken([]);
    host.replaceChildren(h('div.game-menu', {}, GAMES.map((g) =>
      h('button.game-card', { onclick: () => start(g.id) },
        h('span.g-icon', { 'aria-hidden': 'true' }, g.icon), h('h3', {}, g.name), h('p', {}, g.desc),
        h('span.best', {}, g.bestLabel(bests[g.id]))))));
  }

  function start(id) {
    const g = GAMES.find((x) => x.id === id);
    active?.destroy?.();
    const stage = h('div.game');
    host.replaceChildren(stage);
    active = g.make(stage, ctx);
    fx.buzz('op');
  }

  showMenu();
  return {
    action: (a, meta) => (active ? active.action(a, meta) : false),
    isPlaying: () => !!active,
    start,
    menu: showMenu,
    leave() { if (active) showMenu(); },
  };
}

/** Shared header: title, stat slots, quit button. */
export function gameHead(title, ctx, ...stats) {
  return h('div.game-head', {}, h('span', {}, title), h('span.spacer'), ...stats,
    h('button.text-btn', { onclick: () => ctx.exit(), 'aria-label': 'Quit game' }, 'Quit'));
}

export function floatScore(stage, text, top = '40%') {
  const el = h('div.float-score', { style: { top } }, text);
  stage.append(el);
  setTimeout(() => el.remove(), 850);
}
