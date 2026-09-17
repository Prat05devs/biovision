// Generates landing/privacy.html and landing/terms.html from the app's English legal text,
// so the website and the in-app pages never drift apart. Run: npm run landing:build
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const en = JSON.parse(fs.readFileSync(path.join(root, 'src/i18n/en.json'), 'utf8'));
const index = fs.readFileSync(path.join(root, 'landing/index.html'), 'utf8');
const header = index.slice(index.indexOf('<body>'), index.indexOf('<main>'));
const footer = index.slice(index.indexOf('<footer>'));
const escape = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

for (const [doc, file, description] of [
  ['privacy', 'privacy.html', 'How BioVision handles your data: everything is analysed on your iPhone, with no accounts, uploads, ads or tracking.'],
  ['terms', 'terms.html', 'Terms of Use for the BioVision health-information app.'],
]) {
  const { title, sections } = en.legal[doc];
  const body = sections.map(({ heading, body: text }) => `  <h2>${escape(heading)}</h2>\n  <p>${escape(text)}</p>`).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>BioVision — ${escape(title)}</title>
<meta name="description" content="${escape(description)}" />
<link rel="icon" href="/assets/app-icon.png" />
<link rel="stylesheet" href="/styles.css" />
</head>
${header}<main class="doc">
  <div class="eyebrow">BioVision</div>
  <h1>${escape(title)}</h1>
  <p><small>${escape(en.legal.updated)}</small></p>
${body}
</main>
${footer}`;
  fs.writeFileSync(path.join(root, 'landing', file), html);
}
console.log('landing/privacy.html and landing/terms.html generated from src/i18n/en.json.');
