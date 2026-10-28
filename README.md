# Bouncy Calculator v5 (web)

A fast, offline, deeply interactive calculator. The maths is simple, so the UI is the product.
It has 14 themes based on real objects, focused tools, and four games you play on the calculator's own keypad.

- **No framework**: vanilla ES modules plus Vite. About 23 KB of JS and 12 KB of CSS gzipped (the old v4 shipped 180 KB of React).
- **Safe engine**: tokeniser → Pratt parser → evaluator. No `eval` and no `Function()`, so pasted text can never run code.
- **Private**: zero network requests. Fonts are bundled, and state stays in localStorage on the device.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 with hot reload
npm test             # 96 unit tests (engine, editing, games, units)
npm run build        # dist/ — host anywhere; installable PWA, works offline
npm run build:single # dist-single/index.html — one file, double-click to open (file://)
```

**Install on Windows today:** run `npm run build && npm run preview`, open the page in Edge or Chrome, and click *Install app* in the address bar. It runs in its own window and works offline.

## Features

**Calculator**
- The answer previews live while you type. `=` rolls the result in.
- Caret editing: tap any character, or use ← →.
- Smart `( )` key; missing closing brackets are drawn as ghosts and auto-closed.
- Implied multiplication: `2π`, `3(4)`.
- Real percent: `200+10%` = 220.
- After `=`, an operator continues from the answer and a digit starts fresh.
- Scientific panel (fx) with sin/cos/tan and their inverses, ln, log, eˣ, 10ˣ, √, ∛, x², x³, xʸ, n!, 1/x, |x|, π, e, EE and Ans. DEG/RAD is always visible.
- Memory keys MC, MR, M+, M−.
- Gestures: swipe ← to delete, → to undo, ↓ to clear, ↑ to open the tape. Hold AC to wipe everything; hold ⌫ to repeat.
- Paper-tape history: saved, searchable, tap to reuse.
- Keyboard: digits and operators, Enter, Esc, `s c t l g r p e` for functions and constants, `d` for DEG/RAD, `f` for fx, `h` for the tape, Ctrl+Z/Y to undo/redo, Ctrl+C to copy, paste a whole expression.
- **Ctrl+K command palette**: switch theme or view, start a game, change settings. You can also type a sum straight into it.
- Per-theme synthesised key sounds (off by default), haptics, confetti easter eggs, and support for reduced motion.

**Tools**: Tip & Split · Unit converter (8 categories, two-way, all conversions at once) · Percent (X% of Y, what %, % change, discount).

**Games** (played with the real keypad):
- **Sprint**: 60 s of mental maths with a combo multiplier.
- **Make 24**: four numbers, + − × ÷ only; the engine checks your answer.
- **Broken Keys**: some keys are cracked; reach the target with the ones that still work, scored with par and stars.
- **Estimate**: 10 timed rounds; closer guesses score more.

**Themes**: Braun ET66 · Cyber HUD · Liquid Glass · Clay & Moss · TE Field · Voyager (HP-12C) · Solar LCD (Casio) · Phosphor (VT100) · Brutal · Bauhaus · Soft · Dot Matrix (Nothing) · Blueprint · Arcade.

## Structure

```
src/
  engine/      tokenize.js · parse.js · evaluate.js · format.js   (pure, tested)
  core/        calculator.js (editing rules) · store.js · storage.js
  ui/          keypad · display · history · themes-ui · palette · tools · games/
  fx/          haptics · sound (Web Audio) · confetti (pooled canvas)
  styles/      fonts.css · base.css · themes.css (one block per theme)
  themes.js    theme catalogue (name, reference, swatch, sound profile)
public/        manifest, service worker, icons
tests/         vitest suites
docs/          DESIGN-RESEARCH.md (100 references) · BRAINSTORM.md
```

**Adding a theme:** add an entry to `src/themes.js` and a `[data-theme="id"]` block of tokens to `themes.css`.

## Privacy, terms and licences

- The calculator makes no network requests. History, memory, theme, settings and game scores are saved in your browser's local storage and never leave your device.
- Privacy Policy: https://www.simplymadestudio.net/privacy#bouncy-calculator
- Terms of Use: https://www.simplymadestudio.net/terms#bouncy-calculator
- Both are linked at the bottom of the Themes sheet in the app.
- Every bundled font is used under the SIL Open Font License 1.1. The copyright notices and full licence text are in [`public/licenses.txt`](public/licenses.txt), which is also served with the app at `/licenses.txt`.

## Next steps (Windows / Android)

- **Windows app**: wrap `dist/` with Tauri 2 (`npm create tauri-app`, set `frontendDist` to `../dist`). Expect an installer of about 3–5 MB.
- **Android**: copy `dist/` into the app's `assets/`, load it with `WebViewAssetLoader` (an `https://appassets.androidplatform.net/` URL), use an AppCompat theme, remove the INTERNET permission, and target SDK 36. Haptics can call `window.BouncyNative.vibrate(ms)` if you expose a JS bridge.
