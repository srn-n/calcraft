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
