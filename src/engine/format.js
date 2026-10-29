// Number → display string.

/** Plain string for re-inserting into an expression (no grouping, E-notation). */
export function toExpr(n) {
  if (n === 0) return '0';
  const a = Math.abs(n);
  // Below 1e-6 String() switches to JS notation ("1e-7"), whose lowercase e the tokenizer
  // reads as Euler's number — so small answers are always written with an engineering E here.
  if (a >= 1e15 || a < 1e-6) {
    const [m, e] = n.toExponential(9).split('e');
    return `${trimZeros(m)}E${e.replace('+', '')}`;
  }
  return String(n);
}

/** Pretty string for the big display. */
export function formatNumber(n, { group = true } = {}) {
  if (!Number.isFinite(n)) return 'Error';
  const s = toExpr(n);
  if (s.includes('E') || !group) return s.replace('-', '−');
  const neg = s.startsWith('-');
  const [int, frac] = (neg ? s.slice(1) : s).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '−' : '') + grouped + (frac ? '.' + frac : '');
}

function trimZeros(m) {
  return m.includes('.') ? m.replace(/0+$/, '').replace(/\.$/, '') : m;
}

/** Group the digits inside an expression string, e.g. 1234567+8 → 1,234,567+8. */
export function groupExpression(expr) {
  return expr.replace(/\d+(\.\d+)?/g, (m) => {
    const [int, frac] = m.split('.');
    if (int.length < 4) return m;
    return int.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (frac !== undefined ? '.' + frac : '');
  });
}
