import { buildLifestyleProfile } from '@/services/lifestyle/lifestyleProfile';
import type { AppearanceResult } from '@/services/vision/appearance.types';
import type { AssessmentSession } from '@/types/assessment';

/**
 * Care navigation: turns the health questions and the scan measurements into a level of urgency,
 * a primary doctor, an "also consider" doctor, the reasons and suggested tests.
 *
 * Based on common primary-care referral guidance (NHS symptom pages, NICE referral guidelines,
 * WHO haemoglobin cut-offs, AHA resting heart-rate range, WHO Asian BMI cut-offs,
 * India's Tele-MANAS mental-health pathway). Rules are ordered and deliberately simple so a
 * clinician can review them line by line.
 */

export type CareLevel = 'routine' | 'follow_up' | 'prompt';

export type CareSpecialty =
  | 'generalPhysician' | 'paediatrics' | 'gynaecology' | 'pulmonology' | 'cardiology' | 'dermatology'
  | 'psychiatry' | 'mentalHealthProfessional' | 'neurology' | 'endocrinology' | 'gastroenterology'
  | 'orthopaedics' | 'ent' | 'ophthalmology';

export type CareTest =
  | 'cbc' | 'ironStudies' | 'thyroid' | 'bloodSugar' | 'vitaminB12D' | 'lipidProfile' | 'ecg'
  | 'chestXray' | 'spirometry' | 'bloodPressure' | 'eyeExam' | 'hearingTest' | 'liverKidney';

export type CareReason = { key: string; values?: Record<string, string | number> };

export type CareRouting = {
  level: CareLevel;
  primary: CareSpecialty;
  also?: CareSpecialty;
  reasons: CareReason[];
  tests: CareTest[];
};

type Answers = Record<string, string | boolean | number | string[]>;

/** Multi-select answers arrive as arrays; everything else reads as a single value. */
const chosen = (answer: Answers[string] | undefined): string[] =>
  Array.isArray(answer) ? answer : typeof answer === 'string' ? [answer] : [];

const LEVEL_ORDER: CareLevel[] = ['routine', 'follow_up', 'prompt'];

/** Main concern -> the specialist who normally manages it. */
const concernSpecialty: Record<string, CareSpecialty> = {
  tiredness: 'generalPhysician',
  breathing: 'pulmonology',
  heart: 'cardiology',
  skin: 'dermatology',
  mood: 'psychiatry',
  head: 'neurology',
  metabolic: 'endocrinology',
  stomach: 'gastroenterology',
  joints: 'orthopaedics',
  ent: 'ent',
  eyes: 'ophthalmology',
  womens: 'gynaecology',
};

