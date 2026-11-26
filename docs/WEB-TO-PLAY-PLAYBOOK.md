# From Web App to Google Play: the Bouncy Calculator playbook

How Bouncy Calculator goes from a Vite web app to a signed app on Google Play. It covers what was
built, who does what on every release, where the keys live, and the mistakes to avoid. The last
part is a checklist you can reuse for your other projects.

> **The short version:** the web app *is* the Android app. A small Java wrapper shows the built web
> files in a locked-down WebView. GitHub Actions builds an **unsigned** AAB and APK on every push.
> They're signed on your own machine with an upload key that **never enters git and never leaves
> `.signing/`**. The AAB goes to Play Console.

---

## 1. The pipeline at a glance

```
 You edit/ask ─► code changes in C:\Working Projects\CalculatorWeb (src/, android/, docs/)
                      │
 You: git push ───────┤
                      ├─► Vercel ─────────► web app live at calcraft-rho.vercel.app
                      │
                      └─► GitHub Actions (.github/workflows/android.yml)
                              npm ci → npm test → npm run build:android
                              gradle bundleRelease assembleRelease   (UNSIGNED)
                              artifact "bouncy-calculator-android":
                                app-release.aab, app-release-unsigned.apk,
                                apksigner.jar, SHA256SUMS.txt
                                      │
 Signing (local) ◄────────────────────┘
   check SHA256SUMS → jarsigner (AAB) → apksigner (APK) → verify
                                      │
                                      ▼
 C:\Working Projects\CalculatorApp\BouncyCalculator-<ver>.aab / .apk + PLAY-STORE-UPLOAD.md
                                      │
 You: Play Console → Closed testing → Create release → upload AAB → Send for review
```

## 2. Who did what

| Step | You | Claude |
|---|---|---|
| Decide what to build or fix (chat, Notion "Up next") | ✅ | |
| Write the code, tests, docs and release notes | | ✅ |
| Save the changed files into `C:\Working Projects\CalculatorWeb` | | ✅ |
| `git add -A`, `git commit`, `git push` | ✅ | (never) |
| Wait for CI, download the artifact | | ✅ |
| Check the checksums, sign the AAB and APK, verify them | | ✅ |
| Put the signed files and the upload notes in `CalculatorApp`, delete the old ones | | ✅ |
| Upload the AAB in Play Console and send it for review | ✅ | |
| Email testers (Claude drafts it) | ✅ | ✍️ |

You only ever do three things: push, upload and send.

## 3. The folder layout (the part that usually goes wrong)

```
C:\Working Projects\
├── CalculatorWeb\                  ← the git repo
│   ├── .signing\                   ← UPLOAD KEY LIVES HERE. Git-ignored. Never moves.
│   │   ├── upload.jks              ←   the keystore (one key, alias e.g. "upload")
│   │   └── keystore.properties     ←   storeFile / storePassword / keyAlias / keyPassword
│   ├── .gitignore                  ← contains: .signing/  *.jks  *.keystore
│   ├── android\                    ← Gradle project (open THIS folder in Android Studio)
│   │   └── app\build.gradle        ← reads ../.signing/keystore.properties if it exists
│   ├── src\  index.html  package.json  vite.config.js
│   └── .github\workflows\android.yml
└── CalculatorApp\                  ← NOT a repo. Only release outputs.
    ├── BouncyCalculator-1.0.8.aab  ← upload this to Play
    ├── BouncyCalculator-1.0.8.apk  ← install on your phone
    ├── PLAY-STORE-UPLOAD.md        ← version, checksums, cert fingerprint, upload steps
    └── store\                      ← listing text, icon, feature graphic, screenshots
```

### Why it's laid out this way
- **The key sits next to the repo, not inside `android/`.** In `android/app/build.gradle`,
  `rootProject.file('../.signing/keystore.properties')` resolves from `android/` (the root project)
  up one level to the repo root. Moving the key into `android/app/` or renaming the folder breaks
  signing without any error. Gradle just builds **unsigned**, because the code says "if the file
  exists, sign".
