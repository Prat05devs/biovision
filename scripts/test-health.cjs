const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleScope = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/health/check.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: moduleScope.exports });
const { buildHealthPlan: plan, updateHealthAnswer: update, visibleHealthQuestions: visible, healthQuestions } = moduleScope.exports;
const routine = { safety: 'none', age: 'adult', concern: 'routine', sleep: 'rested', movement: 'regular', food: 'varied', stress: 'manageable', exposure: 'none', history: 'none', priority: 'habits' };
assert.equal(plan({}).level, 'incomplete');
assert.equal(plan({ safety: 'urgent' }).level, 'urgent');
assert.equal(plan(routine).level, 'routine');
assert.equal(plan({ ...routine, concern: 'energy' }).level, 'incomplete');
assert.equal(plan({ ...routine, concern: 'energy', duration: 'weeks', impact: 'manageable' }).level, 'appointment');
assert.equal(plan({ ...routine, concern: 'breathing', duration: 'days', impact: 'manageable' }).level, 'prompt');
assert.equal(plan({ ...routine, concern: 'skin', duration: 'days', impact: 'worsening' }).level, 'prompt');
assert.equal(plan({ ...routine, age: 'child' }).specialty, 'paediatrics');
assert.equal(plan({ ...routine, history: 'medicines' }).level, 'appointment');
assert.equal(plan({ ...routine, sleep: 'invalid' }).complete, false);
assert.throws(() => update({}, 'safety', 'invalid'));
assert.throws(() => update({}, 'invented', 'none'));
const changed = update({ ...routine, concern: 'energy', duration: 'months', impact: 'worsening' }, 'concern', 'routine');
assert.equal(changed.duration, undefined);
assert.equal(changed.impact, undefined);
assert.equal(visible(changed).length, 10);
assert.equal(plan({ ...routine, sleep: 'unknown', movement: 'unknown', food: 'unknown' }).actions.includes('sleep'), false);
for (const language of ['en','hi']) {
  const locale = JSON.parse(fs.readFileSync(`src/i18n/${language}.json`, 'utf8'));
  for (const q of healthQuestions) {
    assert.equal(typeof locale.health.q[q.id], 'string');
    assert.equal(typeof locale.health.hint[q.id], 'string');
    for (const option of q.options) assert.equal(typeof locale.health.options[q.id][option], 'string');
  }
  for (const action of ['sleep','movement','food','stress','exposure','medicines','maintain']) assert.equal(typeof locale.health.action[action], 'string');
}
const { facilities } = JSON.parse(fs.readFileSync('configs/care/dehradun.v1.json', 'utf8'));
assert.equal(new Set(facilities.map(f => f.id)).size, facilities.length);
assert(facilities.some(f => f.isGovernment));
assert(facilities.filter(f => f.affiliation).length >= 9);
for (const f of facilities) {
  assert.equal(new URL(f.sourceUrl).protocol, 'https:');
  const maps = new URL(f.directionsUrl);
  assert.equal(maps.hostname, 'www.google.com');
  assert.equal(maps.searchParams.get('api'), '1');
  assert(maps.searchParams.get('destination').includes('Dehradun'));
  assert.equal(f.distanceKm, undefined);
  // Phone numbers come only from the hospital's own website.
  if (f.phone !== undefined) assert.match(f.phone, /^0135-\d{7}$/);
}
console.log('Health branching, urgency, incomplete answers, answer correction, bilingual content and directory integrity passed.');
const appearanceScope = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/services/vision/appearanceMath.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: appearanceScope.exports });
const compare = appearanceScope.exports.compareUnderEyeBrightness;
assert.equal(compare({ leftUnder: 100, rightUnder: 100, leftCheek: 150, rightCheek: 150 }), 'under_eye_contrast');
assert.equal(compare({ leftUnder: 150, rightUnder: 150, leftCheek: 150, rightCheek: 150 }), 'no_clear_contrast');
assert.equal(compare({ leftUnder: 100, rightUnder: 100, leftCheek: 150, rightCheek: 80 }), 'lighting');
assert.equal(compare({ leftUnder: NaN, rightUnder: 100, leftCheek: 150, rightCheek: 150 }), 'lighting');
assert.equal(compare({ leftUnder: 10, rightUnder: 10, leftCheek: 20, rightCheek: 20 }), 'lighting');
assert.equal(compare({ leftUnder: 245, rightUnder: 245, leftCheek: 250, rightCheek: 250 }), 'lighting');
console.log('Appearance contrast rejects invalid, dark, overexposed and uneven-light samples. This checks logic, not model accuracy.');