export function buildCareRouting(session: AssessmentSession, appearance?: AppearanceResult): CareRouting {
  const answers: Answers = session.questionnaire.answers;
  const concern = typeof answers.main_concern === 'string' ? answers.main_concern : 'none';
  const profile = session.profile;
  let level: CareLevel = 'routine';
  const reasons: CareReason[] = [];
  const tests = new Set<CareTest>();
  const others: CareSpecialty[] = [];
  const raise = (next: CareLevel) => { if (LEVEL_ORDER.indexOf(next) > LEVEL_ORDER.indexOf(level)) level = next; };

  let primary: CareSpecialty | undefined = concernSpecialty[concern];
  if (primary) reasons.push({ key: `concern.${concern}` });

  // How long and how much: two weeks or more, or limiting daily life, merits an appointment.
  if (concern !== 'none') {
    if (answers.concern_duration === 'two_to_six_weeks' || answers.concern_duration === 'over_6_weeks') { raise('follow_up'); reasons.push({ key: 'duration' }); }
    if (answers.concern_impact === 'slows_activities') raise('follow_up');
    if (answers.concern_impact === 'limits_activities') { raise('prompt'); reasons.push({ key: 'limitsActivities' }); }
    if (answers.concern_duration === 'under_2_weeks' && answers.concern_impact === 'noticeable_only') {
      // Short, mild symptoms: start with a general physician rather than a specialist.
      if (primary && primary !== 'generalPhysician' && concern !== 'mood' && concern !== 'womens') { others.push(primary); primary = 'generalPhysician'; }
    } else {
      raise('follow_up');
    }
  }

  // Area-specific refinements.
  switch (concern) {
    case 'tiredness':
      tests.add('cbc'); tests.add('thyroid'); tests.add('bloodSugar'); tests.add('vitaminB12D');
      if (answers.tired_signs === 'thirst_urination' || answers.tired_signs === 'weight_change' || answers.tired_signs === 'cold_hair_loss') { others.push('endocrinology'); reasons.push({ key: `tiredSigns.${answers.tired_signs}` }); }
      if (answers.tired_signs === 'heavy_periods') { others.push('gynaecology'); tests.add('ironStudies'); reasons.push({ key: 'tiredSigns.heavy_periods' }); }
      if (answers.tired_signs === 'snoring_sleep') { others.push('pulmonology'); reasons.push({ key: 'tiredSigns.snoring_sleep' }); }
      break;
    case 'breathing':
      tests.add('chestXray'); tests.add('spirometry');
      if (answers.breath_trigger === 'minimal_activity') { raise('prompt'); reasons.push({ key: 'breathMinimal' }); }
      else if (answers.breath_trigger === 'usual_activity') raise('follow_up');
      if (answers.breath_cough === 'wheeze') reasons.push({ key: 'wheeze' });
      tests.add('cbc');
      break;
    case 'heart':
      tests.add('ecg'); tests.add('bloodPressure'); tests.add('lipidProfile');
      if (answers.heart_symptom === 'chest_on_exertion') { raise('prompt'); reasons.push({ key: 'chestOnExertion' }); }
      if (answers.heart_symptom === 'ankle_swelling') { raise('follow_up'); tests.add('liverKidney'); }
      if (answers.heart_near_faint === true) { raise('prompt'); reasons.push({ key: 'nearFaint' }); }
      break;
    case 'skin': {
      if (answers.skin_type === 'mole_change') { raise('prompt'); reasons.push({ key: 'moleChange' }); }
      if (answers.skin_spreading === true) { raise('follow_up'); reasons.push({ key: 'skinSpreading' }); }
      if (answers.skin_type === 'hair_nails') { tests.add('cbc'); tests.add('thyroid'); }
      // NICE NG198 grades acne by lesion type: nodules or many inflamed lesions are
      // moderate-to-severe and belong with a dermatologist, and scarring makes it time-critical
      // because treating early is what prevents permanent marks.
      if (answers.skin_type === 'acne') {
        const severe = answers.acne_severity === 'acne_nodules' || answers.acne_severity === 'acne_inflamed_many';
        const scarring = answers.acne_scarring === 'acne_scars';
        const treatedAlready = answers.acne_treatment === 'acne_one_course' || answers.acne_treatment === 'acne_many_courses';
        if (severe || scarring) {
          primary = 'dermatology';
          raise('follow_up');
          reasons.push({ key: scarring ? 'acneScarring' : 'acneSevere' });
        }
        if (severe && treatedAlready) { raise('prompt'); reasons.push({ key: 'acneUnresponsive' }); }
        // Acne with irregular periods or new hair growth is the usual presentation of PCOS.
        if (answers.acne_hormonal === 'acne_hormonal_periods' || answers.acne_hormonal === 'acne_hormonal_hair' || answers.acne_hormonal === 'acne_hormonal_both') {
          others.push('gynaecology');
          tests.add('thyroid'); tests.add('bloodSugar');
          reasons.push({ key: 'acneHormonal' });
        }
      }
      // A mole that bleeds or has changed border or colour is what referral guidance looks for.
      const moleFeatures = chosen(answers.mole_features);
      if (moleFeatures.includes('mole_bleeding') || moleFeatures.includes('mole_border') || moleFeatures.includes('mole_colour')) {
        primary = 'dermatology';
        raise('prompt');
        reasons.push({ key: 'moleFeatures' });
      }
      break;
    }
    case 'mood': {
      const frequent = answers.mood_frequency === 'more_than_half' || answers.mood_frequency === 'nearly_every_day';
      // Occasional stress or poor sleep starts with a counsellor; persistent symptoms with a psychiatrist.
      if (!frequent && (answers.mood_type === 'stress_burnout' || answers.mood_type === 'poor_sleep' || answers.mood_frequency === 'several_days')) {
        primary = 'mentalHealthProfessional'; others.push('psychiatry');
      }
      if (answers.mood_frequency === 'nearly_every_day') { raise('prompt'); reasons.push({ key: 'moodDaily' }); }
      else if (frequent) { raise('follow_up'); reasons.push({ key: 'moodFrequent' }); }
      tests.add('thyroid');
      break;
    }
    case 'head':
      if (answers.head_type === 'numbness_tingling') { raise('prompt'); reasons.push({ key: 'numbness' }); tests.add('vitaminB12D'); tests.add('bloodSugar'); }
      if (answers.head_type === 'dizziness') { others.push('ent'); tests.add('bloodPressure'); tests.add('cbc'); }
      if (answers.head_pattern === 'frequent') { raise('follow_up'); reasons.push({ key: 'headFrequent' }); tests.add('bloodPressure'); }
      if (answers.head_type === 'headache' && answers.head_pattern === 'occasional') { others.push('neurology'); primary = 'generalPhysician'; }
      if (answers.head_type === 'memory_concentration') { tests.add('thyroid'); tests.add('vitaminB12D'); }
      break;
    case 'metabolic':
      tests.add('bloodSugar'); tests.add('thyroid'); tests.add('lipidProfile');
      if (answers.metabolic_type === 'weight_loss') { raise('prompt'); reasons.push({ key: 'weightLoss' }); }
      if (answers.metabolic_type === 'thirst_urination') { raise('follow_up'); reasons.push({ key: 'thirst' }); }
      break;
    case 'stomach':
      tests.add('cbc'); tests.add('liverKidney');
      if (answers.stomach_alarm === 'unplanned_weight_loss' || answers.stomach_alarm === 'trouble_swallowing') { raise('prompt'); reasons.push({ key: `stomachAlarm.${answers.stomach_alarm}` }); }
      break;
    case 'joints':
      if (answers.joint_swelling === true) { raise('follow_up'); reasons.push({ key: 'jointSwelling' }); }
      if (answers.joint_site === 'hands_fingers' && answers.joint_swelling === true) { others.push('generalPhysician'); tests.add('cbc'); }
      if (answers.joint_site === 'after_injury') raise('follow_up');
      break;
    case 'ent':
      if (answers.ent_type === 'hearing_loss') { raise('follow_up'); tests.add('hearingTest'); }
      break;
    case 'eyes':
      tests.add('eyeExam');
      if (answers.eye_type === 'eye_pain' || answers.eye_type === 'blurred_vision') { raise('prompt'); reasons.push({ key: `eye.${answers.eye_type}` }); }
      if (answers.eye_type === 'blurred_vision') tests.add('bloodSugar');
      break;
    case 'womens':
      if (answers.womens_type === 'heavy_periods_w') { tests.add('cbc'); tests.add('ironStudies'); }
      if (answers.womens_type === 'irregular_periods') { tests.add('thyroid'); tests.add('bloodSugar'); }
      // Pregnancy: anaemia screening matters more, and antenatal care is the next step when
      // it has not started. The WHO danger signs are handled as red flags before this point.
      if (answers.womens_type === 'pregnancy_care') {
        tests.add('cbc');
        if (answers.pregnancy_antenatal === 'antenatal_not_started') {
          raise('follow_up');
          reasons.push({ key: 'antenatalNotStarted' });
        }
        if (answers.pregnancy_stage === 'pregnancy_third') { tests.add('bloodPressure'); }
      }
      if (answers.womens_type === 'pelvic_pain_discharge') raise('follow_up');
      if (answers.womens_type === 'pregnancy_care') { raise('follow_up'); tests.add('cbc'); }
      break;
  }

  // Scan measurements.
  const metric = (id: string) => session.scan.vitals?.metrics.find((item) => item.id === id)?.value;
  const heartRate = metric('heartRate');
  if (heartRate !== undefined && (heartRate > 100 || heartRate < 50)) {
    reasons.push({ key: heartRate > 100 ? 'heartRateHigh' : 'heartRateLow', values: { value: heartRate } });
    raise(heartRate > 120 || heartRate < 45 ? 'prompt' : 'follow_up');
    tests.add('ecg');
    if (primary !== 'cardiology') others.push('cardiology');
  }
  const breathing = metric('respiratoryRate');
  if (breathing !== undefined && breathing > 24) {
    reasons.push({ key: 'breathingFast', values: { value: breathing } });
    raise('follow_up');
    if (primary !== 'pulmonology') others.push('pulmonology');
  }
  const stress = metric('stressIndex');
  if (stress !== undefined && stress > 150 && concern === 'mood') reasons.push({ key: 'stressHigh', values: { value: stress } });

  const { signal, estimatedHemoglobinGdl } = session.anemia;
  if (signal === 'elevated' && estimatedHemoglobinGdl !== undefined) {
    reasons.push({ key: 'hbLow', values: { value: estimatedHemoglobinGdl.toFixed(1) } });
    raise('follow_up');
    tests.add('cbc'); tests.add('ironStudies');
    if (!primary) primary = 'generalPhysician';
    else if (primary !== 'generalPhysician' && primary !== 'gynaecology' && primary !== 'paediatrics') others.unshift('generalPhysician');
  } else if (signal === 'moderate' && estimatedHemoglobinGdl !== undefined) {
    reasons.push({ key: 'hbBorderline', values: { value: estimatedHemoglobinGdl.toFixed(1) } });
    tests.add('cbc');
  }

  const bmi = buildLifestyleProfile(session.lifestyle).bmi;
  if (bmi !== undefined && bmi >= 27.5) {
    // WHO Asian cut-off for high risk of diabetes and heart disease.
    reasons.push({ key: 'bmiHigh', values: { value: bmi.toFixed(1) } });
    tests.add('bloodSugar'); tests.add('lipidProfile'); tests.add('bloodPressure');
    if (bmi >= 32.5 && primary !== 'endocrinology') others.push('endocrinology');
    if (!primary && level === 'routine') raise('follow_up');
  }

  if (appearance?.status === 'complete' && concern !== 'eyes' && appearance.checks?.some((check) => check.id === 'eyeRedness' && check.status === 'noticed')) {
    others.push('ophthalmology');
  }

  // Existing conditions. People commonly live with more than one, so every selected condition
  // contributes its tests and its specialty rather than the first one winning.
  const conditions = chosen(answers.existing_condition);
  if (conditions.includes('diabetes_c')) { tests.add('bloodSugar'); if (primary !== 'endocrinology') others.push('endocrinology'); }
  if (conditions.includes('thyroid_c')) { tests.add('thyroid'); if (primary !== 'endocrinology') others.push('endocrinology'); }
  if (conditions.includes('high_bp') || conditions.includes('heart_disease')) { tests.add('bloodPressure'); if (primary !== 'cardiology') others.push('cardiology'); }
  if (conditions.includes('asthma_copd') && primary !== 'pulmonology') others.push('pulmonology');
  // Diabetes and high blood pressure together compound cardiovascular risk, so the report
  // should not leave the person with a single test.
  if (conditions.includes('diabetes_c') && conditions.includes('high_bp')) {
    tests.add('lipidProfile');
    reasons.push({ key: 'multipleConditions' });
    raise('follow_up');
  }

  // Population overrides: children see a paediatrician; pregnancy is managed by the obstetric team.
  if (profile && profile.ageYears < 15) {
    if (primary && primary !== 'paediatrics') others.unshift(primary);
    primary = 'paediatrics';
    reasons.unshift({ key: 'child' });
  } else if (profile?.pregnant && (primary === 'generalPhysician' || primary === undefined || concern === 'womens' || signal === 'elevated')) {
    if (primary && primary !== 'gynaecology') others.unshift(primary);
    primary = 'gynaecology';
    reasons.unshift({ key: 'pregnant' });
  }

  if (!primary) {
    primary = 'generalPhysician';
    if (level === 'routine') reasons.push({ key: 'routineCheck' });
  }
  if (session.questionnaire.answers.recent_cbc === 'never' && tests.size === 0) tests.add('cbc');

  const also = others.find((specialty) => specialty !== primary);
  return { level, primary, also, reasons: dedupe(reasons), tests: [...tests].slice(0, 5) };
}

function dedupe(reasons: CareReason[]) {
  const seen = new Set<string>();
  return reasons.filter((reason) => (seen.has(reason.key) ? false : (seen.add(reason.key), true)));
}

export const levelSummaryKey: Record<CareLevel, string> = {
  routine: 'result.questionnaireSummary.noSpecificConcern',
  follow_up: 'result.questionnaireSummary.followUp',
  prompt: 'result.questionnaireSummary.prompt',
};
