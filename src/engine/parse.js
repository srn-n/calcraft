// Pratt parser → AST. Missing closing brackets are auto-closed at the end.
import { tokenize, CalcError } from './tokenize.js';

const BP = { add: 10, mul: 20, unary: 30, func: 35, pow: 40, post: 50 };

const startsOperand = (t) => t && (t.type === 'num' || t.type === 'const' || t.type === 'func' || t.type === 'lparen' || t.type === 'ans');

export function parse(src) {
  const tokens = typeof src === 'string' ? tokenize(src) : src;
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  function nud(t) {
    if (!t) throw new CalcError('incomplete', 'Incomplete');
    switch (t.type) {
      case 'num': return { type: 'num', value: t.value };
      case 'const': return { type: 'const', name: t.value };
      case 'ans': return { type: 'ans' };
      case 'lparen': {
        if (peek() && peek().type === 'rparen') throw new CalcError('syntax', 'Empty brackets');
        const e = expr(0);
        if (peek() && peek().type === 'rparen') next(); // else auto-close at EOF
        else if (peek()) throw new CalcError('syntax', 'Expected )');
        return { type: 'group', expr: e };
      }
      case 'func': {
        // sin(…) or √9 (binds tighter than × but looser than ^)
        const arg = peek() && peek().type === 'lparen' ? nud(next()) : expr(BP.func);
        return { type: 'call', name: t.value, arg };
      }
      case 'op':
        if (t.value === '−') return { type: 'neg', arg: expr(BP.unary) };
        if (t.value === '+') return expr(BP.unary);
        throw new CalcError('syntax', `Unexpected ${t.value}`);
      case 'rparen': throw new CalcError('syntax', 'Unexpected )');
      case 'post': throw new CalcError('syntax', `Unexpected ${t.value}`);
      default: throw new CalcError('syntax', 'Syntax error');
    }
  }

  function lbp(t) {
    if (!t) return 0;
    if (t.type === 'op') return t.value === '+' || t.value === '−' ? BP.add : t.value === '^' ? BP.pow : BP.mul;
    if (t.type === 'post') return BP.post;
    if (startsOperand(t)) return BP.mul; // implied multiplication: 2π, 3(4), (2)(3)
    return 0;
  }

  function led(left, t) {
    if (t.type === 'post') return { type: t.value === '%' ? 'percent' : 'fact', arg: left };
    if (t.type === 'op') {
      if (t.value === '^') return { type: 'bin', op: '^', left, right: expr(BP.pow - 1) }; // right-assoc
      return { type: 'bin', op: t.value, left, right: expr(lbp(t)) };
    }
    // implied ×: the token is the start of the next operand
    i--;
    return { type: 'bin', op: '×', left, right: expr(BP.mul), implied: true };
  }

  function expr(rbp) {
    let left = nud(next());
    while (peek() && rbp < lbp(peek())) {
      left = led(left, next());
    }
    return left;
  }

  if (!tokens.length) throw new CalcError('empty', 'Empty');
  const ast = expr(0);
  if (i < tokens.length) {
    const t = tokens[i];
    throw new CalcError('syntax', t.type === 'rparen' ? 'Unexpected )' : 'Syntax error');
  }
  return ast;
}

/** Number of “(” still open at the end of the string — used to draw ghost brackets. */
export function openBrackets(src) {
  let depth = 0;
  for (const c of src) {
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
  }
  return depth;
}
