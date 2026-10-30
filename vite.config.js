import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// `npm run build`         → dist/        (PWA for hosting, and the base for Tauri)
// `npm run build:single`  → dist-single/ (one index.html you can double-click, works from file://)
// `npm run build:android` → android/app/src/main/assets/www/ (the Android app's offline web bundle)
const ANDROID_OUT = 'android/app/src/main/assets/www';

/**
 * In the Android app there are no HTTP response headers, so the Content-Security-Policy from
 * vercel.json is injected as a <meta> tag instead (placed before every script so it covers them).
 * frame-ancestors is header-only (ignored in <meta>), so it's dropped; the app can't be framed anyway.
 */
function androidCsp() {
  const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8'));
  const csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value
    .split(';').map((d) => d.trim()).filter((d) => d && !d.startsWith('frame-ancestors') && !d.startsWith('upgrade-insecure-requests')).join('; ');
  return {
    name: 'android-csp',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html.replace(/\s*<link rel="manifest"[^>]*>/, '').replace('<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n  <meta http-equiv="Content-Security-Policy" content="${csp}" />\n  <meta name="referrer" content="no-referrer" />`),
    },
    closeBundle() {
      // Web-only files the app never uses (assets are local, so no service worker or 404 page).
      for (const f of ['sw.js', '404.html', '404.css', 'manifest.webmanifest']) rmSync(resolve(ANDROID_OUT, f), { force: true });
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: mode === 'single' ? [viteSingleFile({ removeViteModuleLoader: true })] : mode === 'android' ? [androidCsp()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : mode === 'android' ? ANDROID_OUT : 'dist',
    emptyOutDir: true,
    target: 'es2020',
    cssMinify: true,
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 0,
    copyPublicDir: mode !== 'single',
  },
  // Dev server stays on localhost. Use `npm run dev -- --host` only on a network you trust.
}));
