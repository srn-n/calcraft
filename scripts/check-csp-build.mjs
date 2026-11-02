#!/usr/bin/env node
// Fails the build if the output would break (or tempt someone to loosen) the strict CSP in vercel.json.
// Runs after `npm run build` (web) and `npm run build:android` (the CSP is injected as a <meta> there).
// Usage: node scripts/check-csp-build.mjs [outDir]   (default: dist)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const outDir = process.argv[2] || 'dist';
const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const csp = vercel.headers[0].headers.find((h) => h.key === 'Content-Security-Policy').value;
const errors = [];

if (/unsafe-inline|unsafe-eval/.test(csp)) errors.push("vercel.json CSP contains 'unsafe-inline' or 'unsafe-eval'");

const htmlFiles = readdirSync(outDir).filter((f) => f.endsWith('.html') && statSync(join(outDir, f)).isFile());
for (const file of htmlFiles) {
  const html = readFileSync(join(outDir, file), 'utf8');
  // Every inline script must be allowed by an exact hash in script-src.
  for (const m of html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    if (!m[1].trim()) continue;
    const hash = `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`;
    if (!csp.includes(hash)) errors.push(`${file}: inline <script> (${m[1].length} chars) not allowed by CSP. Hash ${hash}. Was a single-file build put in the web output?`);
  }
  // style-src 'self' allows no inline styles at all.
  if (/<style\b/i.test(html)) errors.push(`${file}: inline <style> block (blocked by style-src 'self')`);
  if (/\sstyle\s*=/i.test(html)) errors.push(`${file}: inline style="" attribute (blocked by style-src 'self')`);
  if (/\son[a-z]+\s*=/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, ''))) errors.push(`${file}: inline event handler (blocked by script-src)`);
}

if (errors.length) {
  console.error(`\n✗ CSP check failed for ${outDir}/:\n  - ${errors.join('\n  - ')}\n\n  Fix the build, don't loosen the CSP. build:single output is for local/offline use only, never the web.\n`);
  process.exit(1);
}
console.log(`✓ CSP check passed for ${outDir}/ (${htmlFiles.length} HTML file${htmlFiles.length === 1 ? '' : 's'})`);