- **`.signing/` is git-ignored before the key is ever created.** If a `.jks` was ever committed,
  deleting it later doesn't help: it stays in git history. Treat it as leaked and ask Play support
  for an upload-key reset.
- **`storeFile` in `keystore.properties` is just a file name** (`storeFile=upload.jks`), relative to
  `.signing/`. That avoids Windows path problems (`C:\...` backslashes break Java properties
  files).
- **Release outputs live outside the repo** (`CalculatorApp`), so build files never end up in a
  commit and the repo stays clean.

### `keystore.properties` format
```properties
storeFile=upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_KEY_PASSWORD
```
No quotes, no spaces around `=`. If a password contains `\`, `:`, `=` or `#`, escape it (`\\`,
`\:`, and so on), or use a password without those characters.

### Back up the key
Copy both files in `.signing/` to a password manager or an offline drive. With **Play App Signing**,
Google holds the real *app signing key* and you only have the *upload key*. If you lose the upload
key, Play support can reset it, but that takes days. Without a backup you can't ship updates during
that time.

## 4. One-time setup (done once, at 1.0.0)

1. **Wrap the web app.** In `android/`, a single `MainActivity`:
   - **Serving the files:** a small loader in `MainActivity` (`AssetPaths`; `WebViewAssetLoader` until 1.1.1) serves the built site from
     `https://appassets.androidplatform.net/assets/www/`, with **no `file://` access**
     (`setAllowFileAccess(false)`, `setAllowContentAccess(false)`).
   - **Links:** links that leave the app open in the browser (`shouldOverrideUrlLoading`).
   - **Native features:** a small JavaScript bridge (`window.BouncyNative`) for the things a WebView
     can't do well: haptics, copy/paste, system bars, Back handling, insets, silent-mode check.
   - **Splash:** the splash screen is held until the web app calls `ready()`, so there's no blank
     flash.
   - **Permissions:** the manifest has **no INTERNET permission**, only `VIBRATE`. That made the
     Play "Data safety" form simply "No data collected or shared".
2. **Add the web build mode.** `vite.config.js` has an `android` mode that writes to
   `android/app/src/main/assets/www/` (git-ignored, rebuilt each time) and applies a strict CSP.
   Run it with `npm run build:android`.
