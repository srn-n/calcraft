// Games hub: menu → intro card (rules + Start) → active game.
// Games receive the same actions as the calculator keypad. The keypad is only shown while a
// game is actually running, so the menu and the intro get the whole screen.
import { h } from '../dom.js';
import { load, save } from '../../core/storage.js';
import { cleanBests } from '../../core/schema.js';
import { sprint } from './sprint.js';
import { make24 } from './make24.js';
import { broken } from './broken.js';
import { estimate } from './estimate.js';

export const GAMES = [
  { id: 'sprint', icon: '⚡', name: 'Sprint', desc: '60 seconds of mental maths. Streaks multiply your score.', make: sprint, bestLabel: (b) => `Best ${b || 0}`,
    rules: ['60 seconds. Answer as many sums as you can.', 'Type with the keypad. A right answer moves on by itself.', 'Typo? Fix it with ⌫, or press = to skip the sum.', 'Three in a row raises your multiplier, up to ×5.'] },
  { id: 'make24', icon: '24', name: 'Make 24', desc: 'Four numbers, each once, + − × ÷. Reach exactly 24.', make: make24, bestLabel: (b) => `Best streak ${b || 0}`,
    rules: ['Use all four numbers, each exactly once.', 'Only + − × ÷ and brackets.', 'Tap the number tiles or the keypad, then press =.', 'Stuck? “Skip & show” reveals one way.'] },
  { id: 'broken', icon: '✕', name: 'Broken Keys', desc: 'Some keys are dead. Hit the target with what still works.', make: broken, bestLabel: (b) => `Level ${b || 1}`,
    rules: ['Some keys are cracked and won’t work.', 'Build the target number with the keys that still do, then press =.', 'Fewer presses earn more stars. Par is the best known.', '“Show a way” if you’re stuck.'] },
  { id: 'estimate', icon: '≈', name: 'Estimate', desc: 'No time to calculate. Guess close, score big.', make: estimate, bestLabel: (b) => `Best ${b || 0}/1000`,
    rules: ['10 rounds, 8 seconds each.', 'No time to work it out. Type a guess and press =.', 'The closer you are, the more points (up to 100 a round).'] },
];

export function createGames(host, fx) {
  const bests = cleanBests(load('bests', {}));
  let active = null; // running game
  let intro = null;  // game whose intro card is showing

  const setPlaying = (on) => fx.onPlayingChange?.(on);

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

  function stopActive() {
    active?.destroy?.();
    active = null;
    fx.setBroken([]);
  }

  function showMenu() {
    stopActive();
    intro = null;
    setPlaying(false);
    host.replaceChildren(h('div.game-menu', {}, GAMES.map((g) =>
      h('button.game-card', { type: 'button', onclick: () => showIntro(g.id) },
        h('span.g-icon', { 'aria-hidden': 'true' }, g.icon), h('h3', {}, g.name), h('p', {}, g.desc),
        h('span.best', {}, g.bestLabel(bests[g.id]))))));
    host.scrollTop = 0;
  }

  /** Rules + Start, so nothing is timed or judged until the player is ready. */
  function showIntro(id) {
    const g = GAMES.find((x) => x.id === id);
    if (!g) return;
    stopActive();
    intro = g;
    setPlaying(false);
    const startBtn = h('button.pill-btn', { type: 'button', onclick: () => play(g.id) }, 'Start');
    host.replaceChildren(h('div.game.game-intro', {},
      h('div.game-head', {}, h('span', {}, g.name), h('span.spacer'), h('button.text-btn', { type: 'button', onclick: () => showMenu(), 'aria-label': 'Back to games' }, 'Back')),
      h('div.intro-body', {},
        h('span.g-icon', { 'aria-hidden': 'true' }, g.icon),
        h('h3', {}, g.name),
        h('ul.intro-rules', {}, g.rules.map((r) => h('li', {}, r))),
        h('span.best', {}, g.bestLabel(bests[g.id]))),
      h('div.btn-row', {}, startBtn)));
    host.scrollTop = 0;
    startBtn.focus({ preventScroll: true });
    fx.buzz('op');
  }

  function play(id) {
    const g = GAMES.find((x) => x.id === id);
    stopActive();
    intro = null;
    const stage = h('div.game');
    host.replaceChildren(stage);
    setPlaying(true);
    active = g.make(stage, ctx);
    fx.buzz('op');
  }

  showMenu();
  return {
    action(a, meta) {
      if (active) return active.action(a, meta);
      if (intro && a.type === 'cmd' && a.cmd === 'eq') { play(intro.id); return true; } // = / Enter starts
      if (intro && a.type === 'cmd' && a.cmd === 'ac') { showMenu(); return true; }   // Esc goes back
      return false;
    },
    isPlaying: () => !!active,
    /** True when the games view wants keypad/keyboard input (a game or its intro is open). */
    wantsKeys: () => !!active || !!intro,
    start: showIntro, // palette "Play X" opens the intro card
    menu: showMenu,
    leave() { if (active || intro) showMenu(); },
  };
}

/** Shared header: title, stat slots, quit button. */
export function gameHead(title, ctx, ...stats) {
  return h('div.game-head', {}, h('span', {}, title), h('span.spacer'), ...stats,
    h('button.text-btn', { type: 'button', onclick: () => ctx.exit(), 'aria-label': 'Quit game' }, 'Quit'));
}

export function floatScore(stage, text, top = '40%') {
  const el = h('div.float-score', { style: { top } }, text);
  stage.append(el);
  setTimeout(() => el.remove(), 850);
}
