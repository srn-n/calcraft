// Calculator editing logic: pure functions over {expr, caret, evaluated, ...}.
import { evaluate, toExpr, openBrackets } from '../engine/index.js';

const BIN = ['+', '−', '×', '÷', '^'];
const POST = ['%', '!', '²', '³'];
const ATOMS = ['asin(', 'acos(', 'atan(', 'sin(', 'cos(', 'tan(', 'log(', 'ln(', 'abs(', 'Ans', '√(', '∛('];
const isDigit = (c) => c.length === 1 && c >= '0' && c <= '9';
/** Longest expression we accept. Stops runaway input (held keys, huge pastes) from freezing the UI. */
export const MAX_EXPR = 300;
/** A number as expression text, using the display minus sign (−) so editing rules see it. */
export const exprNumber = (n) => toExpr(n).replace(/-/g, '−');
const isPowerTok = (tok) => tok.length > 1 && tok[0] === '^'; // e.g. 1/x inserts "^(−1)"
const endsValue = (c) => !!c && (isDigit(c) || c === ')' || c === 'π' || c === 'e' || c === 's' || POST.includes(c) || c === '.');

export const initialCalc = () => ({ expr: '', caret: 0, evaluated: false, prevExpr: '', ans: 0, error: '' });

/** The number segment around the caret (for decimal-point rules). */
function numberBefore(expr, caret) {
  let i = caret;
  while (i > 0 && /[0-9.E]/.test(expr[i - 1])) i--;
  return expr.slice(i, caret);
}

function put(s, text, at = s.caret) {
  if (s.expr.length - (s.caret - at) + text.length > MAX_EXPR) return s;
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
    if (BIN.includes(tok) || POST.includes(tok) || isPowerTok(tok)) {
      const a = exprNumber(s.ans);
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
        const a = exprNumber(s.ans);
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

  if (POST.includes(tok) || isPowerTok(tok)) {
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

/** Forward delete (the Delete key): removes the character or function name after the caret. */
export function del(s) {
  if (s.evaluated) return { ...s, evaluated: false, prevExpr: '', error: '' };
  if (s.caret >= s.expr.length) return s;
  const tail = s.expr.slice(s.caret);
  const atom = ATOMS.find((a) => tail.startsWith(a));
  const n = atom ? atom.length : 1;
  return { ...s, expr: s.expr.slice(0, s.caret) + s.expr.slice(s.caret + n), error: '' };
}

/**
 * Insert a stored number (memory recall, a tape result, a tool result) as a whole value.
 * After another value it multiplies instead of gluing digits together (12 then 34 → 12×34, not 1234),
 * and negatives get brackets so 3 then −5 → 3×(−5), not 3−5.
 */
export function insertValue(s, n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return s;
  if (s.evaluated) s = { ...s, expr: '', caret: 0, evaluated: false, prevExpr: '', error: '' };
  if (s.expr === '0') s = { ...s, expr: '', caret: 0 };
  const before = s.expr[s.caret - 1];
  let lit = exprNumber(n);
  if (lit.startsWith('−') && before && before !== '(') lit = `(${lit})`;
  if (endsValue(before)) lit = '×' + lit;
  return put(s, lit);
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
    // 1e-7 / 2.5E+3 (JavaScript, Python, Excel) → engineering E. Typed 'e' stays Euler's number.
    .replace(/(\d)\s*[eE]\s*([+\-\u2212]?\d)/g, '$1E$2')
    // Commas: "1,234" / "1,234,567" are thousands separators; "1,5" / "3,14159" are decimal commas.
    .replace(/(\d),(?=\d)/g, (m, d, off, str) => (/^\d{3}(?!\d)/.test(str.slice(off + 2)) ? d : d + '.'))
    .replace(/[*xX·∗]/g, (m, i, str) => (m === 'x' && /[a-z]/i.test(str[i + 1] || '') ? m : '×'))
    .replace(/\//g, '÷')
    .replace(/[-–—]/g, '−')
    .replace(/sqrt/gi, '√')
    .replace(/\bpi\b/gi, 'π')
    .replace(/[^0-9.,+−×÷^%!²³()πeE√∛a-zA-Z ]/g, '')
    .replace(/\s+/g, '')
    .slice(0, MAX_EXPR);
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
  const out = exprNumber(r.value);
  const closed = s.expr + ')'.repeat(openBrackets(s.expr)); // record the auto-closed form
  return {
    state: { ...s, prevExpr: closed, expr: out, caret: out.length, evaluated: true, ans: r.value, error: '' },
    result: r,
  };
}
