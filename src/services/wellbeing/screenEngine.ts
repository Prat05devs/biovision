/**
 * Client-side stepped wellbeing screen.
 *
 * This reads the same versioned config the FastAPI service loads, so the
 * deterministic demo mode and the real API ask the same questions in the same
 * order and score them the same way. The server remains authoritative; this
 * exists so switching `EXPO_PUBLIC_USE_MOCKS` cannot silently change a
 * clinical instrument.
 */
import screenConfig from '@configs/wellbeing/wellbeing_screen.v1.json';
import supportConfig from '@configs/wellbeing/support_resources.v1.json';

import type { HealthQuestion } from '@/types/assessment';
import type {
  SupportResource,
  WellbeingAnswers,
  WellbeingLevel,
  WellbeingResult,
  WellbeingScaleResult,
  WellbeingScreen,
} from '@/types/wellbeing';

type RawOption = { value: string; labelKey: string; score: number };
type RawCondition = { scale: string; atOrAbove: number };
type RawQuestion = {
  id: string;
  type: 'single_choice';
  textKey: string;
  sectionKey?: string;
  optionSet: string;
  excludedFromScales?: boolean;
  showIfScore?: RawCondition;
  showIfAnyScore?: RawCondition[];
};

const OPTION_SETS = screenConfig.optionSets as Record<string, RawOption[]>;
const QUESTIONS = screenConfig.questions as RawQuestion[];
const SCALES = screenConfig.scales as Record<
  string,
  {
    labelKey: string;
    items: string[];
    maximumScore: number;
    positiveAtOrAbove: number;
    bands: { minimum: number; level: WellbeingLevel; labelKey: string }[];
  }
>;
const RISK = screenConfig.riskItem;

export const SCREEN_VERSION = screenConfig.version;
export const RECALL_PERIOD_DAYS = screenConfig.recallPeriodDays;
export const RISK_QUESTION_ID = RISK.questionId;

const LEVEL_ORDER: WellbeingLevel[] = [
  'monitor',
  'support_recommended',
  'prompt_review',
  'urgent',
];

const LEVEL_MESSAGE_KEYS: Record<WellbeingLevel, string> = {
  monitor: 'wellbeing.monitor',
  support_recommended: 'wellbeing.support',
  prompt_review: 'wellbeing.promptReview',
  urgent: 'wellbeing.urgent',
};

const LEVEL_CARE_KEYS: Record<WellbeingLevel, string | undefined> = {
  monitor: undefined,
  support_recommended: 'specialties.counsellor',
  prompt_review: 'specialties.mentalHealthProfessional',
  urgent: 'specialties.emergencyCare',
};

const optionsFor = (question: RawQuestion): RawOption[] => OPTION_SETS[question.optionSet] ?? [];

const toHealthQuestion = (question: RawQuestion): HealthQuestion => ({
  id: question.id,
  type: 'single_choice',
  textKey: question.textKey,
  sectionKey: question.sectionKey,
  required: true,
  options: optionsFor(question).map(({ value, labelKey }) => ({ value, labelKey })),
});

const itemScore = (questionId: string, answers: WellbeingAnswers): number | undefined => {
  const answer = answers[questionId];
  if (answer === undefined) return undefined;
  const question = QUESTIONS.find(({ id }) => id === questionId);
  if (!question) return undefined;
  return optionsFor(question).find((option) => option.value === answer)?.score;
};

/** A scale total, or undefined until every one of its items has been answered. */
export const scaleScore = (scaleId: string, answers: WellbeingAnswers): number | undefined => {
  const scale = SCALES[scaleId];
  if (!scale) return undefined;
  let total = 0;
  for (const questionId of scale.items) {
    const score = itemScore(questionId, answers);
    if (score === undefined) return undefined;
    total += score;
  }
  return total;
};

const conditionsFor = (question: RawQuestion): RawCondition[] =>
  question.showIfScore ? [question.showIfScore] : (question.showIfAnyScore ?? []);

