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
