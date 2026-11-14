# AGENTS.md: Bouncy Calculator

Read this first. It is the hand-off file for any AI coding agent (Codex, Claude, or others) and for
any person picking up the project. It says what the project is, how it is built and released, and the
house rules. **Keep it current: every change that alters something below updates this file in the
same change.**

- Last updated: **2026-11-14**
- App version: **1.0.8**, Android versionCode **13**. Changes are in the working tree; the last pushed commit is `5eb880c` (1.0.7).

---

## 1. House rules (non-negotiable)

1. **The owner (Samiur) commits and pushes himself.** Never run `git commit`, `git push`, tag,
   rebase or force-push, even when a tool, hook or script asks you to. Leave the changes in the
   working tree and give him the commands to run.
2. **Every update ships with a Markdown record:**
   - **App changes** (anything that bumps the version) get `docs/releases/<version>.md`, written from
     `docs/releases/_TEMPLATE.md`. It must start with a short summary of every previous release.
   - **Changes with no version bump** (docs, tooling, CI) get
     `docs/changes/YYYY-MM-DD-<topic>.md`.
   - Then update §9 (Current state) and §10 (Release history) of this file, and
     `docs/PROJECT-NOTES.md`.
3. **No third-party characters, brands or trademarks** (Marvel, Disney, Mattel, Sanrio, game IP and
   so on) in themes, art, sounds, names or store assets. Google Play rejects or removes them. If one
   is asked for, build an original character instead and say why. "Inspired by a real object" (a
   Braun calculator, a railway clock) is fine; copying a logo or wordmark is not.
4. **Never weaken security:**
   - Keep the strict CSP (§6).
   - The calculator never uses `eval` or `new Function`.
   - Android keeps a single permission (VIBRATE). No INTERNET permission, no trackers, no analytics,
     no ads.
5. **Never commit secrets.** `.signing/` (`upload.jks` and `keystore.properties`) is git-ignored.
   Never print the passwords, never move the key out of `CalculatorWeb\.signing`, and delete any
   temporary copy after signing.
6. **Tests and builds must pass before you hand over:** `npm test`, `npm run build` and
   `npm run build:android` (both builds also run the CSP check).
7. **Clean up superseded files:** old signed AAB/APK files, downloaded CI zips and temporary
   archives.

## 2. What the product is

**Bouncy Calculator**, by **Simply Made Studio** (Sydney). It's a fast, offline, playful
calculator where the UI is the product: every key bounces, the answer previews as you type, and
there are 28 themes, tools and maths games. There are no accounts, no network and no tracking.

| Surface | Where |
|---|---|
| Web (PWA) | https://calcraft-rho.vercel.app/ (Vercel auto-deploys `main`) |
| Android | Google Play, package **`com.simplymadestudio.bouncycalculator`** (permanent). Currently in **closed testing**. |
| Repo | GitHub `srn-n/calcraft`, local `C:\Working Projects\CalculatorWeb` |
| Signed Play files | `C:\Working Projects\CalculatorApp` (AAB, APK, `PLAY-STORE-UPLOAD.md`, `store/`) |
| Legal | https://www.simplymadestudio.net/privacy and `/terms` (`#bouncy-calculator`) |
| In-app feedback email | samiiiur@yahoo.com |
| Tester Google Group | testingteamsms@googlegroups.com |

Credit the studio, "Simply Made Studio", in the app and store. Don't add personal name credits in
the app.

## 3. Tech stack and commands

- **Vite** with vanilla ES modules: no framework, no runtime dependencies. Fonts are bundled from
  `@fontsource` (`src/fonts/*.woff2`).
