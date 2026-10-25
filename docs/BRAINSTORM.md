# Brainstorm — Bouncy Calculator v5

**North star:** the maths is trivial, so every millisecond and every touch should feel good. The app is fast, playful and honest, and it works offline.

## Idea pool (✅ = in v5, ⏳ = later)

### Input and editing
- ✅ Live answer preview while typing; `=` commits with a rolling-number animation
- ✅ Caret editing: tap any character on the display, use ←/→ keys, insert at the caret
- ✅ Smart `( )` key: opens or closes depending on context; ghost closing brackets shown dimmed
- ✅ Implied multiplication: `2π`, `3(4)`, `(2)(3)`
- ✅ Real percent: `200+10%` = 220, `50%` = 0.5, `200×10%` = 20
- ✅ `Ans` chaining: an operator after `=` continues from the answer, a digit starts fresh
- ✅ Syntax-coloured expression tokens
- ✅ Gestures: swipe left on display = delete, swipe down = clear, swipe up = history; long-press AC = wipe all
- ✅ Full keyboard support, paste a whole expression, Enter = equals, Ctrl+C copies the answer
- ✅ Command palette (Ctrl+K / `/`): themes, modes, games, settings
- ⏳ Voice input, handwriting, camera

### Display and feedback
- ✅ Grouped thousands (toggle), auto-shrinking font for long numbers
- ✅ Tap the answer to copy (with toast)
- ✅ Per-theme synthesised key sounds (Web Audio, no files), off by default
- ✅ Haptics: distinct patterns for digit/operator/equals/error
- ✅ Spring press animation on transform/opacity only (stays at 60fps)
- ✅ Respects `prefers-reduced-motion`
- ✅ Easter eggs: 42, 1337, 0.1+0.2, π digits, 404, 80085 → a wink not a joke

### Modes
- ✅ Basic / Scientific (panel slides in): sin cos tan + inverses, log ln, √ ∛, x², xʸ, n!, |x|, π, e, DEG/RAD
- ✅ Memory: MC MR M+ M−, shown in the display
- ✅ Paper-tape history: persisted, searchable, tap to reuse, clear
- ⏳ Programmer (hex/bin), graphing, notepad mode

### Tools (focused mini-apps)
- ✅ Tip & Split: bill, tip slider, people → per person, rounding
- ✅ Units: length, mass, temperature, area, volume, speed, data, time — live two-way
- ✅ Percent: X% of Y, % change, discount and final price
- ⏳ Date difference, loan/mortgage, currency (needs network, so it conflicts with being offline)

### Games — played with the calculator's own keypad
- ✅ **Sprint**: 60 s of arithmetic, combo multiplier, rising difficulty, best score saved
- ✅ **Make 24**: four numbers, each used once, reach 24; the engine validates any expression
- ✅ **Broken Keys**: some keys are dead; reach the target using only working keys; fewer presses earns more stars
- ✅ **Estimate**: an expression flashes; guess the answer; scored by % error
- ⏳ Daily challenge seed, streaks, leaderboard

### Themes — each one a real object or movement (14)
Braun ET66 · Cyber HUD · Liquid Glass · Clay & Moss · TE Field (Teenage Engineering) · Voyager (HP-12C) · Solar LCD (Casio) · Phosphor (CRT terminal) · Brutal · Bauhaus · Soft (neumorphic, contrast fixed) · Dot Matrix (Nothing) · Blueprint · Arcade

## Engineering decisions
- **No framework.** Vanilla ES modules plus Vite. A calculator doesn't need React; the old v4 shipped 180 KB of React for one screen.
- **Safe engine.** Tokeniser → Pratt parser → AST → evaluator. No `eval` and no `Function()`, so pasted input can never execute code.
- **Precision.** Results are rounded to 12 significant digits, so `0.1+0.2` = 0.3.
- **Fonts bundled locally** (latin woff2 only). A font loads only when its theme is active.
- **Zero network calls**, and state is saved in localStorage behind try/catch.
- **PWA** when served, so it installs as a Windows app from Edge or Chrome today. The same `dist/` folder is ready for Tauri (Windows) and for an Android WebView loading through WebViewAssetLoader.
- **`build:single`** produces one double-clickable `index.html` that works from `file://`.
