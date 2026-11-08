import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextDue, dueThisMonth, monthlyAverage, BILL_KINDS, FREQS } from '../src/ui/bills.js';
import { cleanBills, cleanTools } from '../src/core/schema.js';
import { UNITS } from '../src/ui/tools.js';

const opts = { kinds: BILL_KINDS, freqs: Object.keys(FREQS) };

describe('bills: due dates', () => {
  it('steps each frequency', () => {
    expect(nextDue('2026-01-10', 'week')).toBe('2026-01-17');
    expect(nextDue('2026-01-10', 'fortnight')).toBe('2026-01-24');
    expect(nextDue('2026-01-10', 'month')).toBe('2026-02-10');
    expect(nextDue('2026-01-10', 'quarter')).toBe('2026-04-10');
    expect(nextDue('2026-01-10', 'half')).toBe('2026-07-10');
    expect(nextDue('2026-01-10', 'year')).toBe('2027-01-10');
    expect(nextDue('2026-01-10', 'once')).toBe('2026-01-10');
  });
  it('clamps month-end days instead of spilling into the next month', () => {
    expect(nextDue('2026-01-31', 'month')).toBe('2026-02-28');
    expect(nextDue('2028-01-31', 'month')).toBe('2028-02-29'); // leap year
    expect(nextDue('2026-08-31', 'quarter')).toBe('2026-11-30');
  });
  it('crosses year ends', () => {
    expect(nextDue('2026-12-28', 'week')).toBe('2027-01-04');
    expect(nextDue('2026-11-15', 'quarter')).toBe('2027-02-15');
  });
});

describe('bills: totals', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 9, 12)); }); // 9 Nov 2026
  afterEach(() => vi.useRealTimers());
  const b = (amount, freq, due, extra = {}) => ({ id: 'x', kind: 'other', name: 'x', amount, freq, due, note: '', paid: [], ...extra });

  it('counts what falls due before the end of this month, overdue included, repeats counted', () => {
    const items = [
      b('100', 'month', '2026-11-20'), // once this month
      b('10', 'week', '2026-11-10'), // 10, 17, 24 Nov → 3 times
      b('50', 'quarter', '2026-11-01'), // overdue → counts
      b('999', 'month', '2026-12-01'), // next month → not counted
      b('40', 'once', '2026-11-12', { done: true }), // paid one-off → not counted
    ];
    expect(dueThisMonth(items)).toBe(100 + 30 + 50);
  });
  it('averages per month across frequencies', () => {
    const avg = monthlyAverage([b('120', 'year', '2026-12-01'), b('30', 'quarter', '2026-12-01'), b('12', 'week', '2026-12-01')]);
    expect(avg).toBeCloseTo(10 + 10 + 52, 6);
  });
  it('ignores amounts that are not real positive numbers', () => {
    expect(dueThisMonth([b('abc', 'month', '2026-11-20'), b('-5', 'month', '2026-11-20'), b('', 'month', '2026-11-20')])).toBe(0);
  });
});

describe('bills: saved data is validated', () => {
  it('drops broken bills, bad dates, unknown kinds and oversized fields', () => {
    const out = cleanBills({
      items: [
        { id: 'ok1', kind: 'water', name: 'Water', amount: '80', freq: 'quarter', due: '2026-12-01', paid: [{ d: '2026-09-01', a: 80 }] },
        { id: 'bad date', kind: 'water', due: '2026-12-01' }, // id with a space
        { id: 'b2', kind: '<img src=x>', name: 'x'.repeat(500), freq: 'hourly', due: '2026-02-30' }, // impossible date
        { id: 'b3', kind: '__proto__', freq: 'year', due: '2026-03-01', note: 'n'.repeat(999) },
        { id: 'ok1', kind: 'gas', due: '2026-12-01' }, // duplicate id
      ],
      note: 'z'.repeat(5000), cur: '<script>',
    }, opts);
    expect(out.items.map((i) => i.id)).toEqual(['ok1', 'b3']);
    expect(out.items[1].kind).toBe('other');
    expect(out.items[1].note.length).toBe(200);
    expect(out.items[1].freq).toBe('year');
    expect(out.note.length).toBe(2000);
    expect(out.cur).toBe('$');
    expect(out.items[0].paid).toEqual([{ d: '2026-09-01', a: 80 }]);
  });
  it('caps the list and survives garbage', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ id: 'b' + i, due: '2026-12-01' }));
    expect(cleanBills({ items: many }, opts).items.length).toBe(60);
    expect(cleanBills('nope', opts)).toEqual({ items: [], note: '', cur: '$' });
    expect(cleanTools({ tab: 'bills', bills: null }, UNITS, opts).bills.items).toEqual([]);
    expect(cleanTools({ tab: 'bills' }, UNITS, opts).tab).toBe('bills');
  });
});
