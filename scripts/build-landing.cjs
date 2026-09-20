// Generates landing/src/content/legal.json from the app's English legal text, so the website and
// the in-app pages never drift apart. The React pages read it. Run: npm run landing:build
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/en.json'), 'utf8'));

const pick = (doc) => ({
  title: en.legal[doc].title,
  sections: en.legal[doc].sections.map(({ heading, body }) => ({ heading, body })),
});

const content = {
  // Regenerated file — edit src/i18n/en.json instead.
  updated: en.legal.updated,
  privacy: pick('privacy'),
  terms: pick('terms'),
};

const outDir = path.join(root, 'landing/src/content');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'legal.json'), `${JSON.stringify(content, null, 2)}\n`);
console.log('landing/src/content/legal.json generated from src/i18n/en.json.');
