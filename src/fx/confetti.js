// Pooled canvas confetti. The rAF loop only runs while particles are alive.
const POOL = 160;
let canvas, g, parts = [], running = false, dpr = 1;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function init() {
  canvas = document.getElementById('confetti');
  g = canvas.getContext('2d');
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
  };
  size();
  addEventListener('resize', size, { passive: true });
  for (let i = 0; i < POOL; i++) parts.push({ alive: false });
}

export function burst({ x = innerWidth / 2, y = innerHeight / 3, count = 80, colors, glyph } = {}) {
  if (reduced()) return;
  if (!canvas) init();
  const cs = getComputedStyle(document.documentElement);
  const palette = colors || [cs.getPropertyValue('--accent'), cs.getPropertyValue('--key-op'), cs.getPropertyValue('--text'), cs.getPropertyValue('--key-eq')].map((c) => c.trim() || '#ffcc00');
  let n = 0;
  for (const p of parts) {
    if (p.alive) continue;
    if (n++ >= count) break;
    const a = Math.random() * Math.PI * 2;
    const s = 4 + Math.random() * 9;
    Object.assign(p, {
      alive: true, x: x * dpr, y: y * dpr, vx: Math.cos(a) * s * dpr, vy: (Math.sin(a) * s - 6) * dpr,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4, w: (5 + Math.random() * 6) * dpr, h: (3 + Math.random() * 4) * dpr,
      c: palette[n % palette.length], life: 1, glyph,
    });
  }
  if (!running) { running = true; requestAnimationFrame(tick); }
}

function tick() {
  g.clearRect(0, 0, canvas.width, canvas.height);
  let alive = 0;
  for (const p of parts) {
    if (!p.alive) continue;
    p.vy += 0.32 * dpr; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.009;
    if (p.life <= 0 || p.y > canvas.height + 40) { p.alive = false; continue; }
    alive++;
    g.save();
    g.globalAlpha = Math.min(1, p.life * 2);
    g.translate(p.x, p.y); g.rotate(p.r);
    g.fillStyle = p.c;
    if (p.glyph) { g.font = `${14 * dpr}px system-ui`; g.fillText(p.glyph, 0, 0); }
    else g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    g.restore();
  }
  if (alive) requestAnimationFrame(tick);
  else { running = false; g.clearRect(0, 0, canvas.width, canvas.height); }
}
