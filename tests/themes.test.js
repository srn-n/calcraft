import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { THEMES, themeById } from '../src/themes.js';
import { ART } from '../src/ui/theme-art.js';

const css = readFileSync(new URL('../src/styles/themes.css', import.meta.url), 'utf8');
const sound = readFileSync(new URL('../src/fx/sound.js', import.meta.url), 'utf8');

describe('theme catalogue', () => {
  it('has 28 themes with unique, storage-safe ids', () => {
    expect(THEMES.length).toBe(28);
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]{2,16}$/); // the inline head script only accepts this shape
  });
  it('every theme has styles and its own key sound', () => {
    for (const t of THEMES) {
      expect(css, `${t.id} css`).toContain(`[data-theme="${t.id}"]`);
      expect(sound, `${t.id} sound`).toMatch(new RegExp(`\\n\\s+${t.id}:\\s+\\{ num:`));
    }
  });
  it('the five exclusive themes each have character, operator and AC art', () => {
    const ex = THEMES.filter((t) => t.exclusive).map((t) => t.id);
    expect(ex).toEqual(['astro', 'ronin', 'weaver', 'pinkpop', 'kitten']);
    for (const id of ex) for (const k of ['char', 'op', 'ac']) expect(ART[id][k]).toMatch(/^<svg [^>]*viewBox="0 0 64 64">[\s\S]*<\/svg>$/);
    // art is static vector drawing only: nothing that could run or load anything
    for (const id of ex) for (const k of ['char', 'op', 'ac']) expect(ART[id][k]).not.toMatch(/script|href|on\w+=|url\(|foreignObject/i);
  });
  it('Solar LCD and Neon Tokyo are gone; anyone who had them lands on Night Weaver', () => {
    for (const old of ['lcd', 'neon']) {
      expect(THEMES.find((t) => t.id === old)).toBeUndefined();
      expect(css).not.toContain(`[data-theme="${old}"]`);
      expect(themeById(old).id).toBe('weaver');
    }
    expect(themeById('nope').id).toBe(THEMES[0].id);
  });
});

describe('exclusive signature sounds and characters', async () => {
  const { SIGNATURE } = await import('../src/fx/signature.js');
  const { CAST } = await import('../src/ui/buddy.js');
  const ex = THEMES.filter((t) => t.exclusive).map((t) => t.id);
  it('every exclusive theme has a full signature sound set', () => {
    expect(Object.keys(SIGNATURE).sort()).toEqual([...ex].sort());
    for (const id of ex) for (const k of ['num', 'op', 'ac', 'eq', 'error', 'theme']) expect(typeof SIGNATURE[id][k], `${id}.${k}`).toBe('function');
  });
  it('every exclusive character has its own reactions', () => {
    expect(Object.keys(CAST).sort()).toEqual([...ex].sort());
    for (const id of ex) {
      const c = CAST[id];
      expect(c.eq.length).toBeGreaterThan(2);
      expect(['stars', 'slash', 'web', 'hearts', 'paws']).toContain(c.burst);
      expect(css).toContain(`[data-bud-idle="${c.idle}"]`);
    }
  });
  it('theme switching no longer uses a full-page view transition', () => {
    const ui = readFileSync(new URL('../src/ui/themes-ui.js', import.meta.url), 'utf8');
    expect(ui).not.toMatch(/startViewTransition/);
  });
});

describe('scientific panel layout on phones (1.0.7)', () => {
  const base = readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');
  it('the keypad can shrink, so keys never run past the bottom edge', () => {
    expect(base).toMatch(/\.app\.is-sci \.keypad \{[^}]*grid-template-rows: repeat\(5, minmax\(30px, var\(--key-h\)\)\)/);
    expect(base).toMatch(/\.app\.is-sci \.pad-wrap \{[^}]*flex-shrink: 1/);
  });
  it('the display keeps its share instead of being squeezed', () => {
    expect(base).toMatch(/\.app\.is-sci \{ --disp-min: clamp\(96px, 18dvh, 210px\)/);
    expect(base).toMatch(/\.app\.is-sci \.stage \{ min-height: var\(--disp-min\); \}/);
  });
});

describe('scientific panel keeps the bottom row whole (1.0.8)', () => {
  const base = readFileSync(new URL('../src/styles/base.css', import.meta.url), 'utf8');
  it('the clipping panel has room for the keys\' 3D edge and shadows, without moving the layout', () => {
    const rule = base.match(/\.sci > div \{[^}]*\}/)[0];
    expect(rule).toMatch(/overflow: hidden/);
    expect(rule).toMatch(/padding: 3px 8px 10px; margin: -3px -8px -10px;/);
  });
});
