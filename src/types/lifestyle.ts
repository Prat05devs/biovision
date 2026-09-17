/**
 * Self-reported lifestyle profile.
 *
 * Distinct from the `wellbeing` module, which is the mental-health questionnaire.
 * This module reports general health information against published population
 * guidance. It is not a diagnosis and contributes no clinical scoring.
 */

export type LifestyleAnswerValue = string | number;

export type LifestyleQuestion =
  | {
      id: LifestyleQuestionId;
      type: 'single_choice';
      textKey: string;
      options: { value: string; labelKey: string }[];
    }
  | {
      id: LifestyleQuestionId;
      type: 'number';
      textKey: string;
      unitKey: string;
      min: number;
      max: number;
    };

export type LifestyleQuestionId =
  | 'sleep_hours'
  | 'sleep_quality'
  | 'activity_minutes'
  | 'height_cm'
  | 'weight_kg'
  | 'tobacco'
  | 'alcohol';

export type LifestyleAnswers = Partial<Record<LifestyleQuestionId, LifestyleAnswerValue>>;

/** `attention` means "worth working on", never "you have a condition". */
export type LifestyleStatus = 'ok' | 'attention' | 'unknown';

export type LifestyleFinding = {
  id: string;
  status: LifestyleStatus;
  titleKey: string;
  /** Pre-resolved display value (e.g. "22.4"), when the finding has a number. */
  value?: string;
  valueKey?: string;
  guidanceKey: string;
  /** Where the reference range comes from. Shown to the user. */
  sourceKey: string;
};

export type LifestyleProfile = {
  answeredCount: number;
  totalCount: number;
  bmi?: number;
  findings: LifestyleFinding[];
};
