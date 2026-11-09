// The Exclusive characters come alive: they react to what you type, celebrate a result, wince at an
// error, greet you when you pick their theme, and do their own thing when you leave them alone.
//
// The character is drawn by CSS on the = key and the header (::before, see themes.css). Moves are
// Web Animations on those pseudo-elements, and the effects are a few small, short-lived elements in
// one fixed layer. Everything animates transform/opacity only, and nothing runs at all with
// reduced motion or on the classic themes.
import { reducedMotion } from './dom.js';

const SVG = (body, vb = 24) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">${body}</svg>`)}")`;
const STAR = (c) => SVG(`<path d="M12 1.5l3 7.2 7.8.6-6 5 1.9 7.6L12 17.8 5.3 21.9l1.9-7.6-6-5 7.8-.6z" fill="${c}"/>`);
const SPARK = (c) => SVG(`<path d="M12 0c1 8 4 11 12 12-8 1-11 4-12 12-1-8-4-11-12-12 8-1 11-4 12-12z" fill="${c}"/>`);
const HEART = (c) => SVG(`<path d="M12 21S2 14.5 2 8.2C2 4.6 6.4 2.6 9.2 5.4L12 8.2l2.8-2.8C17.6 2.6 22 4.6 22 8.2 22 14.5 12 21 12 21z" fill="${c}"/>`);
const PAW = (c) => SVG(`<ellipse cx="12" cy="15.5" rx="5.5" ry="4.6" fill="${c}"/><circle cx="5" cy="9.5" r="2.4" fill="${c}"/><circle cx="9.5" cy="5.5" r="2.4" fill="${c}"/><circle cx="14.5" cy="5.5" r="2.4" fill="${c}"/><circle cx="19" cy="9.5" r="2.4" fill="${c}"/>`);
const WEB = (c) => SVG(`<g fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round"><path d="M24 2L0 26M24 2v24M24 2H0M24 2L8 26M24 2L0 12"/><path d="M18 2q.5 5 6 6M12 2q1.5 9 12 12M6 2q2.5 14 18 18"/></g>`, 26);
const DOT = (c) => SVG(`<circle cx="12" cy="12" r="6" fill="${c}"/>`);

