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
  ['acne with scarring goes to a dermatologist', { answers: { main_concern: 'skin', skin_type: 'acne', acne_severity: 'acne_inflamed_few', acne_scarring: 'acne_scars', acne_treatment: 'acne_untreated', acne_hormonal: 'acne_hormonal_no', ...lasting } }, 'dermatology', 'follow_up'],
  ['severe acne already treated is prompted', { answers: { main_concern: 'skin', skin_type: 'acne', acne_severity: 'acne_nodules', acne_scarring: 'acne_dark_marks', acne_treatment: 'acne_many_courses', acne_hormonal: 'acne_hormonal_no', ...lasting } }, 'dermatology', 'prompt'],
  ['mild acne stays with general medicine', { answers: { main_concern: 'skin', skin_type: 'acne', acne_severity: 'acne_comedones', acne_scarring: 'acne_no_marks', acne_treatment: 'acne_untreated', acne_hormonal: 'acne_hormonal_no', ...mild } }, 'generalPhysician', 'routine'],
  ['acne with irregular periods also sees gynaecology', { answers: { main_concern: 'skin', skin_type: 'acne', acne_severity: 'acne_inflamed_many', acne_scarring: 'acne_no_marks', acne_treatment: 'acne_untreated', acne_hormonal: 'acne_hormonal_both', ...lasting }, profile: { ageYears: 24, sex: 'female', pregnant: false } }, 'dermatology', 'follow_up', 'gynaecology'],
  ['bleeding mole is prompt', { answers: { main_concern: 'skin', skin_type: 'mole_change', mole_features: ['mole_bleeding'] } }, 'dermatology', 'prompt'],
  ['pregnancy without antenatal care', { answers: { main_concern: 'womens', womens_type: 'pregnancy_care', pregnancy_stage: 'pregnancy_second', pregnancy_danger: ['pregnancy_danger_none'], pregnancy_antenatal: 'antenatal_not_started' }, profile: { ageYears: 25, sex: 'female', pregnant: true } }, 'gynaecology', 'follow_up'],
  ['diabetes and high blood pressure together', { answers: { main_concern: 'none', existing_condition: ['diabetes_c', 'high_bp'] } }, 'generalPhysician', 'follow_up', 'endocrinology'],
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
  // Every WHO danger sign in pregnancy stops the questionnaire and routes to emergency care.
  for (const sign of ['pregnancy_bleeding', 'pregnancy_fits', 'pregnancy_headache_vision', 'pregnancy_abdominal_pain', 'pregnancy_breathing', 'pregnancy_reduced_movement', 'pregnancy_fever', 'pregnancy_swelling']) {
    const result = await next({ urgent_symptoms: false, main_concern: 'womens', womens_type: 'pregnancy_care', pregnancy_stage: 'pregnancy_third', pregnancy_danger: [sign] });
    assert.equal(result.urgentKind, 'medical', `${sign} must escalate`);
    assert.equal(result.done, true, `${sign} must stop the questionnaire`);
  }
  // "None of these" is not a danger sign.
  assert.equal((await next({ urgent_symptoms: false, main_concern: 'womens', womens_type: 'pregnancy_care', pregnancy_stage: 'pregnancy_third', pregnancy_danger: ['pregnancy_danger_none'] })).urgentActionRequired, false);

  // An empty multi-select is unanswered: the screen must keep asking the same question.
  const emptyMulti = await next({ urgent_symptoms: false, main_concern: 'none', existing_condition: [] });
  assert.equal(emptyMulti.question.id, 'existing_condition');

  // Pregnancy asks its own follow-ups and never the generic duration/impact pair.
  const pregnancyAsked = [];
  let pregnancyAnswers = { urgent_symptoms: false, main_concern: 'womens', womens_type: 'pregnancy_care' };
  for (let guard = 0; guard < 20; guard += 1) {
    const result = await next(pregnancyAnswers);
    if (result.done) break;
    pregnancyAsked.push(result.question.id);
    // Someone planning a pregnancy is not pregnant yet, so pick a trimester: the danger-sign
    // question deliberately does not apply to the planning branch.
    const value = result.question.id === 'pregnancy_stage' ? 'pregnancy_second'
      : result.question.type === 'yes_no' ? false
      : result.question.type === 'multi_choice' ? [result.question.options[0].value]
      : result.question.options[0].value;
    pregnancyAnswers = { ...pregnancyAnswers, [result.question.id]: value };
  }
  assert.ok(pregnancyAsked.includes('pregnancy_stage'), 'pregnancy must ask the trimester');
  assert.ok(pregnancyAsked.includes('pregnancy_danger'), 'pregnancy must ask the danger signs');
  assert.ok(!pregnancyAsked.includes('concern_duration'), 'pregnancy must not ask how long it has been going on');
  assert.ok(!pregnancyAsked.includes('concern_impact'), 'pregnancy must not ask about daily impact');

  // Acne asks acne follow-ups, not the rash question.
  const acneAsked = [];
  let acneAnswers = { urgent_symptoms: false, main_concern: 'skin', skin_type: 'acne' };
  for (let guard = 0; guard < 20; guard += 1) {
    const result = await next(acneAnswers);
    if (result.done) break;
    acneAsked.push(result.question.id);
    const value = result.question.type === 'yes_no' ? false
      : result.question.type === 'multi_choice' ? [result.question.options[0].value]
      : result.question.options[0].value;
    acneAnswers = { ...acneAnswers, [result.question.id]: value };
  }
  assert.ok(acneAsked.includes('acne_severity') && acneAsked.includes('acne_scarring'), 'acne must ask severity and scarring');
  assert.ok(!acneAsked.includes('skin_spreading'), 'acne must not be asked whether it is spreading');

  // The eye photos are analysed before the questionnaire, so the haemoglobin cut-off used there
  // cannot know the trimester. The report re-interprets the same estimate once it does: WHO uses
  // 10.5 g/dL in the second trimester against 11.0 in the first and third, and without this a
  // healthy second-trimester woman is told her result is low.
  const pregnantSession = (stage, estimate) => {
    const base = session({
      answers: { urgent_symptoms: false, main_concern: 'womens', womens_type: 'pregnancy_care', pregnancy_stage: stage, pregnancy_danger: ['pregnancy_danger_none'], pregnancy_antenatal: 'antenatal_started' },
      profile: { ageYears: 27, sex: 'female', pregnant: true },
    });
    base.anemia = { signal: 'moderate', estimatedHemoglobinGdl: estimate };
    return base;
  };
  // 11.2 g/dL clears the second-trimester cut-off of 10.5 but not the 11.0 used elsewhere.
  // ('low' is this codebase's name for a normal haemoglobin signal.)
  assert.equal(
    (await localAssessmentService.complete(pregnantSession('pregnancy_second', 11.2))).screeningResult.signal,
    'low', 'second trimester: 11.2 g/dL is normal');
  assert.equal(
    (await localAssessmentService.complete(pregnantSession('pregnancy_first', 11.2))).screeningResult.signal,
    'moderate', 'first trimester: 11.2 g/dL is borderline');
  // 10.2 g/dL is borderline against 10.5 but a positive flag against 11.0.
  assert.equal(
    (await localAssessmentService.complete(pregnantSession('pregnancy_second', 10.2))).screeningResult.signal,
    'moderate', 'second trimester: 10.2 g/dL is borderline');
  assert.equal(
    (await localAssessmentService.complete(pregnantSession('pregnancy_first', 10.2))).screeningResult.signal,
    'elevated', 'first trimester: 10.2 g/dL flags low haemoglobin');
  // Without a trimester the safer 11.0 cut-off still applies.
  assert.equal(
    (await localAssessmentService.complete(pregnantSession('pregnancy_unsure', 11.2))).screeningResult.signal,
    'moderate', 'unknown trimester keeps the safer cut-off');

  // The borderline band is the rule the shipped model was scored with (ml/conjunctiva_colour:
  // India n=95, sensitivity 0.71). If it changes, the published performance no longer describes
  // the app, so this is pinned deliberately rather than left to drift.
  const { HB_BORDERLINE_MARGIN_GDL, whoHemoglobinThreshold, interpretHemoglobin } = load(path.join(root, 'src/services/local/hemoglobin'));
  assert.equal(HB_BORDERLINE_MARGIN_GDL, 0.5, 'the evaluated decision rule is 0.5 g/dL');
  const woman = { ageYears: 30, sex: 'female', pregnant: false };
  assert.equal(whoHemoglobinThreshold(woman), 12.0);
  assert.equal(interpretHemoglobin(11.4, woman), 'elevated', 'clearly below the cut-off flags low haemoglobin');
  assert.equal(interpretHemoglobin(11.8, woman), 'moderate', 'within the band is borderline');
  assert.equal(interpretHemoglobin(12.6, woman), 'low', 'clearly above the cut-off is normal');

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
  console.log(`Care routing: ${scenarios.length} doctor scenarios, 6 danger-sign exits, 8 pregnancy danger signs, acne grading, multi-select conditions, trimester and borderline haemoglobin rules, and branch order passed.`);
})().catch((error) => { console.error(error); process.exit(1); });
