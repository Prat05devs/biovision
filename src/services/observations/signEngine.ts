/**
 * Client-side face-observation signs.
 *
 * Reads the same versioned config as the FastAPI service so the demo mode and
 * the real API offer the same signs and unlock the same follow-up questions.
 */
import signConfig from '@configs/observations/face_signs.v1.json';

import type { HealthQuestion } from '@/types/assessment';
import type { FaceSign, ObservationProfile } from '@/types/observations';

type RawSign = {
  id: string;
  region: string;
  labelKey: string;
  promptKey: string;
  traditionalKey: string;
  clinicalKey: string;
  corroboration: string;
  traditionalSystems: string[];
  traditionalConcept: string;
  clinicalCitation: string;
  followUps: string[];
  priority?: boolean;
};

type RawQuestion = { id: string; textKey: string; options: string[] };

const RAW_SIGNS = signConfig.signs as RawSign[];
const RAW_QUESTIONS = signConfig.followUpQuestions as RawQuestion[];

export const SIGNS_VERSION = signConfig.version;
export const BASIS = signConfig.basis;

const toSign = (raw: RawSign): FaceSign => ({
  id: raw.id,
  region: raw.region,
  labelKey: raw.labelKey,
  promptKey: raw.promptKey,
  traditionalKey: raw.traditionalKey,
  clinicalKey: raw.clinicalKey,
  corroboration: raw.corroboration === 'traditional_only' ? 'traditional_only' : 'corroborated',
  traditionalSystems: raw.traditionalSystems,
  traditionalConcept: raw.traditionalConcept,
  clinicalCitation: raw.clinicalCitation,
  priority: raw.priority === true,
});

export const SIGNS: FaceSign[] = RAW_SIGNS.map(toSign);

const toQuestion = (raw: RawQuestion): HealthQuestion => ({
  id: raw.id,
  type: 'single_choice',
  textKey: raw.textKey,
  required: true,
  options: raw.options.map((value) => ({ value, labelKey: `observations.options.${value}` })),
});

/** Questions unlocked by the confirmed signs, priority signs first, each asked once. */
export const followUpsFor = (confirmed: string[]): HealthQuestion[] => {
  const ordered = RAW_SIGNS.map((sign, index) => ({ sign, index }))
    .filter(({ sign }) => confirmed.includes(sign.id))
    .sort(
      (a, b) =>
        Number(b.sign.priority ?? false) - Number(a.sign.priority ?? false) || a.index - b.index,
    );

  const seen = new Set<string>();
  const questions: HealthQuestion[] = [];
  for (const { sign } of ordered) {
    for (const questionId of sign.followUps) {
      if (seen.has(questionId)) continue;
      const raw = RAW_QUESTIONS.find(({ id }) => id === questionId);
      if (!raw) continue;
      seen.add(questionId);
      questions.push(toQuestion(raw));
    }
  }
  return questions;
};

export const catalogue = () => ({
  signsVersion: SIGNS_VERSION,
  basis: BASIS,
  clinicallyValidated: false,
  signs: SIGNS,
});

export const profile = (
  confirmed: string[],
  answers: Record<string, string>,
): ObservationProfile => {
  const questions = followUpsFor(confirmed);
  const answered = questions.filter((question) => answers[question.id] !== undefined).length;
  const complete = confirmed.length > 0 && answered === questions.length;
  return {
    signsVersion: SIGNS_VERSION,
    basis: BASIS,
    clinicallyValidated: false,
    observedSigns: SIGNS.filter((sign) => confirmed.includes(sign.id)),
    followUpQuestions: questions,
    answeredCount: answered,
    questionCount: questions.length,
    complete,
    stage: complete ? 'complete' : 'observation_only',
  };
};
