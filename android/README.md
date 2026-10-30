# Bouncy Calculator: Android app

The Android app is the web app (built with `npm run build:android` into `app/src/main/assets/www/`) running in a locked-down WebView. See `docs/ANDROID-PLAN.md` for the design and security model.

## Build automatically (GitHub Actions)

Every push to `main` that changes the app runs `.github/workflows/android.yml`:

1. Tests, then builds the web app in Android mode.
2. Builds `app-release.aab` (for Play) and `app-release.apk` (for testing).
3. Uploads them as the **bouncy-calculator-android** artifact (Actions tab → latest run → Artifacts).

You can also run it by hand: Actions → *Android release build* → **Run workflow**.

**Signing.** CI signs only if these repository secrets exist:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_KEY_ALIAS`

Without them, CI produces unsigned files and you sign locally (below). Unsigned is the safer default: the key never leaves your machine.

## Sign locally

The upload key is in `../.signing/` (git-ignored, never commit it). Its password is in `../.signing/keystore.properties`.

```bash
# AAB (upload to Play)
jarsigner -keystore .signing/upload.jks -sigalg SHA256withRSA -digestalg SHA-256 app-release.aab upload

# APK (install on your phone)
java -jar apksigner.jar sign --ks .signing/upload.jks --ks-key-alias upload --out BouncyCalculator.apk app-release-unsigned.apk
```

## Build on your PC (Android Studio)

Open the `android/` folder in Android Studio. First run `npm install` and `npm run build:android` in the project root to fill `assets/www/`. Then use **Build → Generate Signed App Bundle / APK**. If `.signing/keystore.properties` exists, `./gradlew bundleRelease` signs automatically.

## Releasing an update

1. Bump `versionCode` (+1, must always increase) and `versionName` in `app/build.gradle`.
2. Push. CI builds the AAB.
3. Sign it and upload it to Play Console.

## Back up the upload key

Copy `.signing/upload.jks` and `.signing/keystore.properties` to a password manager or an offline drive. If you lose them, Play support can reset the upload key, but that takes days.
