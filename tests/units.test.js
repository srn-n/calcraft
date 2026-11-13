import { describe, it, expect } from 'vitest';
import { convert, cardNumber, UNITS } from '../src/ui/tools.js';

describe('units', () => {
  it('km → mi', () => expect(convert('Length', 10, 'km', 'mi')).toBeCloseTo(6.21371, 4));
  it('°F → °C', () => expect(convert('Temperature', 212, '°F', '°C')).toBeCloseTo(100, 9));
  it('K → °F', () => expect(convert('Temperature', 0, 'K', '°F')).toBeCloseTo(-459.67, 6));
  it('GiB → MB', () => expect(convert('Data', 1, 'GiB', 'MB')).toBeCloseTo(1073.741824, 6));
  it('round trip', () => expect(convert('Mass', convert('Mass', 5, 'lb', 'kg'), 'kg', 'lb')).toBeCloseTo(5, 12));
});

describe('conversion card values stay short (Units overflow fix, 1.0.6)', () => {
  it('formats normal, small, large and negative values compactly', () => {
    expect(cardNumber(393700.78740157483)).toBe('393,700.787');
    expect(cardNumber(0.00016666666666666666)).toBe('0.0001666667');
    expect(cardNumber(2.777777777777778e-6)).toBe('2.77778E−6');
    expect(cardNumber(3.168808781402895e-10)).toBe('3.16881E−10');
    expect(cardNumber(4860467283464.567)).toBe('4.86047E12');
    expect(cardNumber(-1.5e-7)).toBe('−1.5E−7');
    expect(cardNumber(0)).toBe('0');
    expect(cardNumber(NaN)).toBe('—');
  });
  it('no card value is longer than 15 characters for any unit pair and typical inputs', () => {
    for (const [cat, { u }] of Object.entries(UNITS)) {
      for (const v of [10, 123456789, 0.000123, 1e-12, 9.87654321e15, -42.5]) {
        for (const from of Object.keys(u)) for (const to of Object.keys(u)) {
          const s = cardNumber(convert(cat, v, from, to));
          expect(s.length, `${cat} ${v} ${from}→${to} = ${s}`).toBeLessThanOrEqual(15);
        }
      }
    }
  });
});
