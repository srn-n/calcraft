import { describe, it, expect } from 'vitest';
import { initialCalc, insert, backspace, equals, moveCaret, sanitizePaste, preview } from '../src/core/calculator.js';

const type = (keys, s = initialCalc()) => keys.reduce((st, k) => insert(st, k), s);

describe('editing', () => {
  it('replaces operators', () => expect(type(['5', '+', '×', '3']).expr).toBe('5×3'));
  it('allows negative after ×', () => expect(type(['5', '×', '−', '3']).expr).toBe('5×−3'));
  it('× − then + replaces both', () => expect(type(['5', '×', '−', '+']).expr).toBe('5+'));
  it('one decimal per number', () => expect(type(['1', '.', '2', '.', '3']).expr).toBe('1.23'));
  it('leading decimal gets a zero', () => expect(type(['.', '5']).expr).toBe('0.5'));
  it('smart bracket opens then closes', () => expect(type(['()', '2', '+', '3', '()']).expr).toBe('(2+3)'));
  it('smart bracket after value with no open → implied ×(', () => expect(type(['2', '()']).expr).toBe('2('));
  it('backspace removes whole function', () => expect(backspace(type(['sin('])).expr).toBe(''));
  it('5+0 then 7 → 5+7', () => expect(type(['5', '+', '0', '7']).expr).toBe('5+7'));
  it('caret insert in the middle', () => {
    let s = type(['1', '2', '3']);
    s = moveCaret(s, -1);
    s = insert(s, '+');
    expect(s.expr).toBe('12+3');
    expect(s.caret).toBe(3);
  });
});

describe('equals and chaining', () => {
  it('chains operators from the answer', () => {
    let { state } = equals(type(['6', '×', '7']), 'deg');
    expect(state.ans).toBe(42);
    state = type(['+', '1'], state);
    expect(state.expr).toBe('42+1');
  });
  it('digit after = starts fresh', () => {
    const { state } = equals(type(['6', '×', '7']), 'deg');
    expect(type(['9'], state).expr).toBe('9');
  });
  it('errors keep the expression', () => {
    const { state } = equals(type(['1', '÷', '0']), 'deg');
    expect(state.expr).toBe('1÷0');
    expect(state.error).toMatch(/divide/);
  });
  it('preview', () => expect(preview(type(['2', '+', '2']), 'deg')).toBe(4));
});

describe('paste', () => {
  it('cleans code-like text', () => expect(sanitizePaste('2 * 3 / 4 - 1')).toBe('2×3÷4−1'));
  it('strips quotes/semicolons and the result cannot evaluate', () => {
    const p = sanitizePaste('alert("x");');
    expect(p).not.toMatch(/["';]/);
    expect(preview({ ...insert(initialCalc(), '1'), expr: p }, 'deg')).toBeNull();
  });
  it('python power', () => expect(sanitizePaste('2**8')).toBe('2^8'));
});

/* ---- regression tests for the Oct 2026 audit ---- */
import { insertValue, del, MAX_EXPR } from '../src/core/calculator.js';

describe('audit fixes', () => {
  it('1/x right after = works on the answer', () => {
    const { state } = equals(type(['5']), 'deg');
    const s = insert({ ...state, expr: '5', evaluated: true, ans: 5 }, '^(−1)');
    expect(s.expr).toBe('5^(−1)');
    expect(preview(s, 'deg')).toBe(0.2);
  });
  it('1/x with nothing before it does nothing (no "Unexpected ^")', () => expect(insert(initialCalc(), '^(−1)').expr).toBe(''));
  it('recalling a value after a number multiplies, never glues digits', () => {
    expect(insertValue(type(['1', '2']), 34).expr).toBe('12×34');
    expect(insertValue(type(['3']), -5).expr).toBe('3×(−5)');
    expect(insertValue(type(['2', '+']), -5).expr).toBe('2+(−5)');
    expect(insertValue(initialCalc(), -5).expr).toBe('−5');
    expect(insertValue(type(['0']), 7).expr).toBe('7');
  });
  it('negative answers chain with the display minus sign', () => {
    const { state } = equals(type(['0', '−', '5']), 'deg');
    expect(type(['+'], state).expr).toBe('−5+');
  });
  it('Delete removes forward, including whole functions', () => {
    let s = moveCaret(type(['1', '2', '3']), -1);
    expect(del(s).expr).toBe('12');
    s = { ...initialCalc(), expr: 'sin(30)', caret: 0 };
    expect(del(s).expr).toBe('30)');
  });
  it('expression length is capped', () => {
    const s = type(Array.from({ length: MAX_EXPR + 50 }, () => '('));
    expect(s.expr.length).toBeLessThanOrEqual(MAX_EXPR);
  });
  it('pasted e-notation is a number, not Euler’s e', () => {
    expect(sanitizePaste('1e-7')).toBe('1E−7');
    expect(preview({ ...initialCalc(), expr: sanitizePaste('2.5e3+1') }, 'deg')).toBe(2501);
  });
  it('pasted decimal commas vs thousands separators', () => {
    expect(sanitizePaste('1,5*2')).toBe('1.5×2');
    expect(sanitizePaste('3,14159')).toBe('3.14159');
    expect(preview({ ...initialCalc(), expr: sanitizePaste('1,234,567+1') }, 'deg')).toBe(1234568);
    expect(preview({ ...initialCalc(), expr: sanitizePaste('1,000.50*2') }, 'deg')).toBe(2001);
  });
});

describe('tiny answers', () => {
  it('chaining from 1e-7 keeps the number (no lowercase e)', () => {
    const { state } = equals({ ...initialCalc(), expr: '1÷10000000', caret: 10 }, 'deg');
    const s = type(['+', '1'], state);
    expect(s.expr).not.toMatch(/e/);
    expect(preview(s, 'deg')).toBe(1.0000001);
  });
});
