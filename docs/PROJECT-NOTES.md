# Project notes (long-term memory)

Quick reference for anyone (or any AI session) picking this project up. Keep it current.
The full hand-off file is **`AGENTS.md`** at the repo root (Codex and Claude both read it).

**Rule:** every update ships with a Markdown record:
- App releases get `docs/releases/<version>.md`, written from `docs/releases/_TEMPLATE.md`.
- Anything else gets `docs/changes/YYYY-MM-DD-<topic>.md`.
- Each update also refreshes `AGENTS.md` §9 and §10.

## Identity
- App: **Bouncy Calculator**, by **Simply Made Studio**. No personal credits in the app.
- Web: https://calcraft-rho.vercel.app/ (Vercel, auto-deploys on push to `main`).
- Repo: `srn-n/calcraft`. Local: `C:\Working Projects\CalculatorWeb`. Samiur commits and pushes himself.
- Feedback email in the app: samiiiur@yahoo.com. Privacy/terms: https://www.simplymadestudio.net/privacy
  and /terms (`#bouncy-calculator`).

## Android
- Play package (permanent): **`com.simplymadestudio.bouncycalculator`**. The Java namespace stays
  `net.simplymadestudio.bouncycalculator` (internal only).
- Version lives in `android/app/build.gradle`. Raise `versionCode` on every Play upload (currently
  **10 = 1.0.5**).
- WebView wrapper, assets served from `https://appassets.androidplatform.net/assets/www/`.
  - Only permission: **VIBRATE**. No INTERNET permission.
  - JS bridge `window.BouncyNative`: `haptic("kind:level")`, `copy`, `paste`, `setBars`,
    `setCanGoBack`, `ready`, `insets`, `soundAllowed`.
- Build: GitHub Actions `.github/workflows/android.yml` builds an unsigned AAB and APK on every push.
  Artifact "bouncy-calculator-android".
- Signing: the upload key is `CalculatorWeb\.signing\upload.jks` plus `keystore.properties`
  (git-ignored). **Back it up.** Sign the AAB with `jarsigner`, the APK with `apksigner.jar` from the
  artifact.
- Signed outputs go to **`C:\Working Projects\CalculatorApp`** (AAB for Play, APK for phones, store
  assets, `PLAY-STORE-UPLOAD.md`).
- Play Console: personal account, so a closed test is needed (12+ testers for 14 days) before
  Production. Tester Google Group: `testingteamsms@googlegroups.com`. Data safety: no data collected
  or shared.

## Web app essentials
- Vite + vanilla ES modules. `npm test` runs vitest. `npm run build` / `npm run build:android` also run
  the CSP check.
- The strict CSP is in `vercel.json`. The inline theme script in `index.html` is allowed by its SHA-256
  hash: if you edit that script, update the hash (the tests print it).
- All saved data is validated on load (`src/core/schema.js`). Keep that pattern for new features.
- 28 themes (`src/themes.js` + `src/styles/themes.css`), each with its own synthesised sound
  (`src/fx/sound.js`). Five are **Exclusive** (Nova, Kage, Weaver, Starla, Mochi), with original characters drawn as SVG in
  `src/ui/theme-art.js`. `tests/themes.test.js` keeps every theme complete.
- Exclusive themes also have a full signature sound set (`src/fx/signature.js`: digits play notes,
  plus op/AC/=/error sounds and a theme jingle) and a living character (`src/ui/buddy.js`: reacts
  to keys, celebrates =, idles after 12 s). The = key character is a `::before` so it can move.
- Theme switching (`applyTheme` in `src/ui/themes-ui.js`) uses a colour burst from the tap that hides
  the restyle, then a bounce. No full-page View Transition.
- Removed themes go in `RENAMED` (`src/themes.js`), so saved choices migrate instead of resetting.
- The ☰ menu (`#menuSheet`) holds the settings, feedback and legal sections. The palette button
  (`#themeSheet`) holds only themes.

## Gotchas learned the hard way
- On phones, `.app` (the device body) fills the screen. Never fade `.app` itself, and paint
  full-screen overlays with the body's colour, or themes "blink".
- A horizontally scrollable row inside a flex column has no minimum height. Give children
  `flex-shrink: 0`, or it collapses (the Tools tabs bug in 1.0.1).
- `element.replaceChildren(null)` prints the text "null". Filter falsy children first.
- Avoid native `<select>` and `<input type=date>`: Android shows plain system dialogs. Use
  `src/ui/picker.js`.
- In the Android app, clipboard, haptics and sound mode go through the bridge. Web APIs for these are
  no-ops in WebView.

- Never use third-party characters or brands (Marvel, Disney, Mattel and so on) in themes or store
  assets. Play rejects or pulls them; use original characters instead.

- Don't hide UI controls with container queries on short displays. Shrink them instead (the
  DEG/RAD and Paste chips vanished in scientific mode before 1.0.4).
- Never fade the app fully out when leaving: Android snapshots that moment for recent apps.
- A full-page View Transition plus 40 keys animating their colours made theme switching freeze for
  300 to 600 ms on phones (1.0.4). Swap themes under a cover with transitions suspended, and
  animate only transform, opacity and clip-path.

## Release log
- 1.0.0 (code 5): first closed-test build.
- 1.0.1 (code 6): theme sounds, vibration levels, themed dropdowns, in-app licences, splash, theme-switch
  and Tools-tab fixes.
- 1.0.2 (code 7): theme blink fix, sound follows sound mode, paste button, Bills tracker. See
  `docs/releases/1.0.2.md`.
- 1.0.3 (code 8): Solar LCD replaced by Neon Tokyo; 4 Exclusive character themes (28 total); ☰ menu
  holds the settings; faster Bills taps. See `docs/releases/1.0.3.md`.
- 1.0.4 (code 9): chips always visible (they were hidden on short displays); Exclusive badge moved
  to the card corner; Neon Tokyo replaced by Night Weaver (Exclusive); no blank recents snapshot;
  typing comfort (`src/ui/typing.js`). See `docs/releases/1.0.4.md`.
- 1.0.5 (code 10): smooth, bouncy theme switching (burst + bounce, no view transition); Exclusive
  signature sound sets; living characters that react, celebrate and idle. See `docs/releases/1.0.5.md`.
