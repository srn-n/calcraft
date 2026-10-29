// Guards for the security fixes. These fail loudly if a future edit silently undoes one.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cleanHistory, cleanSettings, cleanTools, cleanBests, cleanNumber, cleanAngle } from '../src/core/schema.js';
import { UNITS } from '../src/ui/tools.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('Content-Security-Policy', () => {
  const csp = JSON.parse(read('vercel.json')).headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
  it('allows the inline pre-paint script by its exact hash', () => {
    const scripts = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(scripts.length).toBe(1);
    const hash = `'sha256-${createHash('sha256').update(scripts[0]).digest('base64')}'`;
    expect(csp, `Paste ${hash} into vercel.json script-src`).toContain(hash);
  });
  it('has no unsafe-inline / unsafe-eval and blocks framing', () => {
    expect(csp).not.toMatch(/unsafe-(inline|eval)/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).toMatch(/object-src 'none'/);
  });
  it('source never builds inline style attributes or uses eval', () => {
    for (const f of ['src/ui/display.js', 'src/ui/keypad.js', 'src/ui/history.js', 'src/main.js']) {
      const s = read(f);
      expect(s, f).not.toMatch(/style="/);
      expect(s, f).not.toMatch(/\beval\(|new Function\(/);
    }
  });
});

describe('storage validation', () => {
  it('rejects non-array / junk history', () => {
    expect(cleanHistory({ a: 1 })).toEqual([]);
    expect(cleanHistory([null, 5, { expr: 'x' }, { expr: '1+1', value: 'two' }])).toEqual([]);
    expect(cleanHistory([{ expr: '1+1', value: 2, t: 5 }])[0]).toMatchObject({ expr: '1+1', value: 2 });
  });
  it('caps tape entries and expression length', () => {
    const big = Array.from({ length: 500 }, (_, i) => ({ expr: '9'.repeat(1000), value: i, t: i }));
    const h = cleanHistory(big);
    expect(h.length).toBe(200);
    expect(h[0].expr.length).toBeLessThanOrEqual(400);
  });
  it('settings only keep known boolean keys', () => {
    expect(cleanSettings(null).haptics).toBe(true);
    expect(cleanSettings({ sound: 'yes', evil: true })).not.toHaveProperty('evil');
    expect(cleanSettings({ sound: 'yes' }).sound).toBe(false);
  });
  it('numbers, angle, bests', () => {
    expect(cleanNumber('abc')).toBe(0);
    expect(cleanNumber(Infinity)).toBe(0);
    expect(cleanAngle('grad')).toBe('deg');
    expect(cleanBests({ sprint: 'lots', make24: 3, __proto__: { x: 1 } })).toEqual({ make24: 3 });
  });
  it('tools state with an unknown unit category falls back instead of crashing', () => {
    const t = cleanTools({ tab: 'units', units: { cat: 'Nope' } }, UNITS);
    expect(t.units.cat).toBe('Length');
    expect(Object.keys(UNITS.Length.u)).toContain(t.units.from);
    expect(cleanTools({ units: { cat: '__proto__' } }, UNITS).units.cat).toBe('Length');
  });
});

describe('pentest hardening', () => {
  it('tape drops planted markup and bidi-override text', () => {
    const h = cleanHistory([
      { expr: '<img src=x onerror=alert(1)>', value: 1, t: 1 },
      { expr: '‮1+2', value: 3, t: 1 },
      { expr: '1+2', value: 3, t: 1 },
    ]);
    expect(h.map((x) => x.expr)).toEqual(['1+2']);
  });
  it('service worker caches by path (no ?query cache explosion)', () => {
    const sw = read('public/sw.js');
    expect(sw).toMatch(/url\.origin \+ url\.pathname/);
    expect(sw).not.toMatch(/c\.put\(req,/);
  });
  it('free-text inputs are length-limited', () => {
    const html = read('index.html');
    expect(html).toMatch(/id="paletteInput"[^>]*maxlength="300"/);
    expect(html).toMatch(/id="historySearch"[^>]*maxlength="100"/);
  });
});

import { feedbackHref, FEEDBACK_EMAIL } from '../src/ui/feedback.js';
describe('feedback mailto', () => {
  it('goes to the right address with an encoded subject and body', () => {
    const href = feedbackHref({ version: '5.1.0', theme: 'Braun ET66', screen: '393×659 @3x', browser: 'Test & Co <x>' });
    expect(FEEDBACK_EMAIL).toBe('samiiiur@yahoo.com');
    expect(href.startsWith('mailto:samiiiur@yahoo.com?subject=')).toBe(true);
    expect(href).not.toMatch(/[\s<>"]/); // nothing raw that could break or inject into the URL
    const u = new URL(href);
    expect(u.searchParams.get('subject')).toBe('Bouncy Calculator feedback (v5.1.0)');
    expect(u.searchParams.get('body')).toContain('Theme: Braun ET66');
    expect(u.searchParams.get('body')).toContain('Browser: Test & Co <x>');
  });
});
