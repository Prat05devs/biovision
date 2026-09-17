const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');

function load(file) {
  const scope = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: scope.exports });
  return scope.exports;
}

const vitals = load('src/services/vision/vitalMetrics.ts');
const samples = [];
for (let index = 0; index < 30 * 30; index += 1) {
  const seconds = index / 30;
  const respiratoryEnvelope = 1 + 0.35 * Math.sin(2 * Math.PI * 0.3 * seconds);
  samples.push({
    timestamp: index * (1000 / 30),
    value: respiratoryEnvelope * Math.sin(2 * Math.PI * 1.2 * seconds),
  });
}
assert(Math.abs(vitals.estimateRespiratoryRate(samples) - 18) <= 1);
assert.equal(vitals.estimateRespiratoryRate(samples.slice(0, 300)), undefined);
assert.equal(vitals.estimateRespiratoryRate(samples.map((sample) => ({ ...sample, value: 1 }))), undefined);
const unavailable = vitals.unavailableCameraMetrics();
assert.equal(unavailable.length, 8);
assert(unavailable.every((metric) => metric.evidence === 'unavailable'));
assert(unavailable.every((metric) => metric.value === undefined && metric.secondaryValue === undefined));

const profile = load('src/services/vision/featureProfile.ts');
const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
const set = (id, x, y) => { points[id] = { x, y, z: 0 }; };
set(10, .5, .12); set(151, .5, .29); set(1, .5, .48); set(164, .5, .60); set(152, .5, .88);
set(33, .27, .39); set(133, .43, .40); set(159, .35, .37); set(145, .35, .43);
set(362, .57, .40); set(263, .73, .39); set(386, .65, .37); set(374, .65, .43);
set(234, .18, .52); set(454, .82, .52); set(132, .24, .70); set(361, .76, .70);
set(61, .37, .69); set(291, .63, .69); set(0, .5, .66); set(13, .5, .68); set(14, .5, .70); set(17, .5, .73);
set(129, .43, .56); set(358, .57, .56);
const geometry = profile.calculateRealFeatureProfile(points, 1);
assert.equal(geometry.length, 7);
assert(geometry.every((item) => Number.isInteger(item.score) && item.score >= 1 && item.score <= 10));
assert.equal(profile.calculateRealFeatureProfile(points.slice(0, 100), 1).length, 0);

console.log('Vitals abstention, respiratory signal gate, and landmark-geometry checks passed.');