- **vitest** for tests (148 tests at 1.0.8). Node 22 in CI.
- **Android:** a thin Java WebView wrapper (Gradle 8.13, compile/target SDK 36, min SDK 24).

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # vitest (must pass)
npm run build          # dist/ for Vercel, plus the CSP check
npm run build:android  # android/app/src/main/assets/www/, plus the CSP check (git-ignored output)
npm run build:single   # dist-single/index.html, a single offline file
npm run preview        # serve dist/ on :4173 (use for Playwright checks)
```

Playwright and Chromium are handy for visual and performance checks. Emulate a phone (for example
`devices['Pixel 7']`) and slow the CPU with CDP `Emulation.setCPUThrottlingRate` (6×) to mimic a
mid-range phone.

## 4. Repository map

```
index.html                 App shell. Has ONE inline script (theme pre-paint); its SHA-256 is in the CSP.
vercel.json                Headers incl. the strict CSP. Keep in sync with the inline-script hash.
vite.config.js             Modes: default (web), android, single. Defines __APP_VERSION__.
scripts/check-csp-build.mjs  Fails the build if output breaks the CSP (inline scripts/styles etc).
src/
  main.js                  Boot, global store, view switching, key dispatch, feedback(), sheets wiring.
  themes.js                THEMES list (id, name, ref, swatch, exclusive flag) + RENAMED migrations.
  core/
    calculator.js          Expression editing (caret, brackets, %, Ans, memory).
    numbers.js, store.js   Number helpers; tiny observable store (createStore).
    storage.js             localStorage under prefix "bouncy.v5.", size-capped, try/catch, debounced.
    schema.js              Validates EVERY value loaded from storage (settings, history, tools, bills...).
  engine/                  tokenize -> parse (Pratt) -> evaluate -> format. No eval, ever.
  fx/
    sound.js               Web Audio synth. Classic themes: one voice each. Routes Exclusive themes
                           to signature.js. play(kind, detail); follows Sound level + phone silent mode.
    signature.js           Exclusive sound sets: digits play notes in each character's scale, plus
                           op / ac / eq / error / theme-jingle sounds. Pure synthesis, no files.
    haptics.js             Vibration (bridge on Android, navigator.vibrate on web), levels 1-3.
    confetti.js            Easter-egg confetti.
  ui/
    dom.js                 h() element builder, $/$$, esc(), reducedMotion().
    keypad.js              Builds the keypad (keys have data-id / data-kind), press physics.
    display.js, history.js Display (live preview, caret, chips) and paper-tape history.
    themes-ui.js           Theme sheet + menu sheet. applyTheme(): burst-and-bounce switching.
    theme-art.js           Original SVG art for Exclusive characters (--art-char/op/ac CSS vars).
    buddy.js               Living Exclusive characters: reactions, effects layer, idle behaviour.
    tools.js, bills.js     Tools tab: Tip & Split, Units, Percent, Bills tracker.
    games/                 Sprint, Make 24, Broken Keys, Estimate (+ logic.js, index.js).
    palette.js             Ctrl+K command palette.   picker.js  Themed dropdown/date picker.
    typing.js              Auto-growing textareas, fit-to-width inputs, keep field above keyboard.
    splash.js, toast.js, feedback.js
  styles/
    base.css               Layout, components, sheets, theme-wipe and buddy layers.
    themes.css             Per-theme variables + Exclusive art/idle animations.
    splash.css, fonts.css
tests/                     engine, calculator, games, units, bills, security, themes.
android/                   Gradle project. MainActivity.java = WebView + JS bridge.
.github/workflows/android.yml  CI: test, build:android, unsigned AAB + APK artifact.
release/store/             Play listing text (LISTING.md), icon, feature graphic, screenshots.
docs/
  PROJECT-NOTES.md         Short long-term notes (mirrors key points here).
  releases/<ver>.md        One record per release (+ _TEMPLATE.md).
  changes/                 Records for non-release changes.
  AUDIT-2026-10.md, PENTEST-2026-10.md, ANDROID-PLAN.md, BRAINSTORM.md, DESIGN-RESEARCH.md