3. **Pick the package name** `com.simplymadestudio.bouncycalculator`. **It's permanent on Play.**
   The Java `namespace` can differ (it's `net.simplymadestudio...`). Only `applicationId` matters
   to Play.
4. **Create the upload key, once:**
   ```
   cd "C:\Working Projects\CalculatorWeb"
   mkdir .signing
   keytool -genkeypair -v -keystore .signing\upload.jks -alias upload ^
           -keyalg RSA -keysize 2048 -validity 10000
   ```
   Then write `.signing\keystore.properties` (format above) and **back both files up**.
5. **Set up CI:** `.github/workflows/android.yml` (Node 22 → tests → `build:android` → JDK 21 →
   Android SDK 36 → Gradle 9.9 (AGP 9.5, since 1.1.2) → `bundleRelease assembleRelease` → artifact). It signs in CI only
   if repository secrets exist, and we deliberately don't set them, so **the key never touches
   GitHub**.
6. **Set up the Play Console account and app:**
   - Developer account: **personal**. Personal accounts must run a **closed test with 12 or more
     testers for 14 days in a row** before applying for Production.
   - Create the app, and enrol in **Play App Signing** (the default).
   - App content:
     - privacy policy URL (simplymadestudio.net/privacy)
     - ads: none
     - Data safety: none collected
     - content rating: Everyone
     - target audience
   - Store listing: name, short and full description (**plain paragraphs, no Markdown**), 512 px
     icon, 1024×500 feature graphic, phone screenshots, and 7" and 10" tablet screenshots.
   - Testers: one **Google Group** for all your apps (testingteamsms@googlegroups.com). Add it under
     Closed testing → Testers.

## 5. Every release (what happens after "pushed")

1. **Bump the version in the code change**, before you push. In `android/app/build.gradle`:
   - `versionCode` +1. It must always go up, and Play rejects a code it has seen before.
   - `versionName` is the human-readable "1.0.8".
2. **Push.** CI runs about 3–5 minutes. Check Actions → *Android release build* for a green tick.
3. **Download the artifact** `bouncy-calculator-android` (zip) from that run's page and unzip it.
4. **Check its integrity:** `sha256sum -c SHA256SUMS.txt`. Every line should say OK.
5. **Sign:**
   ```bash
   # AAB: this is what Play wants
   jarsigner -keystore .signing/upload.jks -sigalg SHA256withRSA -digestalg SHA-256 \
             app-release.aab upload
   mv app-release.aab BouncyCalculator-1.0.8.aab

   # APK: for installing on your own phone (apksigner.jar comes in the artifact)
   java -jar apksigner.jar sign --ks .signing/upload.jks --ks-key-alias upload \
        --out BouncyCalculator-1.0.8.apk app-release-unsigned.apk
   del BouncyCalculator-1.0.8.apk.idsig      # leftover file, not needed
   ```
   (Both ask for the passwords in `keystore.properties`.)
6. **Verify:**
   - `jarsigner -verify BouncyCalculator-1.0.8.aab` prints **"jar verified."** Warnings about a
     self-signed certificate are normal for upload keys.
   - `java -jar apksigner.jar verify --print-certs BouncyCalculator-1.0.8.apk` shows the upload
     certificate SHA-256 **`97:62:36:B6:…:1B:A3`**. It must be this same fingerprint every
     release, or Play rejects the upload.
   - Check that the package, versionCode and versionName are right and that the only permission is
     VIBRATE. Claude checks this with `androguard`; `aapt dump badging` works too.
7. **Deliver and clean up:**
   - Put the signed AAB and APK and an updated `PLAY-STORE-UPLOAD.md` (version and checksums) in
     `CalculatorApp\`.
   - Delete the previous version's AAB and APK, the downloaded zip, and any temporary copy of the
     key.
8. **Upload in Play Console:**
   - Closed testing → **Create new release** → upload the AAB → release notes in
     `<en-AU> … </en-AU>`.
   - **Save → Publishing overview → Send changes for review.**
   - A newer release on the same track replaces one still waiting for review.
9. **Email testers** once it's approved. The draft is in `docs/releases/<ver>.md`.

## 6. The paper trail (so any AI or person can carry on)

- **`AGENTS.md`** (repo root, **local only, git-ignored**): the full context, house rules and current
  state. Codex reads it automatically, and `CLAUDE.md` points to it. Neither is pushed to GitHub,
  because they hold local paths and workflow details. They're kept up to date on your PC.
- **`docs/releases/<version>.md`**: one per release, from `_TEMPLATE.md`. It has the previous
  releases in short, what changed and why, checks, files touched, Play notes and the tester email.
- **`docs/changes/YYYY-MM-DD-*.md`**: records for changes that don't bump the version.
- **`docs/PROJECT-NOTES.md`**: short long-term notes and gotchas.
- **`CalculatorApp\PLAY-STORE-UPLOAD.md`**: what's in the folder, checksums and upload steps.

## 7. Release history (so far)

| Version | Code | What |
|---|---|---|
| 1.0.0 | 5 | First closed-test build |
| 1.0.1 | 6 | Theme sounds, vibration levels, splash, licences |
| 1.0.2 | 7 | Theme blink fix, silent mode, Paste, Bills |
| 1.0.3 | 8 | 4 Exclusive character themes, ☰ menu |
| 1.0.4 | 9 | Chips always visible, Night Weaver, recents flash fix |
| 1.0.5 | 10 | Burst-and-bounce theme switching, signature sounds, living characters |
| 1.0.6 | 11 | Units cards fit their values |
| 1.0.7 | 12 | Scientific mode keeps the display |
| 1.0.8 | 13 | Bottom scientific row no longer clipped |
| 1.0.9 | 14 | Closed scientific panel shows nothing; agent files local-only |
| 1.1.0 | 15 | fx close no longer snaps; ☰ → Share app |
| 1.1.1 | 16 | Seamless opening: first-frame colour, mini calculator grows into the app, faster repeat launch (first Production release) |
| 1.1.2 | 17 | Play suggestions: EdgeToEdge.enable(), R8 obfuscation 36% → 88% (own asset loader), AGP 9.5 |

## 8. Where projects usually get stuck (and the fix)

| Symptom | Cause | Fix |
|---|---|---|
| Build "succeeds" but Play says the AAB **isn't signed** | Gradle couldn't find `keystore.properties`, so it built unsigned | Keep `.signing/` at the **repo root** and check the `rootProject.file('../.signing/…')` path; or sign by hand (step 5) |
| Play: **"uploaded with the wrong key"** | A different or new keystore was used | Use the original `upload.jks`, and check that the cert SHA-256 matches. If it's lost, Play Console → App integrity → *Request upload key reset* |
| `keytool error: Keystore was tampered with, or password was incorrect` | Wrong store password, or a special character not escaped in `.properties` | Retype it, or escape `\ : = #` |
| `Cannot recover key` / alias not found | Wrong `keyAlias` or key password | `keytool -list -v -keystore .signing/upload.jks` shows the alias |
| Key shows up in `git status` | `.signing/` was not in `.gitignore` when the key was created | Add it, `git rm --cached -r .signing`. If it was ever pushed, treat the key as leaked and reset it |
| Play: **"Version code already used"** | Forgot to bump `versionCode` | +1 in `build.gradle`, push again |
| APK won't install ("App not installed") | It's unsigned, or a debug build is already on the phone | Install the **signed** APK; uninstall the old debug build first |
| The app shows a white screen | `assets/www/` is empty or stale | `npm run build:android` before any local Gradle build (CI does this for you) |
| Gradle can't find the SDK locally | Missing `android/local.properties` | Open `android/` in Android Studio once; it writes `sdk.dir` |
| Target SDK warning from Play | Play requires a recent `targetSdk` every year | Raise `compileSdk`/`targetSdk`, and update the CI `platforms;android-XX` / `build-tools` |
| Clipboard, haptics or silent mode don't work in the app | WebView ignores those web APIs | Route them through the native bridge (`BouncyNative`) |

## 9. Reusing this for another project (checklist)

```
[ ] Pick the permanent package name: com.simplymadestudio.<app>
[ ] .gitignore BEFORE anything else:  .signing/  *.jks  *.keystore  android/app/src/main/assets/www/
[ ] Copy android/ from Bouncy; change applicationId, namespace, app_name, icons, Theme
[ ] Vite (or other) "android" build mode → android/app/src/main/assets/www/
[ ] Copy .github/workflows/android.yml; rename the artifact; keep it UNSIGNED (no secrets)
[ ] Create a NEW upload key per app in <repo>/.signing/ (keytool, step 4.4); back it up
[ ] Make <AppName>App\ next to the repo for signed outputs + store\ assets
[ ] Play Console: new app → Play App Signing → app content → listing → closed test (+ Google Group)
[ ] Add AGENTS.md (git-ignored, local only) + docs/releases/_TEMPLATE.md so any agent can carry on
[ ] First release: versionCode 1 (or continue), versionName 1.0.0 → push → sign → upload
```

**One key per app.** Don't reuse Bouncy's `upload.jks` for a different app. Store each app's
`.signing/` folder separately in your backup.