const eligible = (question: RawQuestion, answers: WellbeingAnswers): boolean => {
  const conditions = conditionsFor(question);
  if (!conditions.length) return true;
  return conditions.some((condition) => {
    const score = scaleScore(condition.scale, answers);
    return score !== undefined && score >= condition.atOrAbove;
  });
};

export const riskEndorsed = (answers: WellbeingAnswers): boolean => {
  const score = itemScore(RISK.questionId, answers);
  return score !== undefined && score >= RISK.endorsedWhenScoreAtOrAbove;
};

export const nextQuestion = (
  answers: WellbeingAnswers,
): { question?: HealthQuestion; done: boolean; urgentActionRequired: boolean } => {
  if (RISK.stopsQuestionnaire && riskEndorsed(answers)) {
    return { question: undefined, done: true, urgentActionRequired: true };
  }
  const pending = QUESTIONS.find(
    (question) => answers[question.id] === undefined && eligible(question, answers),
  );
  return {
    question: pending ? toHealthQuestion(pending) : undefined,
    done: pending === undefined,
    urgentActionRequired: false,
  };
};

const bandFor = (scaleId: string, score: number) => {
  const bands = SCALES[scaleId]?.bands ?? [];
  return bands.reduce((chosen, band) => (score >= band.minimum ? band : chosen), bands[0]);
};

export const supportResources = (region?: string): SupportResource[] => {
  const regions = supportConfig.regions as Record<string, { resources: SupportResource[] }>;
  const entry = regions[(region ?? 'IN').toUpperCase()];
  return (entry?.resources ?? []).filter((resource) => resource.verified);
};

export const emergencyNumber = (region?: string): string | undefined => {
  const regions = supportConfig.regions as Record<string, { emergencyNumber?: string }>;
  return regions[(region ?? 'IN').toUpperCase()]?.emergencyNumber;
};

export const screenMetadata = (region = 'IN'): WellbeingScreen => ({
  screenVersion: SCREEN_VERSION,
  recallPeriodDays: RECALL_PERIOD_DAYS,
  baselineQuestionCount: QUESTIONS.filter((question) => !conditionsFor(question).length).length,
  maximumQuestionCount: QUESTIONS.length,
  riskQuestionId: RISK.questionId,
  region,
  emergencyNumber: emergencyNumber(region),
  supportResources: supportResources(region),
});

export const assess = (answers: WellbeingAnswers, region = 'IN'): WellbeingResult => {
  const endorsed = riskEndorsed(answers);
  const scales: WellbeingScaleResult[] = [];
  for (const [id, scale] of Object.entries(SCALES)) {
    const score = scaleScore(id, answers);
    // A partial total would misrepresent an instrument that is scored whole.
    if (score === undefined) continue;
    const band = bandFor(id, score);
    if (!band) continue;
    scales.push({
      id,
      labelKey: scale.labelKey,
      score,
      maximumScore: scale.maximumScore,
      bandLabelKey: band.labelKey,
      level: band.level,
      positive: score >= scale.positiveAtOrAbove,
    });
  }

  // A full-scale total supersedes the ultra-brief screen it stepped up from.
  const supersededBy: Record<string, string> = { phq2: 'phq9', gad2: 'gad7' };
  const reported = new Set(scales.map(({ id }) => id));
  const visible = scales.filter(({ id }) => {
    const replacement = supersededBy[id];
    return !replacement || !reported.has(replacement);
  });

  const rank = visible.reduce(
    (highest, scale) => Math.max(highest, LEVEL_ORDER.indexOf(scale.level)),
    0,
  );
  const level = endorsed ? 'urgent' : (LEVEL_ORDER[rank] ?? 'monitor');

  return {
    urgentActionRequired: endorsed,
    riskItemEndorsed: endorsed,
    level,
    messageKey: LEVEL_MESSAGE_KEYS[level],
    recommendedCareCategoryKey: LEVEL_CARE_KEYS[level],
    scales: visible,
    screenVersion: SCREEN_VERSION,
    emergencyNumber: emergencyNumber(region),
    supportResources: supportResources(region),
  };
};