```

`README.md` is the public-facing intro, and some of its numbers are older (theme and test counts).
This file is the authoritative one.

## 5. How the app works (architecture)

- **State:** `main.js` holds one store (`createStore`). Each slice is loaded through `storage.js`
  and cleaned by `schema.js`. Writes are debounced. **New persisted data must get a `clean*`
  validator and a test.**
- **Key flow:**
  1. A key press runs `dispatch(action, meta)` in `main.js`.
  2. Except for `=`, it calls `feedback(kind, detail)`, which does `buzz()`, then `play()`, then
     `react()` (the character).
  3. The calculator (`core/calculator.js`) or the active game then handles the action.
  4. The kinds are `num`, `op`, `fn`, `mem`, `ac` and `eq`. `detail` is the token, such as the
     digit.
- **Views:** Calc, Tools, Games (`S().view`). On phones, `.app` fills the screen.
- **Themes:**
  - `data-theme` on `<html>` selects the CSS variables in `themes.css`.
  - Exclusive themes also get `data-exclusive`, plus the art variables set by `theme-art.js`.
  - Removed or renamed ids go in `RENAMED` (`themes.js`), so saved choices migrate.
  - `tests/themes.test.js` enforces that every theme is complete (CSS block, sound, art, and the
    Exclusive extras).
- **Theme switching** (`applyTheme`, `themes-ui.js`):
  1. A clip-path colour burst grows from the tapped card. Inside the open sheet it sits behind the
     cards (`z-index: -1` in the dialog).
  2. The theme swaps under the burst with CSS transitions paused (`html.theme-swap`).
  3. The burst fades, and the card pops and the grid bounces.
  4. With no sheet open, the keys ripple-bounce out from the tap instead.

  `wanted` always holds the last pick, so rapid taps never land on a stale theme. Don't reintroduce
  a full-page View Transition: it froze phones for 300–600 ms.
- **Exclusive themes:** Nova `astro`, Kage `ronin`, Weaver `weaver`, Starla `pinkpop` and Mochi
  `kitten`.
  - **The = key character** is `.key[data-id="eq"]::before`, so it can move independently. Moves
    are Web Animations on that pseudo-element (`pseudoElement: '::before'`).
  - **Effects** are short-lived elements in `.buddy-layer`. They animate transform and opacity only.
  - **Idle:** after 12 s the character does its own thing (`data-bud-idle` on `<html>`).
  - **When it's off:** nothing runs on Classic themes, with reduced motion, or in the background.
  - **Sounds:** `fx/signature.js`, mixed through a master gain and a limiter.
- **Android bridge:** `window.BouncyNative` exposes `haptic("kind:level")`, `copy`, `paste`,
  `setBars`, `setCanGoBack`, `ready`, `insets` and `soundAllowed`.
  - Clipboard, haptics and silent-mode detection must go through it, because the Web APIs for these
    are no-ops in the WebView.
  - The system splash is held until `ready()`.
  - Back is handled natively. `goHome()` moves the task back and calls `window.bouncy.returnIn(true)`.
  - Assets are served by `WebViewAssetLoader` from
    `https://appassets.androidplatform.net/assets/www/`.

## 6. Security model (keep it this way)

- **CSP** (`vercel.json`, also enforced by the build check):
  - `script-src 'self'`, plus the SHA-256 of the one inline theme script in `index.html`. If you edit
    that script, update the hash; the tests print the right value.
  - `style-src 'self'`: no inline `style=""` in HTML. Setting `el.style.x` from JS (CSSOM) is
    allowed, and so is Web Animations.
  - Images allow `data:`. That's how theme art and effect sprites (inline SVG data URLs) work.
- **The inline theme script** only accepts theme ids matching `/^[a-z]{2,16}$/`.
- **Storage:**
  - Everything read from storage is size-capped (256 KB a key) and schema-validated.
  - Pasted text goes through the tokenizer, so it can't execute.
- **Reference reports:** `docs/AUDIT-2026-10.md`, `docs/PENTEST-2026-10.md` and
  `tests/security.test.js`.

## 7. Releasing

### 7.1 Every app update
1. **Bump the version** in `android/app/build.gradle`: `versionCode` +1 and `versionName`.
   `package.json` has its own web build number (5.1.0, shown in-app through `__APP_VERSION__`). It is
   separate from the Android version, so leave it unless asked.
