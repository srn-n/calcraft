# Bouncy Calculator v5 (web)

By **[Simply Made Studio](https://www.simplymadestudio.net)**, Sydney. Small software that asks for nothing and works beautifully.

A fast, offline, deeply interactive calculator. The maths is simple, so the UI is the product.
It has 24 themes based on real objects, focused tools, and four games you play on the calculator's own keypad.

- **No framework**: vanilla ES modules plus Vite. About 23 KB of JS and 12 KB of CSS gzipped (the old v4 shipped 180 KB of React).
- **Safe engine**: tokeniser → Pratt parser → evaluator. No `eval` and no `Function()`, so pasted text can never run code.
- **Private**: zero network requests. Fonts are bundled, and state stays in localStorage on the device.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 with hot reload
npm test             # 112 unit tests (engine, editing, games, units, security)
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
- Keyboard: digits and operators, Enter, Esc (AC), Delete (forward delete), `s c t l g r p e` for functions and constants, `d` for DEG/RAD, `f` for fx, `h` for the tape, Ctrl+Z/Y to undo/redo, Ctrl+C to copy, paste a whole expression.
- **Ctrl+K command palette**: switch theme or view, start a game, change settings. You can also type a sum straight into it.
- Per-theme synthesised key sounds (off by default), haptics, confetti easter eggs, and support for reduced motion.

**Tools**: Tip & Split · Unit converter (8 categories, two-way, all conversions at once) · Percent (X% of Y, what %, % change, discount).

**Games** (played with the real keypad):
- **Sprint**: 60 s of mental maths with a combo multiplier.
- **Make 24**: four numbers, + − × ÷ only; the engine checks your answer.
- **Broken Keys**: some keys are cracked; reach the target with the ones that still work, scored with par and stars.
- **Estimate**: 10 timed rounds; closer guesses score more.

**Themes**: Braun ET66 · Cyber HUD · Liquid Glass · Clay & Moss · TE Field · Voyager (HP-12C) · Solar LCD (Casio) · Phosphor (VT100) · Brutal · Bauhaus · Soft · Dot Matrix (Nothing) · Blueprint · Arcade · Valentine (Olivetti typewriter) · Station Clock (Swiss railway) · Darkroom (red safelight) · Risograph · Ledger · Tube Amp · Concrete (Barbican) · Washi & Sumi · Mission Control (Apollo DSKY) · Paperback.

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

**Adding a theme:** add an entry to `src/themes.js` (set `square: true` for square keys in the picker preview) and a `[data-theme="id"]` block of tokens to `themes.css`. Keep small text (`--muted`, `--display-muted`) at 4.5:1 contrast or better.

## Loading screen

The splash in `index.html` is styled entirely by the active theme (`src/styles/splash.css`): the Simply Made Studio mark bounces in, a mini keypad assembles using the theme's real key styles, the display counts to 100, then the keys drop away as the calculator rises in. It plays fully once per session (~1.3 s), is shorter on later reloads, becomes a plain fade with Reduce Motion, and hides itself after 6 s even if JavaScript fails.

## Phones

- Keys size themselves to the screen: the bottom row is never pushed under Safari's or Chrome's toolbar, from a 320×480 phone up to a Pro Max, in all 24 themes, with the fx panel open or closed.
- Short screens (and the fx panel or games on mid-size phones) fold the tabs into the icon row to give the keys more room.
- Landscape phones get a two-column layout: display and fx keys on the left, keypad on the right.
- No zoom-on-focus (all inputs ≥ 16px), no pull-to-refresh while swiping, no iOS long-press callout on keys, 44px+ touch targets, and no layout shift on load.
- Lighthouse mobile: Performance 99 · Accessibility 100 · Best Practices 100 · SEO 100.
- If you change spacing in a theme (display margins, extra row gaps), set `--chrome-extra` in that theme so the key-size formula accounts for it.

## Security

- `vercel.json` sends a strict Content-Security-Policy (no `unsafe-inline`, no `unsafe-eval`, no framing) plus `nosniff`, `Referrer-Policy` and `Permissions-Policy`.
- The one inline script in `index.html` (theme before first paint) is allowed by its SHA-256 hash. If you edit it, `npm test` fails and prints the new hash to paste into `vercel.json`.
- Everything read from localStorage is validated (`src/core/schema.js`), so corrupted storage can't crash the app.
- The dev server listens on localhost only. Use `npm run dev -- --host` to test on your phone, and only on a network you trust.
- See `docs/AUDIT-2026-10.md` for the full audit.

## Privacy, terms and licences

- **Feedback:** *Send feedback* (bottom of the Themes sheet, or “Send feedback” in Ctrl+K) opens the user's mail app with a draft to Simply Made Studio (samiiiur@yahoo.com, the studio's contact address), including the theme, screen size and browser so bugs are easy to reproduce. The user sees and can edit everything before sending. If no mail app is set up, the address is copied instead. Change it in `src/ui/feedback.js`.
- The calculator makes no network requests. History, memory, theme, settings and game scores are saved in your browser's local storage and never leave your device.
- Privacy Policy: https://www.simplymadestudio.net/privacy#bouncy-calculator
- Terms of Use: https://www.simplymadestudio.net/terms#bouncy-calculator
- Both are linked at the bottom of the Themes sheet in the app.
- Every bundled font is used under the SIL Open Font License 1.1. The copyright notices and full licence text are in [`public/licenses.txt`](public/licenses.txt), which is also served with the app at `/licenses.txt`.

## Next steps (Windows / Android)

- **Windows app**: wrap `dist/` with Tauri 2 (`npm create tauri-app`, set `frontendDist` to `../dist`). Expect an installer of about 3–5 MB.
- **Android**: copy `dist/` into the app's `assets/`, load it with `WebViewAssetLoader` (an `https://appassets.androidplatform.net/` URL), use an AppCompat theme, remove the INTERNET permission, and target SDK 36. Haptics can call `window.BouncyNative.vibrate(ms)` if you expose a JS bridge.
