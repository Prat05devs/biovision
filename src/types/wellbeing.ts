import type { HealthQuestion } from './assessment';

/** Ordered least to most concerning; `urgent` is reserved for an endorsed risk item. */
export type WellbeingLevel = 'monitor' | 'support_recommended' | 'prompt_review' | 'urgent';

export type WellbeingScaleResult = {
  id: string;
  labelKey: string;
  score: number;
  maximumScore: number;
  bandLabelKey: string;
  level: WellbeingLevel;
  positive: boolean;
};

export type SupportResource = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  phone?: string;
  alternatePhone?: string;
  website?: string;
  operator: string;
  availability: string;
  cost: string;
  kind: string;
  /** Only helplines published by an official body are ever marked verified. */
  verified: boolean;
  verifiedOn: string;
  sourceUrl: string;
};

/** Screen metadata and crisis contacts, fetched before the first question. */
export type WellbeingScreen = {
  screenVersion: string;
  recallPeriodDays: number;
  baselineQuestionCount: number;
  maximumQuestionCount: number;
  riskQuestionId: string;
  region: string;
  emergencyNumber?: string;
  supportResources: SupportResource[];
};

export type WellbeingNextQuestion = {
  question?: HealthQuestion;
  done: boolean;
  urgentActionRequired: boolean;
  answeredCount: number;
  /** A stepped screen has no fixed length; progress is shown against what is unlocked. */
  unlockedCount: number;
  screenVersion: string;
};

export type WellbeingResult = {
  urgentActionRequired: boolean;
  riskItemEndorsed: boolean;
  level: WellbeingLevel;
  messageKey?: string;
  message?: string;
  recommendedCareCategoryKey?: string;
  recommendedCareCategory?: string;
  scales: WellbeingScaleResult[];
  screenVersion: string;
  emergencyNumber?: string;
  supportResources: SupportResource[];
};

export type WellbeingAnswers = Record<string, string>;