// Each character's personality. Keyframes animate `transform` on the character itself.
export const CAST = {
  astro: {
    colors: ['#ffd34d', '#7fd4ff', '#ffffff'],
    eq: [{ transform: 'none' }, { transform: 'translateY(6%) scale(1.08,.9)', offset: 0.15 }, { transform: 'translateY(-48%) rotate(-10deg)', offset: 0.5 }, { transform: 'translateY(4%) scale(1.06,.94)', offset: 0.82 }, { transform: 'none' }],
    eqMs: 760,
    ac: [{ transform: 'none' }, { transform: 'rotate(360deg) scale(.85)' }],
    burst: 'stars',
    idle: 'float', idleFx: 'twinkle',
  },
  ronin: {
    colors: ['#ff2e63', '#3cf2ff', '#ffcc33'],
    eq: [{ transform: 'none' }, { transform: 'translateX(-10%) rotate(-6deg)', offset: 0.2 }, { transform: 'translateX(26%) rotate(10deg) scale(1.08)', offset: 0.45 }, { transform: 'translateX(-4%)', offset: 0.75 }, { transform: 'none' }],
    eqMs: 520,
    ac: [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-30%) scale(.6)', opacity: 0, offset: 0.4 }, { transform: 'translateY(10%)', opacity: 0, offset: 0.55 }, { transform: 'none', opacity: 1 }],
    burst: 'slash',
    idle: 'breathe', idleFx: 'z',
  },
  weaver: {
    colors: ['#2ee6c5', '#ffb020', '#dff7f5'],
    eq: [{ transform: 'none' }, { transform: 'rotate(-26deg)', offset: 0.25 }, { transform: 'rotate(18deg)', offset: 0.5 }, { transform: 'rotate(-8deg)', offset: 0.75 }, { transform: 'none' }],
    eqMs: 900, eqOrigin: '50% -60%',
    ac: [{ transform: 'none' }, { transform: 'translateY(-70%) scale(.8)', offset: 0.35 }, { transform: 'translateY(8%)', offset: 0.7 }, { transform: 'none' }],
    burst: 'web',
    idle: 'hang', idleFx: null,
  },
  pinkpop: {
    colors: ['#ff4f9a', '#ff8cc0', '#ffd34d', '#ffffff'],
    eq: [{ transform: 'none' }, { transform: 'scale(.9)', offset: 0.12 }, { transform: 'translateY(-26%) rotate(200deg) scale(1.15)', offset: 0.55 }, { transform: 'rotate(360deg)' }],
    eqMs: 720,
    ac: [{ transform: 'none' }, { transform: 'scale(1.18) rotate(-8deg)', offset: 0.4 }, { transform: 'none' }],
    burst: 'hearts',
    idle: 'dance', idleFx: 'notes',
  },
  kitten: {
    colors: ['#f29fb0', '#ffb38a', '#c08a6b'],
    eq: [{ transform: 'none' }, { transform: 'scale(1.18,.78) translateY(10%)', offset: 0.2 }, { transform: 'scale(.9,1.16) translateY(-30%)', offset: 0.5 }, { transform: 'scale(1.06,.94)', offset: 0.8 }, { transform: 'none' }],
    eqMs: 680,
    ac: [{ transform: 'none' }, { transform: 'scale(1.1,.55) translateY(30%)', offset: 0.35 }, { transform: 'scale(1.1,.55) translateY(30%)', offset: 0.6 }, { transform: 'none' }],
    burst: 'paws',
    idle: 'sleep', idleFx: 'z',
  },
};

const SHAKE = [{ transform: 'none' }, { transform: 'rotate(-14deg)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(-8deg)' }, { transform: 'rotate(5deg)' }, { transform: 'none' }];
const NOD = [{ transform: 'none' }, { transform: 'translateY(-9%) scale(1.07)' }, { transform: 'none' }];
const LEAN = [{ transform: 'none' }, { transform: 'rotate(-9deg) translateX(-4%)' }, { transform: 'none' }];
const ARRIVE = [{ transform: 'translateY(60%) scale(0)', opacity: 0 }, { transform: 'translateY(-14%) scale(1.15) rotate(-8deg)', opacity: 1, offset: 0.6 }, { transform: 'scale(.95) rotate(4deg)', offset: 0.8 }, { transform: 'none', opacity: 1 }];

const IDLE_MS = 12000;
let layer = null;
let live = 0;
let idleTimer = 0, idleFxTimer = 0, lastNod = 0;
let getView = () => 'calc';

const themeId = () => document.documentElement.dataset.theme;
const cast = () => (document.documentElement.hasAttribute('data-exclusive') ? CAST[themeId()] : null);
const active = () => !!cast() && !reducedMotion() && document.visibilityState === 'visible';

/** The characters currently on screen: the one on = and (on taller screens) the one in the header. */
function hosts() {
  const out = [];
  const eq = document.querySelector('#keypad .key[data-id="eq"]:not(.is-broken)');
  if (eq?.offsetWidth) out.push(eq);
  const brand = document.querySelector('.brand');
  if (brand?.offsetWidth) out.push(brand);
  return out;
}

function move(frames, ms, origin) {
  for (const el of hosts()) {
    try {
      el.animate(origin ? frames.map((f) => ({ ...f, transformOrigin: origin })) : frames,
        { duration: ms, easing: 'cubic-bezier(.3,.7,.3,1)', pseudoElement: '::before' });
    } catch { /* pseudo-element animation not supported: the effects still play */ }
  }
}

