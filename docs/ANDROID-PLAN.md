# Bouncy Calculator for Android: build plan

**Goal:** a Google Play–ready app that is the whole web version, unchanged, running offline, and that also feels native: system bars match the theme, real haptics, back gesture, links open outside the app.

## 1. Architecture

```
web source (src/, index.html)  ──vite build --mode android──▶  android/app/src/main/assets/www/
                                                                  │
MainActivity (Java, ~250 lines) ── WebViewAssetLoader ────────────┘
   https://appassets.androidplatform.net/assets/www/index.html
```

- **One codebase.** The app is the same Vite build as calcraft-rho.vercel.app, built in an `android` mode. Every theme, game, tool and the loading screen come across unchanged.
- **WebViewAssetLoader, not `file://`.** Pages get a real `https://` origin, so localStorage, ES modules and the clipboard work. File access stays **off**.
- **Plain `Activity` in Java.** No AppCompat, Kotlin or Material. That keeps the APK small and avoids the AppCompat theme crash the old v4 wrapper had. The only library is `androidx.webkit`.

## 2. Security model (the WebView replaces Vercel's headers)

| Risk inside an app | Control |
|---|---|
| No HTTP headers, so no CSP | CSP injected as a `<meta>` at build time: `default-src 'self'`, inline script allowed only by its hash, `connect-src 'self'`, no `unsafe-*` |
| WebView navigating to a remote site (with the JS bridge attached) | Only `appassets.androidplatform.net` loads in the WebView. Every other URL (privacy, terms, studio site) opens in the user's browser, and `mailto:` opens their mail app |
| JS bridge abuse | The bridge exposes only `haptic(kind)`, `copy(text)` and `setBars(color, dark)`: no file, network or intent access. Input lengths and formats are checked natively |
| Network | **No INTERNET permission.** The app physically cannot send data, so the Play "No data collected" label is true |
| Local files | `allowFileAccess=false`, `allowContentAccess=false`, no mixed content, Safe Browsing left on, WebView debugging only in debug builds |
| Service worker | Not registered in the app (assets are already local) |
| Permissions | **None.** Haptics use `View.performHapticFeedback`, which needs no VIBRATE permission |
| Code | R8 minify and resource shrinking; release build is not debuggable |

## 3. Native polish

- **Edge-to-edge** (required at target SDK 35+). Content is padded by the system-bar and cutout insets, and the bar colour follows the active theme through the bridge.
- **Back gesture / button:** closes the theme sheet or palette, then the history sheet, then the game, then returns to Calc. Only at the calculator does it leave the app. Supports Android 16 predictive back (`OnBackInvokedCallback`).
- **Haptics:** distinct feedback for digit, operator, equals and error.
- **Copy** goes through the system clipboard.
- **Splash:** the system splash uses the app icon on the Braun paper colour, then hands off to the in-app loading screen.
- **Adaptive icon** with a monochrome layer for Android 13 themed icons.
- Portrait and landscape both work; state survives rotation (config changes are handled, so there's no reload).

## 4. Google Play requirements

| Requirement | Status |
|---|---|
| Target API 36 (required since 31 Aug 2026) | `targetSdk 36`, `compileSdk 36`, `minSdk 24` (Android 7+, ~99% of devices) |
| Android App Bundle | `app-release.aab`, signed with an upload key |
| Play App Signing | Google holds the app-signing key; you keep the upload key (resettable via Play support if lost) |
| 64-bit | No native code, so nothing to do |
| Privacy policy URL | https://www.simplymadestudio.net/privacy#bouncy-calculator |
| Data safety | No data collected, no data shared, no network access |
| Store assets | 512×512 icon, 1024×500 feature graphic, phone screenshots |

**Package name:** `net.simplymadestudio.bouncycalculator`, matching your studio domain. **This can't be changed after the first upload.** If the old `com.bouncy.calculator` build was already uploaded to your Play Console, say so and I'll switch back to it.

**Version:** `versionName 5.1.0` (same as the web), `versionCode 1`.

## 5. Build and verification

1. Build the web app in `android` mode and run all 124 tests.
2. Build with Gradle 8.13 / AGP 8.11 / build-tools 36 / JDK 21 in a clean Linux sandbox.
3. Sign with a new upload key (RSA 4096, 30-year validity).
4. Verify:
   - `apksigner verify`;
   - `aapt2 dump badging`: package, SDK levels, **zero permissions**;
   - `bundletool validate`;
   - the release build is not debuggable.
5. Run the packaged `www/` in a phone-sized browser with the meta CSP and check for zero CSP violations, zero errors, every theme rendered, and the games working.

## 6. Deliverables (saved to `C:\Working Projects\CalculatorWeb`)

- `android/`: the Gradle project (open in Android Studio to rebuild).
- `release/BouncyCalculator-5.1.0.aab`: **upload this to Play**.
- `release/BouncyCalculator-5.1.0.apk`: signed APK to install on your own phone for testing.
- `release/store/`: icon, feature graphic, screenshots, listing text.
- `.signing/`: upload keystore and passwords. **Git-ignored. Back it up somewhere safe.**
