// Writes a copy of index.html for each top-level route, so /privacy, /terms and /support are
// real files. With cleanUrls on, Vercel serves privacy.html at /privacy without relying on the
// catch-all rewrite; the app stores require these links to load directly.
import { copyFileSync } from 'node:fs';

for (const route of ['privacy', 'terms', 'support']) copyFileSync('dist/index.html', `dist/${route}.html`);
console.log('Wrote dist/{privacy,terms,support}.html');
