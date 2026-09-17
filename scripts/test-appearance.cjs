const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const scope = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/vision/appearanceModules.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: scope.exports });
const { analyseForehead, analyseSpots, analyseEyeRedness, analyseLipTone, sampleRegion } = scope.exports;
function frame(size, rgb) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < data.length; i += 4) { data.set(rgb, i); data[i + 3] = 255; }
  return { width: size, height: size, data };
}
function paint(f, cx, cy, radius, rgb) {
  for (let y = 0; y < f.height; y++) for (let x = 0; x < f.width; x++) {
    if (Math.hypot(x / f.width - cx, y / f.height - cy) < radius) f.data.set(rgb, (y * f.width + x) * 4);
  }
}
const regions = [.25,.5,.75].map(x => ({ x, y: .3, rx: .07, ry: .05 }));
const neutral = frame(800, [150,120,100]);
assert.equal(analyseForehead(neutral, regions).status, 'not_flagged');
assert.equal(analyseSpots(neutral, regions, .7).status, 'not_flagged');
const varied = frame(800, [150,120,100]); paint(varied, .25,.3,.10,[85,65,55]);
assert.equal(analyseForehead(varied, regions).status, 'noticed');
const spots = frame(800, [150,120,100]); paint(spots, .5,.3,.012,[200,65,60]);
assert.equal(analyseSpots(spots, regions, .7).status, 'noticed');
assert.equal(analyseSpots(frame(100,[150,120,100]), regions, .7).status, 'not_assessable');
assert.equal(analyseForehead(frame(800,[255,255,255]), regions).status, 'not_assessable');
assert.equal(analyseForehead(frame(800,[5,5,5]), regions).status, 'not_assessable');
assert.equal(sampleRegion(neutral, { x: -.1, y: .3, rx: .1, ry: .1 }).length, 0);
assert.equal(sampleRegion({width: 10,height: 10,data: []}, regions[0]).length, 0);
const eyes = [.3,.7].map(x => ({ x, y: .5, rx: .1, ry: .035 }));
assert.equal(analyseEyeRedness(frame(800,[180,175,170]), eyes).status, 'not_flagged');
assert.equal(analyseEyeRedness(frame(800,[210,140,140]), eyes).status, 'noticed');
assert.equal(analyseEyeRedness(frame(100,[180,175,170]), eyes).status, 'not_assessable');
assert.equal(analyseEyeRedness(frame(800,[255,255,255]), eyes).status, 'not_assessable');
assert.equal(analyseEyeRedness(neutral, [eyes[0]]).status, 'not_assessable');
const lips = [{ x: .5, y: .58, rx: .12, ry: .02 }, { x: .5, y: .63, rx: .12, ry: .025 }];
const cheeks = [{ x: .3, y: .55, rx: .08, ry: .08 }, { x: .7, y: .55, rx: .08, ry: .08 }];
const darkLips = frame(800, [160,130,110]);
paint(darkLips, .5, .58, .13, [75,55,52]); paint(darkLips, .5, .63, .13, [75,55,52]);
assert.equal(analyseLipTone(darkLips, lips, cheeks, .3).status, 'noticed');
assert.equal(analyseLipTone(neutral, lips, cheeks, .3).status, 'not_flagged');
assert.equal(analyseLipTone(frame(120, [150,120,100]), lips, cheeks, .3).status, 'not_assessable');
for (const language of ['en','hi']) {
 const locale = JSON.parse(fs.readFileSync(`src/i18n/${language}.json`,'utf8')).appearance;
 for (const id of ['underEyes','forehead','spots','eyeRedness','lipTone']) { assert(locale.modules[id]); assert(locale.scope[id]); }
 for (const status of ['noticed','not_flagged','not_assessable']) assert(locale.status[status]);
 for (const reason of ['contrast','tone_variation','local_spots','redness','lip_contrast','no_clear_signal','resolution','lighting','coverage']) assert(locale.detail[reason]);
}
console.log('Appearance module synthetic-signal, clipping, coverage, resolution and bilingual tests passed. No real-image accuracy claim.');