/** Centre of the character on the = key (it sits in the left part of the key, see themes.css). */
function charPoint() {
  const eq = document.querySelector('#keypad .key[data-id="eq"]');
  const r = eq?.getBoundingClientRect();
  if (!r || !r.width) return null;
  return { x: r.left + r.width * 0.06 + r.height * 0.41, y: r.top + r.height * 0.5, r };
}

function ensureLayer() {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.className = 'buddy-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.append(layer);
  }
  return layer;
}

/** One short-lived particle. `frames` move it relative to (x, y); it removes itself when done. */
function spawn({ x, y, size = 16, img, text, color, frames, ms = 800, delay = 0, easing = 'cubic-bezier(.2,.7,.3,1)', w, h, origin }) {
  if (live > 40) return;
  const el = document.createElement('span');
  el.className = 'buddy-fx';
  const s = el.style;
  s.left = `${x - (w ?? size) / 2}px`; s.top = `${y - (h ?? size) / 2}px`;
  s.width = `${w ?? size}px`; s.height = `${h ?? size}px`;
  if (img) s.backgroundImage = img;
  if (text) { el.textContent = text; s.color = color; s.fontSize = `${size}px`; }
  if (origin) s.transformOrigin = origin;
  ensureLayer().append(el);
  live++;
  const anim = el.animate(frames, { duration: ms, delay, easing, fill: 'both' });
  const done = () => { el.remove(); live--; };
  anim.finished.then(done, done);
}

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Celebrations on = (and game wins) ──
const BURSTS = {
  stars(c, p, d) {
    for (let i = 0; i < 7; i++) {
      const ang = rnd(-2.6, -0.6), dist = rnd(70, 150);
      spawn({ x: p.x, y: p.y, size: rnd(10, 18), img: STAR(pick(c.colors)), delay: i * 25, ms: rnd(700, 950),
        frames: [{ transform: 'translate(0,0) scale(.2) rotate(0deg)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(1) rotate(${rnd(90, 240)}deg)`, opacity: 1, offset: 0.7 }, { transform: `translate(${Math.cos(ang) * dist * 1.1}px,${Math.sin(ang) * dist * 1.1 + 12}px) scale(.6)`, opacity: 0 }] });
    }
    if (d) { // a shooting star across the display
      const y = d.top + d.height * rnd(0.2, 0.35);
      spawn({ x: d.right, y, w: 90, h: 3, img: 'linear-gradient(90deg, transparent, #fff 70%, #ffd34d)', ms: 700, delay: 120,
        frames: [{ transform: 'translateX(0) rotate(-12deg)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: `translateX(${-d.width - 80}px) translateY(${d.height * 0.25}px) rotate(-12deg)`, opacity: 0 }] });
    }
  },
  slash(c, p, d) {
    if (d) {
      const len = Math.hypot(d.width, d.height) * 1.05;
      spawn({ x: d.left + d.width / 2, y: d.top + d.height / 2, w: len, h: 4, origin: '0% 50%',
        img: 'linear-gradient(90deg, transparent, #fff 45%, #ff2e63 60%, transparent)', ms: 420, easing: 'cubic-bezier(.2,.9,.2,1)',
        frames: [{ transform: `rotate(-16deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(-16deg) scaleX(1)`, opacity: 1, offset: 0.45 }, { transform: `rotate(-16deg) scaleX(1) translateY(-2px)`, opacity: 0 }] });
    }
    for (let i = 0; i < 6; i++) {
      const ang = rnd(-2.8, -0.3), dist = rnd(30, 80);
      spawn({ x: p.x + p.r.height * 0.3, y: p.y - p.r.height * 0.2, size: rnd(4, 7), img: DOT(pick(c.colors)), delay: 60 + i * 15, ms: 500,
        frames: [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px,${Math.sin(ang) * dist}px) scale(.3)`, opacity: 0 }] });
    }
  },
  web(c, p, d) {
    if (!d) return;
    const tx = d.left + d.width * 0.82, ty = d.top + d.height * 0.3;
    const len = Math.hypot(tx - p.x, ty - p.y), ang = Math.atan2(ty - p.y, tx - p.x) * 180 / Math.PI;
    spawn({ x: p.x + len / 2, y: p.y, w: len, h: 2, origin: '0% 50%', img: 'linear-gradient(90deg, #2ee6c5, #dff7f5)', ms: 760,
      frames: [{ transform: `rotate(${ang}deg) scaleX(0)`, opacity: 1 }, { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: 0.25 }, { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 1, offset: 0.6 }, { transform: `rotate(${ang}deg) scaleX(1)`, opacity: 0 }] });
    spawn({ x: tx, y: ty, size: 46, img: WEB('#2ee6c5'), delay: 180, ms: 900,
      frames: [{ transform: 'scale(0) rotate(-40deg)', opacity: 1 }, { transform: 'scale(1.15) rotate(0deg)', opacity: 1, offset: 0.35 }, { transform: 'scale(1)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 0 }] });
  },
  hearts(c, p) {
    for (let i = 0; i < 12; i++) {
      const dx = rnd(-130, 30), dy = rnd(-190, -80), heart = i % 3 !== 2;
      spawn({ x: p.x + rnd(-10, 10), y: p.y - 8, size: heart ? rnd(16, 26) : rnd(12, 16), img: heart ? HEART(pick(c.colors)) : SPARK('#ffd34d'), delay: i * 45, ms: rnd(900, 1200),
        frames: [{ transform: 'translate(0,0) scale(.3)', opacity: 0 }, { transform: `translate(${dx * 0.3}px,${dy * 0.3}px) scale(1.1)`, opacity: 1, offset: 0.2 }, { transform: `translate(${dx}px,${dy}px) scale(.8) rotate(${rnd(-30, 30)}deg)`, opacity: 0 }] });
    }
  },
  paws(c, p, d) {
    if (!d) return;
    // Mochi walks across the display, leaving paw prints
    const y0 = d.bottom - 22, step = Math.min(52, (d.width - 70) / 5);
    for (let i = 0; i < 6; i++) {
      const x = d.left + 26 + i * step, y = y0 - (i % 2) * 16;
      spawn({ x, y, size: 22, img: PAW('#e07a8f'), delay: i * 120, ms: 1100,
        frames: [{ transform: 'scale(.3) rotate(80deg)', opacity: 0 }, { transform: 'scale(1.1) rotate(80deg)', opacity: 1, offset: 0.12 }, { transform: 'scale(1) rotate(80deg)', opacity: 0.95, offset: 0.6 }, { transform: 'scale(1) rotate(80deg)', opacity: 0 }] });
    }
    spawn({ x: p.x, y: p.y - p.r.height * 0.5, size: 22, img: HEART('#e07a8f'), delay: 250, ms: 900,
      frames: [{ transform: 'translateY(0) scale(.3)', opacity: 0 }, { transform: 'translateY(-14px) scale(1.15)', opacity: 1, offset: 0.3 }, { transform: 'translateY(-40px) scale(.9)', opacity: 0 }] });
  },
};

function bubble(text, color) {
  const p = charPoint();
  if (!p) return;
  spawn({ x: p.x + p.r.height * 0.32, y: p.y - p.r.height * 0.55, size: 18, text, color, ms: 900,
    frames: [{ transform: 'translateY(6px) scale(.3)', opacity: 0 }, { transform: 'translateY(-4px) scale(1.15)', opacity: 1, offset: 0.25 }, { transform: 'translateY(-6px) scale(1)', opacity: 1, offset: 0.7 }, { transform: 'translateY(-14px) scale(.9)', opacity: 0 }] });
}

// ── Idle: after a quiet spell the character does its own thing until you touch a key ──
function idleFx() {
  const c = cast();
  if (!c || !active() || getView() !== 'calc') return;
  const p = charPoint();
  if (!p) return;
  if (c.idleFx === 'z') {
    spawn({ x: p.x + p.r.height * 0.3, y: p.y - p.r.height * 0.4, size: rnd(11, 16), text: 'z', color: c.colors[0], ms: 1800,
      frames: [{ transform: 'translate(0,0) scale(.5)', opacity: 0 }, { transform: 'translate(6px,-12px) scale(1)', opacity: 0.9, offset: 0.3 }, { transform: 'translate(18px,-46px) scale(1.2)', opacity: 0 }] });
  } else if (c.idleFx === 'notes') {
    spawn({ x: p.x + rnd(-6, 12), y: p.y - p.r.height * 0.45, size: 15, text: pick(['♪', '♫']), color: pick(c.colors.slice(0, 2)), ms: 1600,
      frames: [{ transform: 'translate(0,0) rotate(-10deg)', opacity: 0 }, { transform: 'translate(-6px,-14px) rotate(8deg)', opacity: 1, offset: 0.3 }, { transform: 'translate(10px,-48px) rotate(-6deg)', opacity: 0 }] });
  } else if (c.idleFx === 'twinkle') {
    spawn({ x: p.x + rnd(-30, 30), y: p.y - p.r.height * rnd(0.5, 0.9), size: rnd(8, 12), img: SPARK(pick(c.colors)), ms: 1200,
      frames: [{ transform: 'scale(0) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(45deg)', opacity: 1, offset: 0.5 }, { transform: 'scale(0) rotate(90deg)', opacity: 0 }] });
  }
}

function setIdle(on) {
  const d = document.documentElement;
  const c = cast();
  clearInterval(idleFxTimer);
  if (on && c && active() && getView() === 'calc') {
    d.dataset.budIdle = c.idle;
    if (c.idleFx) idleFxTimer = setInterval(idleFx, 1700);
  } else {
    delete d.dataset.budIdle;
  }
}

function poke() {
  if (document.documentElement.dataset.budIdle) setIdle(false);
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => setIdle(true), IDLE_MS);
}

/** Hook up once at start-up. `view()` returns the current tab, so the character only idles on Calc. */
export function setupBuddy({ view } = {}) {
  if (view) getView = view;
  addEventListener('pointerdown', poke, { capture: true, passive: true });
  addEventListener('keydown', poke, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState !== 'visible') setIdle(false); else poke(); });
  poke();
}

/** React to an input. kind: num | op | fn | mem | ac | eq | win | error */
export function react(kind) {
  const c = cast();
  if (!c || !active()) return;
  if (kind === 'num' || kind === 'op' || kind === 'fn' || kind === 'mem') {
    const now = performance.now();
    if (now - lastNod < 120) return; // typing fast: a nod per beat, not per key
    lastNod = now;
    move(kind === 'num' ? NOD : LEAN, 240);
    return;
  }
  if (kind === 'ac') { move(c.ac, 560); return; }
  if (kind === 'error') { move(SHAKE, 460); bubble('?', c.colors[0]); return; }
  if (kind === 'eq' || kind === 'win') {
    move(c.eq, c.eqMs, c.eqOrigin);
    const p = charPoint();
    if (!p) return;
    const d = document.getElementById('display')?.getBoundingClientRect();
    BURSTS[c.burst](c, p, d?.width && getView() === 'calc' ? d : null);
  }
}

/** The character pops in when its theme is picked. */
export function arrive() {
  if (!active()) return;
  setIdle(false);
  move(ARRIVE, 720);
  setTimeout(() => {
    const c = cast(), p = charPoint();
    if (!c || !p || !active()) return;
    const d = document.getElementById('display')?.getBoundingClientRect();
    BURSTS[c.burst](c, p, d?.width && getView() === 'calc' && !document.querySelector('dialog[open]') ? d : null);
  }, 560);
  poke();
}
