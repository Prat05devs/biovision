// Care-routing scenarios: each answer pattern must reach the intended doctor and urgency.
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
    if (request.startsWith('@/')) return load(path.join(root, 'src', request.slice(2)));
    if (request.startsWith('.')) return load(path.resolve(path.dirname(resolved), request));
    return require(request);
  };
  new Function('require', 'module', 'exports', '__DEV__', outputText)(localRequire, module, module.exports, false);
  return module.exports;
}

const { buildCareRouting } = load(path.join(root, 'src/services/care/routing'));
const { localAssessmentService } = load(path.join(root, 'src/services/local/assessment'));

const session = ({ answers = {}, profile = { ageYears: 32, sex: 'male', pregnant: false }, vitals = [], anemia = {}, lifestyle = {} } = {}) => ({
  id: 'session_test', startedAt: new Date().toISOString(), profile,
  scan: { researchConsent: false, eyeCaptures: {}, vitals: { metrics: vitals.map(([id, value]) => ({ id, value, unit: '', evidence: 'camera_model', quality: 'good' })) } },
  anemia, questionnaire: { version: 'v3', questions: [], answers, answerEvents: [] }, lifestyle,
});
const mild = { concern_duration: 'under_2_weeks', concern_impact: 'noticeable_only' };
const lasting = { concern_duration: 'over_6_weeks', concern_impact: 'slows_activities' };

const scenarios = [
  ['healthy check-up', {}, 'generalPhysician', 'routine'],
  ['low haemoglobin only', { anemia: { signal: 'elevated', estimatedHemoglobinGdl: 10.4 } }, 'generalPhysician', 'follow_up'],
  ['lasting tiredness + thirst', { answers: { main_concern: 'tiredness', tired_signs: 'thirst_urination', ...lasting } }, 'generalPhysician', 'follow_up', 'endocrinology'],
  ['breathless on usual activity', { answers: { main_concern: 'breathing', breath_trigger: 'usual_activity', breath_cough: 'wheeze', ...lasting } }, 'pulmonology', 'follow_up'],
  ['breathless at minimal activity', { answers: { main_concern: 'breathing', breath_trigger: 'minimal_activity', breath_cough: 'no_cough', ...lasting } }, 'pulmonology', 'prompt'],
  ['chest discomfort on exertion', { answers: { main_concern: 'heart', heart_symptom: 'chest_on_exertion', heart_near_faint: false, ...lasting } }, 'cardiology', 'prompt'],
  ['fast resting heart rate only', { vitals: [['heartRate', 108]] }, 'generalPhysician', 'follow_up', 'cardiology'],
  ['itchy rash, spreading', { answers: { main_concern: 'skin', skin_type: 'rash_itch', skin_spreading: true, ...lasting } }, 'dermatology', 'follow_up'],
  ['changing mole', { answers: { main_concern: 'skin', skin_type: 'mole_change', skin_spreading: false, ...lasting } }, 'dermatology', 'prompt'],
  ['occasional stress', { answers: { main_concern: 'mood', mood_type: 'stress_burnout', mood_frequency: 'several_days', mood_self_harm: false, ...mild } }, 'mentalHealthProfessional', 'routine', 'psychiatry'],
  ['daily low mood', { answers: { main_concern: 'mood', mood_type: 'low_mood', mood_frequency: 'nearly_every_day', mood_self_harm: false, ...lasting } }, 'psychiatry', 'prompt'],
  ['frequent headaches', { answers: { main_concern: 'head', head_type: 'headache', head_pattern: 'frequent', ...lasting } }, 'neurology', 'follow_up'],
  ['mild occasional headache', { answers: { main_concern: 'head', head_type: 'headache', head_pattern: 'occasional', ...mild } }, 'generalPhysician', 'routine', 'neurology'],
  ['weight loss', { answers: { main_concern: 'metabolic', metabolic_type: 'weight_loss', known_condition: 'none_known', ...lasting } }, 'endocrinology', 'prompt'],
  ['acidity with swallowing trouble', { answers: { main_concern: 'stomach', stomach_type: 'acidity', stomach_alarm: 'trouble_swallowing', ...lasting } }, 'gastroenterology', 'prompt'],
  ['swollen knee', { answers: { main_concern: 'joints', joint_site: 'knee_hip', joint_swelling: true, ...lasting } }, 'orthopaedics', 'follow_up'],
  ['hearing loss', { answers: { main_concern: 'ent', ent_type: 'hearing_loss', ...lasting } }, 'ent', 'follow_up'],
  ['blurred vision', { answers: { main_concern: 'eyes', eye_type: 'blurred_vision', ...lasting } }, 'ophthalmology', 'prompt'],
  ['irregular periods', { answers: { main_concern: 'womens', womens_type: 'irregular_periods', ...lasting }, profile: { ageYears: 27, sex: 'female', pregnant: false } }, 'gynaecology', 'follow_up'],
  ['child with cough', { answers: { main_concern: 'breathing', breath_trigger: 'heavy_activity', breath_cough: 'dry_cough', ...lasting }, profile: { ageYears: 8, sex: 'female', pregnant: false } }, 'paediatrics', 'follow_up', 'pulmonology'],
  ['pregnant with low haemoglobin', { anemia: { signal: 'elevated', estimatedHemoglobinGdl: 9.6 }, profile: { ageYears: 26, sex: 'female', pregnant: true } }, 'gynaecology', 'follow_up'],
  ['high BMI', { lifestyle: { height_cm: '165', weight_kg: '92' } }, 'generalPhysician', 'follow_up', 'endocrinology'],
];