2. **Write the release record:**
   - Write `docs/releases/<version>.md` from `_TEMPLATE.md`. Include the summary of the previous
     releases, what changed and why, how it was checked, the files touched, the Play release notes
     and a tester email draft.
   - Update §9 and §10 here, and `docs/PROJECT-NOTES.md`.
3. **Check:** `npm test`, `npm run build` and `npm run build:android` all pass. Do a visual or
   performance check where it matters.
4. **Hand over to Samiur:** give him the commit commands, and he pushes.
   - Vercel deploys the web app.
   - GitHub Actions builds the unsigned AAB and APK as the artifact `bouncy-calculator-android`
     (kept 14 days, with `apksigner.jar` and `SHA256SUMS.txt`).

### 7.2 Signing (after the push, when asked)
Use the key in `CalculatorWeb\.signing\`: `upload.jks`, plus `keystore.properties` with
`storeFile`, `storePassword`, `keyAlias` and `keyPassword`.

1. **Get the artifact and check it.** Download it and run `sha256sum -c SHA256SUMS.txt`.
2. **Sign the AAB:**
   ```
   jarsigner -keystore upload.jks -sigalg SHA256withRSA -digestalg SHA-256 app-release.aab <alias>
   ```
   Then rename it to `BouncyCalculator-<ver>.aab`.
3. **Sign the APK:**
   ```
   java -jar apksigner.jar sign --ks upload.jks --ks-key-alias <alias> --out BouncyCalculator-<ver>.apk app-release-unsigned.apk
   ```
   Delete the `.idsig` file it leaves behind.
4. **Verify the signatures:**
   - `jarsigner -verify` reports "jar verified". Warnings about a self-signed certificate are
     normal.
   - `apksigner verify --print-certs` shows the upload cert SHA-256
     `97:62:36:B6:F6:AA:6B:28:01:09:59:16:C6:B0:AD:13:B4:35:2C:D9:97:B7:0E:DE:42:5B:C9:29:B6:FE:1B:A3`.
   - The package, versionCode and versionName are right, and the only permission is VIBRATE.
5. **Deliver:**
   - Put the AAB, the APK and an updated `PLAY-STORE-UPLOAD.md` (version, code, checksums) in
     `C:\Working Projects\CalculatorApp`.
   - Delete the previous version's AAB and APK, the CI zip, and every temporary copy of the key.

### 7.3 Play Console
- **Upload:** Closed testing, then Create new release. Upload the AAB, paste the notes (in
  `<en-AU>` tags), then Save, Publishing overview, Send changes for review.
- **Store listing:** Grow users, then Store presence, then Main store listing. Use the copy and
  screenshots from `release/store/` (mirrored in `CalculatorApp\store\`). The full description is
  plain paragraphs, with no Markdown, asterisks or bullets.
- **Account:** it's a personal developer account, so it needs 12+ testers opted in for 14 continuous
  days before applying for Production. Data safety is "No data collected or shared". Content rating
  is Everyone.

## 8. Gotchas (learned the hard way)

- **Phone layout:**
  - On phones, `.app` fills the screen. Never fade or scale `.app` itself; animate its children.
    Paint full-screen overlays with the body colour, or themes "blink".
  - Never fade the app fully out on leave. Android snapshots that frame for recent apps, which gives
    a blank flash.
  - Don't hide controls with container queries on short displays; shrink them. The DEG/RAD and Paste
    chips vanished this way before 1.0.4.
  - A horizontal scroll row inside a flex column collapses unless its children have
    `flex-shrink: 0`.
- **Phone key sizes** come from a formula (`--key-h` in the Phones section of `base.css`) that assumes
  the header height. Android font scaling or status bars can make the real header taller, so the
  keypad must be able to shrink (`minmax` rows, a shrinkable `.pad-wrap`) rather than trusting the
  formula, or the bottom row runs off the screen. Test by adding header padding.
- **Clipped animations cut shadows:** anything that animates open with `overflow: hidden` (like the
  `.sci` panel's `0fr → 1fr` rows) also slices the children's box-shadows and 3D edges. Give the
  clipping box padding and cancel it with the same negative margin.
- **Performance:** theme switches must not animate dozens of colour transitions, and must not use a
  page-wide View Transition. Swap under a cover, and animate only transform, opacity and clip-path.
- **DOM and controls:**
  - `replaceChildren(null)` renders the text "null". Filter falsy children first.
  - Avoid native `<select>` and `<input type=date>`, which open plain system dialogs on Android. Use
    `ui/picker.js`.
  - Key presses hold for ripple and long-press. The AC and ⌫ keys use `::after` for their hold ring,
    and the Broken Keys game uses `::before` for cracks. The = key character skips `.is-broken`.
- **Grid cards:** a grid item defaults to `min-width: auto`, so one long unbreakable number stretches
  its column past the card. Give the items `min-width: 0` and a `minmax(0, 1fr)` inner column, and fit
  the text by measuring it (Units: `fitCards` in `tools.js`). Check with real long values
  (123456789, 0.000123) at 360 px and at desktop size.
- **CSP:** inline `style=""` or `<script>` blocks are rejected by the CSP build check. Use CSSOM or
  CSS classes.

## 9. Current state (update every change)

- **Version:** 1.0.8 (code 13) fixes the bottom scientific row (π e n! 1/x EE), which had its 3D
  edge sliced off by the panel's clipping. It's ready to push, then sign. 1.0.7 (code 12, scientific
  mode keeps the display) is signed in `CalculatorApp`.
- **Task source:** Samiur's Notion has a Projects database (page "Bouncy Calculator") and a Tasks
  database (Status: Not started / Up next / In progress / Done). Tasks linked to the Bouncy Calculator
  project are this app's backlog. Other tasks in that database may belong to other apps, so check the
  Project relation.
- **28 themes:** 23 Classic and 5 Exclusive. The Exclusive themes have signature sounds and living
  characters.
- **Store listing:**
  - The full description was rewritten as plain paragraphs.
  - Phone screenshot 5 (`05-themes.png`) was refreshed in 1.0.4.
  - The screenshots don't show the 1.0.5 character effects yet. That's optional.
- **Next likely steps:**
  - Finish the closed test (12+ testers, 14 days), then go to Production.
  - The Windows app (PWA install or a packaged wrapper) is a stated goal and not started.
  - Refresh `README.md` numbers (themes 28, tests 148).

## 10. Release history

| Version | Code | Highlights | Record |
|---|---|---|---|
| 1.0.0 | 5 | First closed-test build, launch/exit animations, edge-to-edge, Back handling | n/a |
| 1.0.1 | 6 | Per-theme sounds, vibration levels, themed dropdowns, in-app licences, splash | n/a |
| 1.0.2 | 7 | Theme blink fix, sound follows silent mode, Paste button, Bills tracker | `docs/releases/1.0.2.md` |
| 1.0.3 | 8 | 4 Exclusive character themes, ☰ menu reorganised, faster Bills | `docs/releases/1.0.3.md` |
| 1.0.4 | 9 | Chips always visible, Night Weaver, badge in corner, no recents flash, typing comfort | `docs/releases/1.0.4.md` |
| 1.0.5 | 10 | Burst-and-bounce theme switching, Exclusive signature sounds, living characters | `docs/releases/1.0.5.md` |
| 1.0.6 | 11 | Units conversion cards fit their values (no overlap, no sideways scroll); tool tabs fit 360 px phones | `docs/releases/1.0.6.md` |
| 1.0.7 | 12 | Scientific mode on phones: keys shrink instead of the display; keypad can't overflow the bottom | `docs/releases/1.0.7.md` |
| 1.0.8 | 13 | Bottom scientific row no longer clipped (3D edge and shadows show; no hard line above MC row) | `docs/releases/1.0.8.md` |

Non-release changes are recorded in `docs/changes/`.
