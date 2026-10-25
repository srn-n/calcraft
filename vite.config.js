import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`        → dist/        (PWA, for hosting, Tauri, Android WebViewAssetLoader)
// `npm run build:single` → dist-single/ (one index.html you can double-click, works from file://)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile({ removeViteModuleLoader: true })] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    target: 'es2020',
    cssMinify: true,
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 0,
    copyPublicDir: mode !== 'single',
  },
  server: { host: true },
}));
