import { describe, it, expect } from 'vitest';
import { convert } from '../src/ui/tools.js';

describe('units', () => {
  it('km → mi', () => expect(convert('Length', 10, 'km', 'mi')).toBeCloseTo(6.21371, 4));
  it('°F → °C', () => expect(convert('Temperature', 212, '°F', '°C')).toBeCloseTo(100, 9));
  it('K → °F', () => expect(convert('Temperature', 0, 'K', '°F')).toBeCloseTo(-459.67, 6));
  it('GiB → MB', () => expect(convert('Data', 1, 'GiB', 'MB')).toBeCloseTo(1073.741824, 6));
  it('round trip', () => expect(convert('Mass', convert('Mass', 5, 'lb', 'kg'), 'kg', 'lb')).toBeCloseTo(5, 12));
});
