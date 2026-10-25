// Calculator editing logic: pure functions over {expr, caret, evaluated, ...}.
import { evaluate, toExpr, openBrackets } from '../engine/index.js';

const BIN = ['+', '−', '×', '÷', '^'];
const POST = ['%', '!', '²', '³'];
const ATOMS = ['asin(', 'acos(', 'atan(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', 'abs(', 'Ans', '√(', '∛('];
const isDigit = (c) => c >= '0' && c <= '9';
const endsValue = (c) => !!c && (isDigit(c) || c === ')' || c === 'π' || c === 'e' || c === 's' || POST.includes(c) || c === '.');

export const initialCalc = () => ({ expr: '', caret: 0, evaluated: false, prevExpr: '', ans: 0, error: '' });

/** The number segment around the caret (for decimal-point rules). */
function numberBefore(expr, caret) {
  let i = caret;
  while (i > 0 && /[0-9.E]/.test(expr[i - 1])) i--;
  return expr.slice(i, caret);
}

function put(s, text, at = s.caret) {
  return { ...s, expr: s.expr.slice(0, at) + text + s.expr.slice(s.caret), caret: at + text.length, evaluated: false, error: '' };
}

/**
 * Insert a token with calculator-smart rules.
 * @param {ReturnType<typeof initialCalc>} s
 * @param {string} tok  display token, e.g. '7', '+', 'sin(', 'π', '()', '%'
 */
export function insert(s, tok) {
  // After "=": operators continue from the answer, anything else starts fresh.
  if (s.evaluated) {
    const base = { ...s, prevExpr: '', evaluated: false, error: '' };
    if (BIN.includes(tok) || POST.includes(tok)) {
      const a = toExpr(s.ans);
      return insert({ ...base, expr: a, caret: a.length }, tok);
    }
    return insert({ ...base, expr: '', caret: 0 }, tok);
  }

  const before = s.expr[s.caret - 1];

  if (tok === '()') {
    const open = openBrackets(s.expr.slice(0, s.caret));
    return insert(s, open > 0 && endsValue(before) ? ')' : '(');
  }

  if (tok === ')') {
    if (openBrackets(s.expr.slice(0, s.caret)) === 0 || !endsValue(before)) return s;
    return put(s, ')');
  }

  if (tok === '.') {
    const seg = numberBefore(s.expr, s.caret);
    if (seg.includes('.') || seg.includes('E')) return s;
    return put(s, seg === '' ? '0.' : '.');
  }

  if (tok === 'E') {
    const seg = numberBefore(s.expr, s.caret);
    if (!seg || seg.includes('E')) return s;
    return put(s, 'E');
  }

  if (BIN.includes(tok)) {
    if (s.caret === 0 || before === '(') {
      if (tok === '−') return put(s, '−');
      if (s.caret === 0 && s.expr === '' && s.ans) { // start from last answer
        const a = toExpr(s.ans);
        return put({ ...s, expr: a, caret: a.length }, tok);
      }
      return s;
    }
    if (BIN.includes(before)) {
      // allow a negative after × ÷ ^ ; otherwise replace the previous operator
      if (tok === '−' && (before === '×' || before === '÷' || before === '^')) return put(s, '−');
      const at = s.caret - 1;
      const prev2 = s.expr[at - 1];
      if (before === '−' && BIN.includes(prev2)) return put({ ...s }, tok, at - 1); // "×−" → replace both
      return put(s, tok, at);
    }
    if (before === 'E') return tok === '−' ? put(s, '−') : s;
    return put(s, tok);
  }

  if (POST.includes(tok)) {
    if (!endsValue(before)) return s;
    return put(s, tok);
  }

  // digits, constants, functions, "(": leading zero replacement
  if (isDigit(tok) && s.expr === '0') return { ...s, expr: tok, caret: 1, error: '' };
  if (isDigit(tok) && before === '0' && !/[0-9.]/.test(s.expr[s.caret - 2] || '') && s.caret === s.expr.length) {
    // "5+0" then "7" → "5+7"
    return put(s, tok, s.caret - 1);
  }
  return put(s, tok);
}

export function backspace(s) {
  if (s.evaluated) return { ...s, evaluated: false, prevExpr: '', error: '' };
  if (s.caret === 0) return s;
  const head = s.expr.slice(0, s.caret);
  const atom = ATOMS.find((a) => head.endsWith(a));
  const n = atom ? atom.length : 1;
  return { ...s, expr: s.expr.slice(0, s.caret - n) + s.expr.slice(s.caret), caret: s.caret - n, error: '' };
}

export const clear = (s) => ({ ...s, expr: '', caret: 0, evaluated: false, prevExpr: '', error: '' });

export function moveCaret(s, d) {
  if (s.evaluated) s = { ...s, evaluated: false, prevExpr: '' };
  let c = s.caret + d;
  // jump over whole function names
  for (const a of ATOMS) {
    if (d < 0 && s.expr.slice(0, s.caret).endsWith(a)) c = s.caret - a.length;
    if (d > 0 && s.expr.slice(s.caret).startsWith(a)) c = s.caret + a.length;
  }
  return { ...s, caret: Math.max(0, Math.min(s.expr.length, c)) };
}

export const setCaret = (s, c) => ({ ...s, evaluated: false, prevExpr: s.evaluated ? '' : s.prevExpr, caret: Math.max(0, Math.min(s.expr.length, c)) });

/** Turn pasted text into a clean expression. */
export function sanitizePaste(text) {
  return String(text)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\*\*/g, '^')
    .replace(/[*xX·∗]/g, (m, i, str) => (m === 'x' && /[a-z]/i.test(str[i + 1] || '') ? m : '×'))
    .replace(/\//g, '÷')
    .replace(/[-–—]/g, '−')
    .replace(/sqrt/gi, '√')
    .replace(/\bpi\b/gi, 'π')
    .replace(/[^0-9.,+−×÷^%!²³()πeE√∛a-zA-Z ]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 200);
}

export function preview(s, angle) {
  if (!s.expr || s.evaluated) return null;
  if (/^−?[0-9.,]+$/.test(s.expr)) return null; // a lone number previews nothing
  const r = evaluate(s.expr, { angle, ans: s.ans });
  return r.ok ? r.value : null;
}

export function equals(s, angle) {
  if (s.evaluated || !s.expr) return { state: s, result: null };
  const r = evaluate(s.expr, { angle, ans: s.ans });
  if (!r.ok) return { state: { ...s, error: r.code === 'incomplete' ? 'Finish the expression' : r.error }, result: r };
  const out = toExpr(r.value);
  const closed = s.expr + ')'.repeat(openBrackets(s.expr)); // record the auto-closed form
  return {
    state: { ...s, prevExpr: closed, expr: out, caret: out.length, evaluated: true, ans: r.value, error: '' },
    result: r,
  };
}
