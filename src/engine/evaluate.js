import { CalcError } from './tokenize.js';
import { parse } from './parse.js';

const DEG = Math.PI / 180;
const snap = (x) => (Math.abs(x) < 1e-12 ? 0 : x);

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new CalcError('domain', 'n! needs a whole number ≥ 0');
  if (n > 170) throw new CalcError('overflow', 'Too big');
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

/**
 * @param {object} node AST
 * @param {{angle?:'deg'|'rad', ans?:number}} ctx
 */
export function evaluateAst(node, ctx = {}) {
  const angle = ctx.angle || 'deg';
  const toRad = (x) => (angle === 'deg' ? x * DEG : x);
  const fromRad = (x) => (angle === 'deg' ? x / DEG : x);

  const ev = (n) => {
    switch (n.type) {
      case 'num': return n.value;
      case 'const': return n.name === 'π' ? Math.PI : Math.E;
      case 'ans': return ctx.ans ?? 0;
      case 'group': return ev(n.expr);
      case 'neg': return -ev(n.arg);
      case 'percent': return ev(n.arg) / 100;
      case 'fact': return factorial(ev(n.arg));
      case 'bin': {
        const a = ev(n.left);
        // a ± b%  →  a ± (a × b/100)   (how every desk calculator works)
        if ((n.op === '+' || n.op === '−') && n.right.type === 'percent') {
          const pct = ev(n.right.arg) / 100;
          return n.op === '+' ? a + a * pct : a - a * pct;
        }
        const b = ev(n.right);
        switch (n.op) {
          case '+': return a + b;
          case '−': return a - b;
          case '×': return a * b;
          case '÷':
            if (b === 0) throw new CalcError('div0', 'Can’t divide by 0');
            return a / b;
          case '^': {
            if (a === 0 && b < 0) throw new CalcError('div0', 'Can’t divide by 0'); // 0^−1 = 1/0
            const r = Math.pow(a, b);
            if (Number.isNaN(r)) throw new CalcError('domain', 'Not a real number');
            return r;
          }
        }
        throw new CalcError('syntax', 'Unknown operator');
      }
      case 'call': {
        const x = ev(n.arg);
        switch (n.name) {
          case 'sin': return snap(Math.sin(toRad(x)));
          case 'cos': return snap(Math.cos(toRad(x)));
          case 'tan': {
            const c = snap(Math.cos(toRad(x)));
            if (c === 0) throw new CalcError('domain', 'tan is undefined here');
            return snap(Math.sin(toRad(x)) / c);
          }
          case 'asin': case 'acos':
            if (x < -1 || x > 1) throw new CalcError('domain', 'Needs −1 … 1');
            return fromRad(n.name === 'asin' ? Math.asin(x) : Math.acos(x));
          case 'atan': return fromRad(Math.atan(x));
          case 'log':
            if (x <= 0) throw new CalcError('domain', 'log needs x > 0');
            return Math.log10(x);
          case 'ln':
            if (x <= 0) throw new CalcError('domain', 'ln needs x > 0');
            return Math.log(x);
          case '√':
            if (x < 0) throw new CalcError('domain', 'Not a real number');
            return Math.sqrt(x);
          case '∛': return Math.cbrt(x);
          case 'abs': return Math.abs(x);
        }
        throw new CalcError('syntax', `Unknown function ${n.name}`);
      }
    }
    throw new CalcError('syntax', 'Syntax error');
  };

  const r = ev(node);
  if (!Number.isFinite(r)) throw new CalcError('overflow', r !== r ? 'Not a number' : 'Too big');
  return clean(r);
}

/** Round to 12 significant digits so 0.1+0.2 = 0.3, and kill −0. */
export function clean(x) {
  if (x === 0) return 0;
  return Number(x.toPrecision(12));
}

/**
 * Safe evaluate. Returns {ok:true,value} or {ok:false,error,code}.
 */
export function evaluate(src, ctx) {
  try {
    const value = evaluateAst(parse(src), ctx);
    return { ok: true, value };
  } catch (e) {
    if (e instanceof CalcError) return { ok: false, error: e.message, code: e.code };
    return { ok: false, error: 'Error', code: 'internal' };
  }
}

/** Collect the number literals in an expression (for Make 24 validation). */
export function literals(src) {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    if (n.type === 'num') out.push(n.value);
    for (const k of ['arg', 'left', 'right', 'expr']) if (n[k]) walk(n[k]);
  };
  walk(parse(src));
  return out;
}

/** Which node types appear (so games can forbid e.g. functions). */
export function nodeTypes(src) {
  const out = new Set();
  const walk = (n) => {
    if (!n) return;
    out.add(n.type === 'bin' ? n.op : n.type === 'call' ? n.name : n.type);
    for (const k of ['arg', 'left', 'right', 'expr']) if (n[k]) walk(n[k]);
  };
  walk(parse(src));
  return out;
}
