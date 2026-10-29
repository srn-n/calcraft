import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// `npm run build`        → dist/        (PWA, for hosting, Tauri, Android WebViewAssetLoader)
// `npm run build:single` → dist-single/ (one index.html you can double-click, works from file://)
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: mode === 'single' ? [viteSingleFile({ removeViteModuleLoader: true })] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    target: 'es2020',
    cssMinify: true,
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 0,
    copyPublicDir: mode !== 'single',
  },
  // Dev server stays on localhost. Use `npm run dev -- --host` only on a network you trust.
}));
