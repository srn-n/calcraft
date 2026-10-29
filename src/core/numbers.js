// Text → number helpers shared by paste, the command palette and the Tools inputs.
// Rule: never silently drop a character that could change the value. Text we can't read
// exactly is rejected (NaN / empty), never guessed at.

/** Fullwidth ASCII (１２＋３) → ASCII, and any Unicode decimal digit (٣ ३ ৩ …) → 0-9. */
export function normalizeDigits(text) {
  let out = '';
  for (const ch of String(text)) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xff01 && cp <= 0xff5e) { out += String.fromCharCode(cp - 0xfee0); continue; }
    if (cp > 0x7f && /\p{Nd}/u.test(ch)) {
      // Unicode lays decimal digits out in contiguous runs of ten (0…9), so walk back to the run's zero.
      let zero = cp;
      while (zero > 0 && /\p{Nd}/u.test(String.fromCodePoint(zero - 1))) zero--;
      out += String((cp - zero) % 10);
      continue;
    }
    out += ch;
  }
  return out;
}

/** Invisible format characters (zero-width spaces, bidi overrides). They carry no value but can spoof text. */
export const stripInvisible = (s) => String(s).replace(/\p{Cf}/gu, '');

/** "1,234" / "1,234,567" are thousands separators; "1,5" / "3,14159" are decimal commas. */
export const resolveCommas = (s) => s.replace(/(\d),(?=\d)/g, (m, d, off, str) => (/^\d{3}(?!\d)/.test(str.slice(off + 2)) ? d : d + '.'));

/**
 * Strict number parser for form fields. Accepts "1,234.50", "1,5", "$12", "1 000", "1'000", "2.5e3", "−5".
 * Rejects anything with leftover characters ("12abc", "0x10", "1..2") as NaN instead of reading a prefix.
 */
export function parseNumberStrict(text) {
  let s = stripInvisible(normalizeDigits(text)).trim();
  if (!s) return NaN;
  s = s.replace(/[\p{Sc}\s\u00a0\u2009\u202f_]/gu, '').replace(/(\d)'(?=\d)/g, '$1').replace(/[\u2212\u2013\u2014]/g, '-');
  s = resolveCommas(s);
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
