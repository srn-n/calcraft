import { describe, it, expect } from 'vitest';
import { evaluate, formatNumber, toExpr, openBrackets, literals } from '../src/engine/index.js';

const v = (s, ctx) => {
  const r = evaluate(s, ctx);
  return r.ok ? r.value : r.code;
};

describe('arithmetic', () => {
  it.each([
    ['12×8−4', 92], ['2+3×4', 14], ['(2+3)×4', 20], ['10÷4', 2.5], ['0.1+0.2', 0.3],
    ['2^3^2', 512], ['−5^2', -25], ['(−5)^2', 25], ['2^−1', 0.5], ['−−3', 3], ['+4', 4],
    ['1,234+1', 1235], ['7-2', 5], ['3*4', 12], ['8/2', 4], ['2x3', 6], ['1.5E3', 1500], ['2E-3', 0.002],
  ])('%s = %s', (s, expected) => expect(v(s)).toBe(expected));
});

describe('percent works like a desk calculator', () => {
  it.each([['50%', 0.5], ['200+10%', 220], ['200−10%', 180], ['200×10%', 20], ['80÷50%', 160]])(
    '%s = %s', (s, e) => expect(v(s)).toBe(e));
});

describe('implied multiplication and auto-close', () => {
  it.each([
    ['2π', 2 * Math.PI], ['3(4)', 12], ['(2)(3)', 6], ['2(3+1', 8], ['√(16', 4], ['((2+3', 5], ['2sin(30)', 1], ['4√9', 12],
  ])('%s', (s, e) => expect(v(s)).toBeCloseTo(e, 10));
});

describe('functions', () => {
  it('degrees by default', () => {
    expect(v('sin(30)')).toBe(0.5);
    expect(v('cos(90)')).toBe(0);
    expect(v('sin(180)')).toBe(0);
    expect(v('tan(45)')).toBe(1);
    expect(v('asin(1)')).toBe(90);
  });
  it('radians', () => {
    expect(v('sin(π÷2)', { angle: 'rad' })).toBe(1);
    expect(v('cos(π)', { angle: 'rad' })).toBe(-1);
  });
  it.each([['√256', 16], ['∛27', 3], ['log(1000)', 3], ['ln(e)', 1], ['5!', 120], ['0!', 1], ['abs(−4)', 4], ['3²', 9], ['2³', 8], ['sqrt(9)', 3]])(
    '%s = %s', (s, e) => expect(v(s)).toBe(e));
  it('Ans', () => expect(v('Ans×2', { ans: 21 })).toBe(42));
});

describe('errors never throw and never execute code', () => {
  it.each([
    ['1÷0', 'div0'], ['√(−1)', 'domain'], ['log(0)', 'domain'], ['tan(90)', 'domain'], ['2.5!', 'domain'],
    ['5+', 'incomplete'], ['', 'empty'], ['()', 'syntax'], ['1)', 'syntax'], ['1..2', 'syntax'], ['171!', 'overflow'],
    ['alert(1)', 'syntax'], ['constructor', 'syntax'], ['Math.PI', 'syntax'], ['10^400', 'overflow'],
  ])('%s → %s', (s, code) => expect(v(s)).toBe(code));
});

describe('format', () => {
  it('groups', () => expect(formatNumber(1234567.5)).toBe('1,234,567.5'));
  it('negative uses real minus', () => expect(formatNumber(-1200)).toBe('−1,200'));
  it('big → E', () => expect(formatNumber(1e22)).toBe('1E22'));
  it('tiny → E', () => expect(toExpr(1.5e-12)).toBe('1.5E-12'));
  it('E round-trips', () => expect(v(toExpr(1.23e22))).toBe(1.23e22));
  it('open brackets', () => expect(openBrackets('sin(2×(3')).toBe(2));
  it('literals', () => expect(literals('(8÷(3−8÷3))').sort()).toEqual([3, 3, 8, 8]));
});