for (const [name, input, primary, level, also] of scenarios) {
  const routing = buildCareRouting(session(input));
  assert.equal(routing.primary, primary, `${name}: primary ${routing.primary}`);
  assert.equal(routing.level, level, `${name}: level ${routing.level}`);
  if (also) assert.equal(routing.also, also, `${name}: also ${routing.also}`);
  assert(routing.reasons.length > 0, `${name}: has reasons`);
}

(async () => {
  const next = (answers) => localAssessmentService.nextQuestion({ sessionId: 's', anemiaSignal: 'unavailable', answers });
  let step = await next({});
  assert.equal(step.question.id, 'urgent_symptoms');
  step = await next({ urgent_symptoms: true });
  assert.equal(step.urgentKind, 'medical');
  step = await next({ urgent_symptoms: false });
  assert.equal(step.question.id, 'main_concern');
  step = await next({ urgent_symptoms: false, main_concern: 'mood', mood_type: 'low_mood', mood_frequency: 'several_days', mood_self_harm: true });
  assert.equal(step.urgentKind, 'mental_health');
  for (const [answers, kind] of [
    [{ main_concern: 'breathing', breath_trigger: 'usual_activity', breath_cough: 'cough_blood' }, 'medical'],
    [{ main_concern: 'head', head_type: 'headache', head_pattern: 'sudden_severe' }, 'medical'],
    [{ main_concern: 'stomach', stomach_type: 'abdominal_pain', stomach_alarm: 'black_or_bloody_stool' }, 'medical'],
    [{ main_concern: 'eyes', eye_type: 'sudden_vision_loss' }, 'medical'],
  ]) assert.equal((await next({ urgent_symptoms: false, ...answers })).urgentKind, kind);
  // A branch only asks its own follow-ups, then the shared ones, then finishes.
  const asked = [];
  let answers = { urgent_symptoms: false, main_concern: 'joints' };
  for (let guard = 0; guard < 20; guard += 1) {
    const result = await next(answers);
    if (result.done) break;
    asked.push(result.question.id);
    answers = { ...answers, [result.question.id]: result.question.type === 'yes_no' ? false : result.question.options[0].value };
  }
  assert.deepEqual(asked, ['joint_site', 'joint_swelling', 'concern_duration', 'concern_impact', 'existing_condition', 'recent_cbc']);
  console.log(`Care routing: ${scenarios.length} doctor scenarios, 6 danger-sign exits and branch order passed.`);
})().catch((error) => { console.error(error); process.exit(1); });
