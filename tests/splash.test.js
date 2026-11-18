import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Opening animation (1.1.1). These guard the three seams that were found frame by frame.
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const css = read('src/styles/splash.css');
const js = read('src/ui/splash.js');

describe('opening: first frame', () => {
  it('paints the splash in the calculator body colour from CSS, where the app fills the screen', () => {
    // A script repaint ~80 ms after the first frame blinked on every launch.
    expect(css).toMatch(/@media \(max-width: 559px\), \(max-height: 599px\) \{\s*\.splash::after \{[^}]*z-index: -1;[^}]*background: var\(--device\)/);
    expect(js).not.toMatch(/matchScreen|style\.background/);
  });
});

describe('opening: hand-off to the app', () => {
  it('drops the backdrop at once instead of fading the whole splash over the app (the empty dip)', () => {
    expect(css).toMatch(/\.splash\.is-leaving \{ background: none; pointer-events: none; \}/);
    expect(css).not.toMatch(/\.splash\.is-leaving \{ animation: splash-out[^}]*\d+ms forwards; pointer-events/);
  });

  it('grows the mini calculator into the real one and lets the keys arrive while it dissolves', () => {
    expect(js).toMatch(/function morphIntoApp/);
    expect(js).toMatch(/scale\(\$\{sx\}, \$\{sy\}\)/);
    // counter-scaled radius keeps the corners round while it stretches
    expect(js).toMatch(/borderRadius: `\$\{r1 \/ sx\}px \/ \$\{r1 \/ sy\}px`/);
    // the app starts arriving before the grown body has finished dissolving (MORPH_MS)
    const morphMs = Number(js.match(/const MORPH_MS = (\d+);/)[1]);
    const delays = [...css.matchAll(/html\.app-in-morph \.app(?: > \*)? \{ animation: app-in \d+ms [^)]+\) (\d+)ms both/g)].map((m) => Number(m[1]));
    expect(delays.length).toBeGreaterThan(0);
    for (const d of delays) expect(d).toBeLessThan(morphMs * 0.62);
  });

  it('never morphs under reduced motion, and the quick launch stays about a second', () => {
    expect(js).toMatch(/reduceMotion\(\)\) return false/);
    expect(js).toMatch(/const FULL_MS = QUICK \? 1000 :/);
  });

  it('keeps the quick-launch footer from reappearing as it leaves', () => {
    expect(css).toMatch(/\.splash\.is-quick\.is-leaving \.splash-legal \{ animation-duration: 110ms; animation-delay: 0ms; \}/);
  });
});

describe('opening: Android system splash', () => {
  it('uses the default calculator body colour, the colour the window hands over to', () => {
    const themes = read('android/app/src/main/res/values-v31/themes.xml');
    expect(themes).toMatch(/windowSplashScreenBackground">@color\/icon_bg</);
  });
});
