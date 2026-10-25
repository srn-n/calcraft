// Pure game logic (tested in tests/games.test.js).
import { evaluate, literals, nodeTypes } from '../../engine/index.js';

export const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ---------- Sprint ---------- */
export function sprintQuestion(level) {
  const L = Math.min(level, 8);
  const ops = L < 2 ? ['+', '−'] : L < 4 ? ['+', '−', '×'] : ['+', '−', '×', '÷'];
  const op = pick(ops);
  const hi = 9 + L * 6;
  let a, b;
  switch (op) {
    case '+': a = rand(2, hi); b = rand(2, hi); break;
    case '−': a = rand(5, hi); b = rand(1, a); break;
    case '×': a = rand(2, 4 + L); b = rand(2, 9 + Math.floor(L / 2)); break;
    default: b = rand(2, 4 + L); a = b * rand(2, 9 + Math.floor(L / 2)); break;
  }
  const q = `${a}${op}${b}`;
  return { q, answer: evaluate(q).value };
}

/* ---------- Make 24 ---------- */
const OPS = [
  ['+', (a, b) => a + b], ['−', (a, b) => a - b], ['×', (a, b) => a * b], ['÷', (a, b) => (b === 0 ? NaN : a / b)],
];

/** Returns one solution string or null. */
export function solve24(nums, target = 24) {
  const items = nums.map((n) => ({ v: n, s: String(n) }));
  const rec = (arr) => {
    if (arr.length === 1) return Math.abs(arr[0].v - target) < 1e-9 ? arr[0].s : null;
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue;
        const rest = arr.filter((_, k) => k !== i && k !== j);
        for (const [sym, f] of OPS) {
          if ((sym === '+' || sym === '×') && i > j) continue; // commutative pruning
          const v = f(arr[i].v, arr[j].v);
          if (!Number.isFinite(v)) continue;
          const wrap = (x) => (x.s.length > 2 && /[+−×÷]/.test(x.s) ? `(${x.s})` : x.s);
          const r = rec([...rest, { v, s: `${wrap(arr[i])}${sym}${wrap(arr[j])}` }]);
          if (r) return r;
        }
      }
    }
    return null;
  };
  return rec(items);
}

export function make24Puzzle(maxN = 9) {
  for (let tries = 0; tries < 200; tries++) {
    const nums = [rand(1, maxN), rand(1, maxN), rand(1, maxN), rand(1, maxN)];
    const solution = solve24(nums);
    if (solution) return { nums, solution };
  }
  return { nums: [3, 3, 8, 8], solution: '8÷(3−8÷3)' };
}

/** Check a player's expression: uses exactly the 4 numbers once, only + − × ÷ and brackets, equals 24. */
export function check24(expr, nums) {
  const r = evaluate(expr);
  if (!r.ok) return { ok: false, reason: r.error };
  let used;
  try { used = literals(expr).sort((a, b) => a - b); } catch { return { ok: false, reason: 'Syntax error' }; }
  const want = [...nums].sort((a, b) => a - b);
  if (used.length !== want.length || used.some((n, i) => n !== want[i])) return { ok: false, reason: 'Use each number exactly once' };
  const allowed = new Set(['num', 'group', '+', '−', '×', '÷']);
  for (const t of nodeTypes(expr)) if (!allowed.has(t)) return { ok: false, reason: 'Only + − × ÷ and brackets' };
  if (Math.abs(r.value - 24) > 1e-9) return { ok: false, reason: `That makes ${r.value}` };
  return { ok: true };
}

/* ---------- Broken Keys ---------- */
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Some digit and operator keys are broken. The target always contains a broken digit
 * (so you can't just type it) and is reachable — we build it from working keys.
 */
export function brokenPuzzle(level = 1) {
  const nDigits = Math.max(2, 4 - Math.floor(level / 4));
  for (let tries = 0; tries < 500; tries++) {
    const working = [...DIGITS].sort(() => Math.random() - 0.5).slice(0, nDigits).sort();
    const opsAll = ['+', '−', '×', '÷'];
    const ops = [...opsAll].sort(() => Math.random() - 0.5).slice(0, level < 3 ? 3 : 2);
    const terms = level < 3 ? 2 : pick([2, 3]);
    const num = () => {
      const len = Math.random() < 0.6 ? 1 : 2;
      let s = '';
      for (let i = 0; i < len; i++) s += pick(working);
      return String(Number(s));
    };
    let expr = num();
    for (let t = 1; t < terms; t++) expr += pick(ops) + num();
    const r = evaluate(expr);
    if (!r.ok || !Number.isInteger(r.value) || r.value < 10 || r.value > 999) continue;
    const target = r.value;
    if ([...String(target)].every((d) => working.includes(d))) continue; // must not be directly typeable
    return { working, ops, target, par: expr.length, example: expr };
  }
  return { working: ['2', '5'], ops: ['+', '×'], target: 27, par: 4, example: '25+2' };
}

export function checkBroken(expr, p, presses = expr.length) {
  for (const c of expr) {
    if (/[0-9]/.test(c) && !p.working.includes(c)) return { ok: false, reason: `${c} is broken` };
    if (/[+−×÷]/.test(c) && !p.ops.includes(c)) return { ok: false, reason: `${c} is broken` };
  }
  const r = evaluate(expr);
  if (!r.ok) return { ok: false, reason: r.error };
  if (r.value !== p.target) return { ok: false, reason: `That makes ${r.value}` };
  const stars = presses <= p.par ? 3 : presses <= p.par + 3 ? 2 : 1;
  return { ok: true, stars, presses };
}

/* ---------- Estimate ---------- */
export function estimateQuestion(round) {
  const kinds = [
    () => `${rand(12, 99)}×${rand(12, 99)}`,
    () => `${rand(101, 999)}+${rand(101, 999)}+${rand(101, 999)}`,
    () => `${rand(200, 999)}×${rand(11, 49)}`,
    () => `${rand(1000, 9999)}÷${rand(3, 19)}`,
    () => `${rand(15, 60)}%×${rand(100, 2000)}`,
    () => `√${rand(200, 9999)}`,
    () => `${rand(11, 29)}²`,
  ];
  const q = kinds[Math.min(kinds.length - 1, Math.floor(round / 1.5)) - (round % 2 && round > 1 ? 1 : 0)]();
  return { q, answer: evaluate(q).value };
}

export function estimateScore(guess, answer) {
  if (!Number.isFinite(guess)) return 0;
  const err = Math.abs(guess - answer) / Math.max(1, Math.abs(answer));
  return Math.max(0, Math.round(100 * (1 - err / 0.25)));
}
