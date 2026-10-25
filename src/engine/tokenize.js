// Tokeniser: turns a display string into tokens. Never evaluates code.
// Display chars: digits . + − × ÷ ^ % ! ² ³ ( ) π e √ ∛ E(exponent) and function names.

export const FUNCS = ['asin', 'acos', 'atan', 'sin', 'cos', 'tan', 'log', 'ln', 'abs', 'sqrt', 'cbrt'];
const ALIASES = { '*': '×', x: '×', X: '×', '/': '÷', '-': '−', '–': '−', '—': '−', '·': '×', '∗': '×', ':': '÷' };

export class CalcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

/**
 * @param {string} src
 * @returns {{type:string, value?:any, pos:number}[]}
 */
export function tokenize(src) {
  const out = [];
  let i = 0;
  const s = String(src);
  while (i < s.length) {
    let c = s[i];
    if (c === ' ' || c === ',' || c === ' ' || c === '_') { i++; continue; }
    if (ALIASES[c] && !(c === 'x' && /[a-z]/i.test(s[i + 1] || ''))) c = ALIASES[c];

    // number: 12  12.5  .5  1.2E-7
    if (/[0-9.]/.test(c)) {
      const start = i;
      let str = '';
      let dots = 0;
      while (i < s.length && /[0-9.,_]/.test(s[i])) {
        if (s[i] === '.') dots++;
        if (s[i] !== ',' && s[i] !== '_') str += s[i];
        i++;
      }
      if (dots > 1) throw new CalcError('syntax', 'Too many decimal points');
      if (str === '.') throw new CalcError('syntax', 'Lonely decimal point');
      if (s[i] === 'E' && /[0-9+\-−]/.test(s[i + 1] || '')) {
        let j = i + 1;
        let exp = '';
        if (/[+\-−]/.test(s[j])) { exp += s[j] === '+' ? '' : '-'; j++; }
        if (!/[0-9]/.test(s[j] || '')) throw new CalcError('syntax', 'Incomplete exponent');
        while (j < s.length && /[0-9]/.test(s[j])) exp += s[j++];
        str += 'e' + exp;
        i = j;
      }
      out.push({ type: 'num', value: parseFloat(str), raw: str, pos: start });
      continue;
    }

    if (/[a-zA-Z]/.test(c)) {
      const rest = s.slice(i);
      if (/^Ans/.test(rest)) { out.push({ type: 'ans', pos: i }); i += 3; continue; }
      if (/^pi/i.test(rest)) { out.push({ type: 'const', value: 'π', pos: i }); i += 2; continue; }
      const fn = FUNCS.find((f) => rest.toLowerCase().startsWith(f));
      if (fn) { out.push({ type: 'func', value: fn === 'sqrt' ? '√' : fn === 'cbrt' ? '∛' : fn, pos: i }); i += fn.length; continue; }
      if (c === 'e') { out.push({ type: 'const', value: 'e', pos: i }); i++; continue; }
      throw new CalcError('syntax', `Unknown “${c}”`);
    }

    switch (c) {
      case '+': case '−': case '×': case '÷': case '^':
        out.push({ type: 'op', value: c, pos: i }); break;
      case '%': case '!':
        out.push({ type: 'post', value: c, pos: i }); break;
      case '²': out.push({ type: 'op', value: '^', pos: i }, { type: 'num', value: 2, raw: '2', pos: i }); break;
      case '³': out.push({ type: 'op', value: '^', pos: i }, { type: 'num', value: 3, raw: '3', pos: i }); break;
      case '(': case '[': out.push({ type: 'lparen', pos: i }); break;
      case ')': case ']': out.push({ type: 'rparen', pos: i }); break;
      case 'π': out.push({ type: 'const', value: 'π', pos: i }); break;
      case '√': case '∛': out.push({ type: 'func', value: c, pos: i }); break;
      default:
        throw new CalcError('syntax', `Unknown “${c}”`);
    }
    i++;
  }
  return out;
}
