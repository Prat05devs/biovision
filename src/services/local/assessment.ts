import bank from '../../../configs/questions/health_assessment.v4.json';

import { buildCareRouting, levelSummaryKey } from '@/services/care/routing';
import { interpretHemoglobin, whoHemoglobinThreshold } from '@/services/local/hemoglobin';
import type { AssessmentService, UrgentKind } from '@/services/contracts';
import type {
  AssessmentSession,
  HealthAssessmentReport,
  HealthQuestion,
  PregnancyTrimester,
} from '@/types/assessment';

type Answer = string | boolean | number | string[];
type RawOption = { value: string; labelKey: string; urgent?: string };
type RawCondition = { questionId: string; equals?: string | boolean | number; notEquals?: string | boolean | number };
type RawQuestion = {
  id: string;
  type: string;
  textKey: string;
  sectionKey?: string;
  options?: RawOption[];
  showIf?: RawCondition;
  /** Follow-ups that do not fit every branch: any match hides the question. */
  hideIfAny?: RawCondition[];
  /** Multi-select only: choosing this clears the rest (for example "None of these"). */
  exclusiveValue?: string;
  urgentIfYes?: string;
};

const questions = bank.questions as RawQuestion[];

/** An empty multi-select is still unanswered, so the screen keeps asking. */
const answered = (answer: Answer | undefined) =>
  answer !== undefined && (!Array.isArray(answer) || answer.length > 0);

const toQuestion = (raw: RawQuestion): HealthQuestion => ({
  id: raw.id,
  type: raw.type as HealthQuestion['type'],
  textKey: raw.textKey,
  required: true,
  options: raw.options?.map(({ value, labelKey }) => ({ value, labelKey })),
  sectionKey: raw.sectionKey,
  followUpOf: raw.showIf?.questionId,
  exclusiveValue: raw.exclusiveValue,
});

/** A multi-select answer satisfies a condition when the value is among the chosen options. */
const matches = (answer: Answer, value: string | boolean | number) =>
  Array.isArray(answer) ? answer.includes(String(value)) : answer === value;

const satisfied = (condition: RawCondition, answers: Record<string, Answer>) => {
  const parent = answers[condition.questionId];
  if (parent === undefined) return false;
  if (condition.equals !== undefined) return matches(parent, condition.equals);
  if (condition.notEquals !== undefined) return !matches(parent, condition.notEquals);
  return true;
};

const eligible = (raw: RawQuestion, answers: Record<string, Answer>) => {
  if (raw.hideIfAny?.some((condition) => satisfied(condition, answers))) return false;
  if (!raw.showIf) return true;
  return satisfied(raw.showIf, answers);
};

/** The first danger sign in the answers, if any: an emergency "yes" or an option marked urgent. */
function urgentKind(answers: Record<string, Answer>): UrgentKind | undefined {
  for (const raw of questions) {
    const answer = answers[raw.id];
    if (answer === undefined || !eligible(raw, answers)) continue;
    if (raw.urgentIfYes && answer === true) return raw.urgentIfYes as UrgentKind;
    // Multi-select questions can carry several danger signs; any one of them escalates.
    const chosen = Array.isArray(answer) ? answer : [answer];
    const option = raw.options?.find((item) => chosen.includes(item.value) && item.urgent);
    if (option?.urgent) return option.urgent as UrgentKind;
  }
  return undefined;
}

/**
 * The eye photos are analysed before the questionnaire runs, so the haemoglobin cut-off used
 * there cannot know the trimester. WHO sets 10.5 g/dL for the second trimester against 11.0 for
 * the first and third, and applying 11.0 throughout tells a healthy second-trimester woman her
 * result is low. Once `pregnancy_stage` has been answered, re-interpret the same estimate
 * against the right cut-off before anything is shown or routed on.
 */
const TRIMESTERS: Record<string, PregnancyTrimester> = {
  pregnancy_first: 'first',
  pregnancy_second: 'second',
  pregnancy_third: 'third',
};

function withTrimesterAwareHemoglobin(session: AssessmentSession): AssessmentSession {
  const profile = session.profile;
  const estimate = session.anemia.estimatedHemoglobinGdl;
  if (!profile?.pregnant || estimate === undefined) return session;

  const stage = session.questionnaire.answers.pregnancy_stage;
  const trimester = typeof stage === 'string' ? TRIMESTERS[stage] : undefined;
  if (!trimester) return session;

  const corrected = { ...profile, trimester };
  return {
    ...session,
    profile: corrected,
    anemia: {
      ...session.anemia,
      signal: interpretHemoglobin(estimate, corrected),
      hemoglobinThresholdGdl: whoHemoglobinThreshold(corrected),
    },
  };
}

export const localAssessmentService: AssessmentService = {
  async nextQuestion({ answers }) {
    const urgent = urgentKind(answers);
    if (urgent) return { done: true, urgentActionRequired: true, urgentKind: urgent, configVersion: bank.version };
    const next = questions.find((raw) => !answered(answers[raw.id]) && eligible(raw, answers));
    return { question: next ? toQuestion(next) : undefined, done: !next, urgentActionRequired: false, configVersion: bank.version };
  },
  async complete(rawSession): Promise<HealthAssessmentReport> {
    const session = withTrimesterAwareHemoglobin(rawSession);
    const answers = session.questionnaire.answers;
    const urgent = urgentKind(answers);
    const routing = buildCareRouting(session);
    const signal = session.anemia.signal ?? 'unavailable';
    const level = routing.level === 'prompt' ? 'prompt_medical_review' : routing.level === 'follow_up' ? 'follow_up_recommended' : 'no_specific_concern';
    return {
      assessmentId: `assessment_${session.id}`,
      urgentActionRequired: Boolean(urgent),
      urgentKind: urgent,
      screeningResult: { signal, labelKey: `result.signal.${signal}` },
      questionnaireAssessment: { level, summaryKey: levelSummaryKey[routing.level], evidenceKeys: [] },
      explanation: {
        whatWasObservedKey: signal !== 'unavailable' ? 'result.observed' : 'result.observedUnavailable',
        whyItMayMatterKey: 'result.why',
      },
      recommendedTest: { nameKey: `care.tests.${routing.tests[0] ?? 'cbc'}` },
      recommendedCare: { categoryKey: `specialties.${routing.primary}` },
      urgent: urgent ? { messageKey: urgent === 'mental_health' ? 'emergency.mentalHealthMessage' : 'emergency.message', phone: urgent === 'mental_health' ? '14416' : '112' } : undefined,
    };
  },
};
