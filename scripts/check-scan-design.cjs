// Protect the user-approved camera UI and its original shared-component styles.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');

const locked = {
  'src/app/scan/vitals.tsx': 'd7828f6cbdde7eb2588565afd68a32110c292a05c19309df7f91992c91ea4ed9',
  'src/components/scan/FaceMeshOverlay.tsx': 'be919759caed249ee286368cfbf5c8463760eece5172a4c0ac2f4c62a0bc77d0',
  'src/components/scan/ScanHud.tsx': '2e2dab55aabb2d872fb00fabc93394bc76520408c9ae1e60fc5ccdc62a01ad98',
  'src/components/scan/LiveFaceCamera.native.tsx': 'f0110485ade31ac497b4efb3667ff86123194ef7538d179b1eb461171f210d45',
};
for (const [file, expected] of Object.entries(locked)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), expected, `${file}: locked scan design changed`);
}

const flatten = style => Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean));
let textStyle, buttonStyle;
const Text = ({ style, children }) => { textStyle = flatten(style); return React.createElement('span', null, children); };
const Pressable = ({ style, children }) => { buttonStyle = flatten(style); return React.createElement('button', null, children); };
const native = {
  StyleSheet: { create: value => value, flatten }, Text, Pressable,
  View: ({ children }) => React.createElement('div', null, children),
  Animated: { createAnimatedComponent: value => value, Value: class { constructor(value) { this.value = value; } } },
};
const cache = new Map();
function load(file) {
  const full = path.join(root, file);
  if (cache.has(full)) return cache.get(full).exports;
  const module = { exports: {} }; cache.set(full, module);
  const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = name => {
    if (name === 'react-native') return native;
    if (name.endsWith('/AppIcon')) return { AppIcon: () => null };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(full), name);
      const resolved = ['.ts', '.tsx'].map(ext => base + ext).find(fs.existsSync);
      if (resolved) return load(path.relative(root, resolved));
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(localRequire, module, module.exports);
  return module.exports;
}
const { AppText } = load('src/components/ui/AppText.tsx');
const { Button } = load('src/components/ui/Button.tsx');
const { RedesignContext } = load('src/theme/RedesignContext.tsx');
const render = (child, redesign = false) => renderToStaticMarkup(redesign
  ? React.createElement(RedesignContext.Provider, { value: { enabled: true, hero: false } }, child)
  : child);

render(React.createElement(AppText, { variant: 'h1' }, 'Scan'));
assert.equal(textStyle.fontFamily, 'Inter_700Bold');
assert.equal(textStyle.color, '#102A2E');
assert.equal(textStyle.fontSize, 22);
render(React.createElement(AppText, { variant: 'h1' }, 'Your health'), true);
assert.equal(textStyle.fontFamily, 'RedHatDisplay_400Regular');
assert.equal(textStyle.color, '#0D0D0D');
render(React.createElement(AppText, null, 'स्वास्थ्य'), true);
assert.equal(textStyle.fontFamily, 'NotoSansDevanagari_400Regular');
assert.ok(textStyle.lineHeight >= Math.ceil(textStyle.fontSize * 1.62));
render(React.createElement(Button, { label: 'Continue', onPress() {}, variant: 'outline' }));
assert.equal(buttonStyle.borderRadius, 14);
assert.equal(buttonStyle.minHeight, 50);
assert.equal(buttonStyle.backgroundColor, '#FFFFFF');
assert.equal(buttonStyle.borderColor, '#D8E4E2');
render(React.createElement(Button, { label: 'Continue', onPress() {} }), true);
assert.equal(buttonStyle.borderRadius, 999);
assert.equal(buttonStyle.minHeight, 54);
assert.equal(buttonStyle.backgroundColor, '#2F7891');
console.log('Scan design: 4 locked files unchanged; original text/button styles isolated from the redesign; new Latin and Hindi typography verified.');
