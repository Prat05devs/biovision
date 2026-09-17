import bank from '../../../configs/questions/health_assessment.v3.json';

import { buildCareRouting, levelSummaryKey } from '@/services/care/routing';
import type { AssessmentService, UrgentKind } from '@/services/contracts';
import type { HealthAssessmentReport, HealthQuestion } from '@/types/assessment';

type Answer = string | boolean | number;
type RawOption = { value: string; labelKey: string; urgent?: string };
type RawQuestion = {
  id: string;
  type: string;
  textKey: string;
  sectionKey?: string;
  options?: RawOption[];
  showIf?: { questionId: string; equals?: Answer; notEquals?: Answer };
  urgentIfYes?: string;
};

const questions = bank.questions as RawQuestion[];

const toQuestion = (raw: RawQuestion): HealthQuestion => ({
  id: raw.id,
  type: raw.type as HealthQuestion['type'],
  textKey: raw.textKey,
  required: true,
  options: raw.options?.map(({ value, labelKey }) => ({ value, labelKey })),
  sectionKey: raw.sectionKey,
  followUpOf: raw.showIf?.questionId,
});

const eligible = (raw: RawQuestion, answers: Record<string, Answer>) => {
  const condition = raw.showIf;
  if (!condition) return true;
  const parent = answers[condition.questionId];
  if (parent === undefined) return false;
  if (condition.equals !== undefined) return parent === condition.equals;
  if (condition.notEquals !== undefined) return parent !== condition.notEquals;
  return true;
};

/** The first danger sign in the answers, if any: an emergency "yes" or an option marked urgent. */
function urgentKind(answers: Record<string, Answer>): UrgentKind | undefined {
  for (const raw of questions) {
    const answer = answers[raw.id];
    if (answer === undefined || !eligible(raw, answers)) continue;
    if (raw.urgentIfYes && answer === true) return raw.urgentIfYes as UrgentKind;
    const option = raw.options?.find((item) => item.value === answer);
    if (option?.urgent) return option.urgent as UrgentKind;
  }
  return undefined;
}

export const localAssessmentService: AssessmentService = {
  async nextQuestion({ answers }) {
    const urgent = urgentKind(answers);
    if (urgent) return { done: true, urgentActionRequired: true, urgentKind: urgent, configVersion: bank.version };
    const next = questions.find((raw) => answers[raw.id] === undefined && eligible(raw, answers));
    return { question: next ? toQuestion(next) : undefined, done: !next, urgentActionRequired: false, configVersion: bank.version };
  },
  async complete(session): Promise<HealthAssessmentReport> {
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
