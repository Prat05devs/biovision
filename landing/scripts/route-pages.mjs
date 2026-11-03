// Writes a page for each top-level route, so /privacy, /terms and /support are real files.
// With cleanUrls on, Vercel serves privacy.html at /privacy without relying on the catch-all
// rewrite. Each page carries its own title and text in the HTML, because store review checkers
// fetch the URL without running JavaScript; React replaces this markup when the app mounts.
import { readFileSync, writeFileSync } from 'node:fs';

const legal = JSON.parse(readFileSync('src/content/legal.json', 'utf8'));
const shell = readFileSync('dist/index.html', 'utf8');
const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const email = 'admin@wtsolutions.cc';

const legalBody = ({ title, sections }) =>
  `<main><h1>${escape(title)}</h1><p>BioVision, by NavTaksh Wellness. ${escape(legal.updated)}</p>` +
  sections.map(({ heading, body }) => `<h2>${escape(heading)}</h2><p>${escape(body)}</p>`).join('') +
  `<p>Contact: <a href="mailto:${email}">${email}</a></p></main>`;

const pages = {
  privacy: { title: 'Privacy Policy', body: legalBody(legal.privacy) },
  terms: { title: 'Terms of Use', body: legalBody(legal.terms) },
  support: {
    title: 'Support',
    body: `<main><h1>BioVision support</h1><p>Questions, problems or feedback about BioVision? Email <a href="mailto:${email}">${email}</a> and we usually reply within two working days. Please include your phone model and app version.</p><p>BioVision is not a medical device. In an emergency, contact local emergency services.</p></main>`,
  },
};

for (const [route, { title, body }] of Object.entries(pages)) {
  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${title} | BioVision</title>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  if (!html.includes(`<title>${title} | BioVision</title>`) || !html.includes(body)) {
    throw new Error(`Could not prerender ${route}: index.html no longer has the expected <title> or root`);
  }
  writeFileSync(`dist/${route}.html`, html);
}
console.log('Wrote dist/{privacy,terms,support}.html with their text');
