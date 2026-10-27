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
  ['pregnant check-up without antenatal care, any concern', { answers: { main_concern: 'none', pregnancy_stage: 'pregnancy_first', pregnancy_danger: ['pregnancy_danger_none'], pregnancy_antenatal: 'antenatal_not_started' }, profile: { ageYears: 23, sex: 'female', pregnant: true } }, 'gynaecology', 'follow_up'],
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
  const adultWoman = { ageYears: 40, sex: 'female', pregnant: false };
  const pregnantWoman = { ageYears: 28, sex: 'female', pregnant: true };
  const man = { ageYears: 32, sex: 'male', pregnant: false };
  const next = (answers, profile = adultWoman) => localAssessmentService.nextQuestion({ sessionId: 's', anemiaSignal: 'unavailable', answers, profile });
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
    const result = await next({ urgent_symptoms: false, pregnancy_stage: 'pregnancy_third', pregnancy_danger: [sign] }, pregnantWoman);
    assert.equal(result.urgentKind, 'medical', `${sign} must escalate`);
    assert.equal(result.done, true, `${sign} must stop the questionnaire`);
  }
  // "None of these" is not a danger sign.
  assert.equal((await next({ urgent_symptoms: false, pregnancy_stage: 'pregnancy_third', pregnancy_danger: ['pregnancy_danger_none'] }, pregnantWoman)).urgentActionRequired, false);

  // An empty multi-select is unanswered: the screen must keep asking the same question.
  const emptyMulti = await next({ urgent_symptoms: false, main_concern: 'none', existing_condition: [] });
  assert.equal(emptyMulti.question.id, 'existing_condition');

  // A pregnant woman is asked the pregnancy questions straight after the emergency check,
  // whatever her main concern, and choosing pregnancy care skips the duration/impact pair.
  const pregnancyAsked = [];
  let pregnancyAnswers = { urgent_symptoms: false };
  for (let guard = 0; guard < 20; guard += 1) {
    const result = await next(pregnancyAnswers, pregnantWoman);
    if (result.done) break;
    pregnancyAsked.push(result.question.id);
    const value = result.question.id === 'main_concern' ? 'womens'
      : result.question.id === 'womens_type' ? 'pregnancy_care'
      : result.question.type === 'yes_no' ? false
      : result.question.type === 'multi_choice' ? [result.question.options[0].value]
      : result.question.options[0].value;
    pregnancyAnswers = { ...pregnancyAnswers, [result.question.id]: value };
  }
  assert.deepEqual(pregnancyAsked.slice(0, 3), ['pregnancy_stage', 'pregnancy_danger', 'pregnancy_antenatal'], 'pregnancy questions come first');
  assert.ok(!pregnancyAsked.includes('concern_duration'), 'pregnancy care must not ask how long it has been going on');
  assert.ok(!pregnancyAsked.includes('concern_impact'), 'pregnancy care must not ask about daily impact');
  const tiredPregnant = await next({ urgent_symptoms: false, pregnancy_stage: 'pregnancy_first', pregnancy_danger: ['pregnancy_danger_none'], pregnancy_antenatal: 'antenatal_started' }, pregnantWoman);
  assert.equal(tiredPregnant.question.id, 'main_concern', 'a pregnant woman still chooses her main concern');
  const stage = await next({ urgent_symptoms: false }, pregnantWoman);
  assert.ok(!stage.question.options.some((option) => option.value === 'pregnancy_planning'), 'a pregnant woman is not asked whether she is planning a pregnancy');

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

  // Nobody is asked something that cannot apply to them, on any branch. Walk every main concern
  // with every option of every branching follow-up, once per kind of person, and fail on any
  // question or option whose audience excludes them: men never see periods, pregnancy or
  // menopause; a woman who is not pregnant never sees pregnancy; a pregnant woman never sees
  // periods or menopause; girls never see periods; young women never see menopause.
  const bank = load(path.join(root, 'configs/questions/health_assessment.v4.json'));
  const excludes = (item, profile) =>
    (item.forSex && item.forSex !== profile.sex)
    || (item.forPregnant !== undefined && item.forPregnant !== profile.pregnant)
    || (item.minAge !== undefined && profile.ageYears < item.minAge);
  const byId = new Map(bank.questions.map((q) => [q.id, q]));
  const walk = async (profile, answers, seen) => {
    const result = await next(answers, profile);
    if (result.done) return;
    const { question } = result;
    seen.add(question.id);
    const raw = byId.get(question.id);
    assert.ok(!excludes(raw, profile), `${JSON.stringify(profile)} was asked ${question.id}`);
    for (const option of question.options ?? []) {
      // The same value can appear once per audience (main_concern:womens); match on the label too.
      const rawOption = raw.options.find((item) => item.value === option.value && item.labelKey === option.labelKey);
      assert.ok(rawOption && !excludes(rawOption, profile), `${JSON.stringify(profile)} was offered ${question.id}:${option.value}`);
      if (option.labelKey === 'questions.options.womens' || option.labelKey === 'questions.options.womens_pregnant') seen.add(option.labelKey);
      seen.add(`${question.id}:${option.value}`);
    }
    // Branch fully on the questions that open follow-ups; take the first answer elsewhere.
    const branching = ['main_concern', 'tired_signs', 'skin_type', 'womens_type'].includes(question.id);
    const values = question.type === 'yes_no' ? [false]
      : question.type === 'multi_choice' ? [[question.options[0].value]]
      : branching ? question.options.map((option) => option.value) : [question.options[0].value];
    for (const value of values) await walk(profile, { ...answers, [question.id]: value }, seen);
  };
  const people = {
    man,
    woman: adultWoman,
    pregnantWoman,
    youngWoman: { ageYears: 20, sex: 'female', pregnant: false },
    girl: { ageYears: 8, sex: 'female', pregnant: false },
  };
  const seen = {};
  for (const [name, profile] of Object.entries(people)) {
    seen[name] = new Set();
    await walk(profile, { urgent_symptoms: false }, seen[name]);
    assert.ok(seen[name].size > 30, `the ${name} walk must cover every branch`);
  }
  // The walks reach what each person should see, not just avoid what they should not.
  assert.ok(seen.woman.has('questions.options.womens') && seen.woman.has('womens_type:menopause') && seen.woman.has('tired_signs:heavy_periods'));
  assert.ok(!seen.woman.has('pregnancy_stage') && !seen.woman.has('womens_type:pregnancy_care'), 'no pregnancy questions unless she is pregnant');
  assert.ok(seen.pregnantWoman.has('pregnancy_danger') && seen.pregnantWoman.has('questions.options.womens_pregnant') && seen.pregnantWoman.has('womens_type:pregnancy_care'));
  assert.ok(!seen.pregnantWoman.has('acne_hormonal') && !seen.pregnantWoman.has('womens_type:irregular_periods'), 'no period questions in pregnancy');
  assert.ok(seen.youngWoman.has('womens_type:irregular_periods') && !seen.youngWoman.has('womens_type:menopause'), 'no menopause for a 20-year-old');
  assert.ok(!seen.girl.has('main_concern:womens') && !seen.girl.has('tired_signs:heavy_periods'), 'no period questions for a child');
  assert.ok(!seen.man.has('main_concern:womens') && !seen.man.has('acne_hormonal'), 'no women\'s questions for a man');
  // An unknown profile hides every audience-specific question rather than showing them to everyone.
  const unknown = await localAssessmentService.nextQuestion({ sessionId: 's', anemiaSignal: 'unavailable', answers: { urgent_symptoms: false }, profile: undefined });
  assert.equal(unknown.question.id, 'main_concern');
  assert.ok(!unknown.question.options.some((option) => option.value === 'womens'));
  // The camera-free check is the same questionnaire with no scan data: it still completes, routes
  // on the answers alone, and never claims a haemoglobin result it did not measure.
  const cameraFree = (answers, profile) => {
    const s = session({ answers, profile });
    s.scan.cameraSkipped = true;
    delete s.scan.vitals;
    return s;
  };
  const freeReport = await localAssessmentService.complete(cameraFree({ urgent_symptoms: false, main_concern: 'breathing', breath_trigger: 'minimal_activity', breath_cough: 'no_cough', ...lasting }, man));
  assert.equal(freeReport.screeningResult.signal, 'unavailable');
  assert.equal(buildCareRouting(cameraFree({ urgent_symptoms: false, main_concern: 'breathing', breath_trigger: 'minimal_activity', breath_cough: 'no_cough', ...lasting }, man)).primary, 'pulmonology');
  const freePregnant = cameraFree({ urgent_symptoms: false, main_concern: 'none', pregnancy_stage: 'pregnancy_first', pregnancy_danger: ['pregnancy_danger_none'], pregnancy_antenatal: 'antenatal_not_started' }, pregnantWoman);
  assert.equal(buildCareRouting(freePregnant).primary, 'gynaecology', 'camera-free pregnancy still goes to the obstetric team');

  // Stale answers from another profile cannot escalate: a man's leftover pregnancy answer is ignored.
  assert.equal((await next({ urgent_symptoms: false, pregnancy_stage: 'pregnancy_third', pregnancy_danger: ['pregnancy_bleeding'] }, man)).urgentActionRequired, false);

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
  console.log(`Care routing: ${scenarios.length} doctor scenarios, 6 danger-sign exits, 8 pregnancy danger signs, acne grading, multi-select conditions, every branch walked as a man, a woman, a pregnant woman, a young woman and a girl with nothing asked that cannot apply to them, trimester and borderline haemoglobin rules, and branch order passed.`);
})().catch((error) => { console.error(error); process.exit(1); });
