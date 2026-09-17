import type { HealthQuestion } from './assessment';

/**
 * How well-supported a sign is. Every shipped sign is `corroborated`: a
 * traditional system and modern clinical sources point at an overlapping area.
 */
export type SignCorroboration = 'corroborated' | 'traditional_only';

export type FaceSign = {
  id: string;
  region: string;
  labelKey: string;
  /** How to check for the sign on your own face. */
  promptKey: string;
  traditionalKey: string;
  clinicalKey: string;
  corroboration: SignCorroboration;
  traditionalSystems: string[];
  traditionalConcept: string;
  clinicalCitation: string;
  priority: boolean;
};

export type FaceSignCatalogue = {
  signsVersion: string;
  basis: string;
  clinicallyValidated: boolean;
  signs: FaceSign[];
};

export type ObservationProfile = {
  signsVersion: string;
  basis: string;
  clinicallyValidated: boolean;
  observedSigns: FaceSign[];
  followUpQuestions: HealthQuestion[];
  answeredCount: number;
  questionCount: number;
  complete: boolean;
  /** `observation_only` is the deliberate "half result" state. */
  stage: 'observation_only' | 'complete';
};

export type ObservationAnswers = Record<string, string>;
