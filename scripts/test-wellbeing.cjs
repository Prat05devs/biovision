// Stepped wellbeing screen: the PHQ/GAD instrument that ships on the device.
// These cases were ported from backend/tests/test_wellbeing.py when the unreachable
// backend wellbeing engine was removed, so the shipped config keeps its coverage —
// especially the risk item, which must stop the screen and escalate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const cache = new Map();
function load(file) {
  const resolved = [file, `${file}.ts`, `${file}.tsx`, path.join(file, 'index.ts')].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!resolved) throw new Error(`Cannot resolve ${file}`);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const module = { exports: {} };
  cache.set(resolved, module);
  if (resolved.endsWith('.json')) { module.exports = JSON.parse(fs.readFileSync(resolved, 'utf8')); return module.exports; }
  const { outputText } = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, resolveJsonModule: true, esModuleInterop: true },
  });
  const localRequire = (request) => {
    if (request.startsWith('@configs/')) return load(path.join(root, 'configs', request.slice('@configs/'.length)));
    if (request.startsWith('@/')) return load(path.join(root, 'src', request.slice(2)));
    if (request.startsWith('.')) return load(path.resolve(path.dirname(resolved), request));
    return require(request);
  };
  new Function('require', 'module', 'exports', '__DEV__', outputText)(localRequire, module, module.exports, false);
  return module.exports;
}

const engine = load(path.join(root, 'src/services/wellbeing/screenEngine'));
const { nextQuestion, assess, riskEndorsed, supportResources, emergencyNumber, screenMetadata, RISK_QUESTION_ID } = engine;

const NONE = 'not_at_all';
const HALF = 'more_than_half';
const ALL_CLEAR = {
  wellbeing_interest: NONE,
  wellbeing_mood: NONE,
  wellbeing_nervous: NONE,
  wellbeing_worry_control: NONE,
};

/** Drives the stepped screen one question at a time, the way the app does. */
function answerUntilDone(start, severity, overrides = {}) {
  const current = { ...start };
  for (let guard = 0; guard < 64; guard += 1) {
    const { question, done } = nextQuestion(current);
    if (done || !question) return current;
    assert.ok(question.options?.length, `${question.id} has no options`);
    const chosen = question.options[Math.min(severity, question.options.length - 1)];
    current[question.id] = overrides[question.id] ?? chosen.value;
  }
  throw new Error('The screen did not terminate.');
}

// A well person answers only the four ultra-brief items.
const baseline = answerUntilDone({}, 0);
assert.equal(Object.keys(baseline).length, 4, 'baseline screen must stay at four questions');

// A negative screen monitors, reports both brief scales, and raises no urgency.
const clear = assess(ALL_CLEAR);
assert.equal(clear.level, 'monitor');
assert.equal(clear.urgentActionRequired, false);
assert.deepEqual(new Set(clear.scales.map((scale) => scale.id)), new Set(['phq2', 'gad2']));
assert.ok(clear.scales.every((scale) => scale.positive === false));

// A positive brief screen steps up to the full scale rather than stopping.
const stepped = answerUntilDone({}, 2, { [RISK_QUESTION_ID]: NONE });
assert.ok(Object.keys(stepped).length > 4, 'a positive screen must ask more');
const steppedResult = assess(stepped);
const steppedIds = steppedResult.scales.map((scale) => scale.id);
assert.ok(steppedIds.includes('phq9'), 'positive PHQ-2 must step up to PHQ-9');
assert.ok(steppedIds.includes('gad7'), 'positive GAD-2 must step up to GAD-7');

// A full-scale total supersedes the ultra-brief screen it stepped up from.
const reported = new Set(steppedResult.reportedScales?.map((scale) => scale.id) ?? []);
if (reported.size) {
  assert.ok(!reported.has('phq2') || !reported.has('phq9'), 'phq2 must not be shown beside phq9');
}

// Below the cut-off, the screen does not step up.
assert.equal(nextQuestion(ALL_CLEAR).done, true, 'a negative screen is complete at four items');

// The risk item stops the screen immediately and escalates, however early it appears.
const risky = { ...ALL_CLEAR, [RISK_QUESTION_ID]: 'several_days' };
assert.equal(riskEndorsed(risky), true);
const riskyNext = nextQuestion(risky);
assert.equal(riskyNext.done, true, 'endorsed risk must stop the questionnaire');
assert.equal(riskyNext.urgentActionRequired, true);
const riskyResult = assess(risky);
assert.equal(riskyResult.urgentActionRequired, true);
assert.equal(riskyResult.level, 'urgent');

// The same holds when the risk item is endorsed more strongly mid-screen.
const riskyMid = assess({ ...stepped, [RISK_QUESTION_ID]: HALF });
assert.equal(riskyMid.level, 'urgent');
assert.equal(riskyMid.urgentActionRequired, true);

// An unendorsed risk item never escalates.
assert.equal(riskEndorsed({ ...ALL_CLEAR, [RISK_QUESTION_ID]: NONE }), false);
assert.equal(assess({ ...ALL_CLEAR, [RISK_QUESTION_ID]: NONE }).urgentActionRequired, false);

// An incomplete screen cannot be scored into a scale.
assert.equal(assess({ wellbeing_interest: NONE }).scales.length, 0, 'a partial instrument must not be scored');
assert.equal(assess({}).scales.length, 0);

// Crisis support is available before any answer, with the Tele-MANAS line reachable.
const support = supportResources('IN');
assert.ok(support.length > 0, 'support resources must be configured');
const teleManas = support.find((resource) => (resource.phone ?? '').includes('14416'));
assert.ok(teleManas, 'Tele-MANAS 14416 must be offered in India');
assert.equal(emergencyNumber('IN'), '112');
const metadata = screenMetadata('IN');
assert.equal(metadata.riskQuestionId, RISK_QUESTION_ID);
assert.ok(metadata.screenVersion, 'the screen must report its version');
assert.equal(metadata.baselineQuestionCount, 4, 'the baseline must stay at four items');
assert.ok(metadata.recallPeriodDays > 0, 'the screen must state its recall period');

console.log(`Wellbeing screen: stepped branching, scale scoring, risk escalation (${RISK_QUESTION_ID}) and crisis support passed. Screen ${metadata.screenVersion}, ${Object.keys(baseline).length}-item baseline.`);
