import type { ScreeningProfile, ScreeningSignal } from '@/types/assessment';

/**
 * Half-width of the borderline band around the WHO cut-off, in g/dL.
 *
 * This is not a free parameter: 0.5 is the decision rule the shipped conjunctiva model was
 * evaluated with, so the published performance describes what the app actually does
 * (ml/conjunctiva_colour/README.md — India, n=95: sensitivity 0.71, specificity 0.59). Widening
 * it would be more cautious, but it would also invalidate those figures and the "identified 71%
 * of people with anaemia" statement the app shows, until the rule is re-measured on the dataset.
 *
 * The API path bands differently, by its own model's mean absolute error
 * (backend/app/rules/hemoglobin.py). The two numbers differ because the models differ, not
 * because one of them drifted — do not align them without re-measuring.
 */
export const HB_BORDERLINE_MARGIN_GDL = 0.5;
/** NiADA re-captures when the two eyes disagree by more than this. */
export const MAX_INTER_EYE_HB_DIFFERENCE_GDL = 2.5;

/**
 * WHO 2024 haemoglobin cut-offs for anaemia at sea level (g/dL).
 *
 * Pregnancy is not one number: WHO sets 11.0 for the first and third trimesters and 10.5 for
 * the second, when plasma volume expansion dilutes haemoglobin. The questionnaire asks for the
 * trimester, so use it; without it, 11.0 is the safer default because it flags rather than
 * misses.
 */
export function whoHemoglobinThreshold(profile: ScreeningProfile): number {
  if (profile.pregnant) return profile.trimester === 'second' ? 10.5 : 11.0;
  if (profile.ageYears < 2) return 10.5;
  if (profile.ageYears < 5) return 11.0;
  if (profile.ageYears < 12) return 11.5;
  if (profile.ageYears < 15) return 12.0;
  return profile.sex === 'female' ? 12.0 : 13.0;
}

/** `elevated` = likely low haemoglobin, `moderate` = borderline, `low` = normal. */
export function interpretHemoglobin(estimatedGdl: number, profile: ScreeningProfile): ScreeningSignal {
  const threshold = whoHemoglobinThreshold(profile);
  if (estimatedGdl < threshold - HB_BORDERLINE_MARGIN_GDL) return 'elevated';
  if (estimatedGdl < threshold + HB_BORDERLINE_MARGIN_GDL) return 'moderate';
  return 'low';
}
