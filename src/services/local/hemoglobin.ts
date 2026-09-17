import type { ScreeningProfile, ScreeningSignal } from '@/types/assessment';

/** Band half-width around the WHO cut-off (see ml/conjunctiva_colour/README.md for the evaluated rule). */
export const HB_BORDERLINE_MARGIN_GDL = 0.5;
/** NiADA re-captures when the two eyes disagree by more than this. */
export const MAX_INTER_EYE_HB_DIFFERENCE_GDL = 2.5;

/** WHO 2024 haemoglobin cut-offs for anaemia at sea level (g/dL). */
export function whoHemoglobinThreshold(profile: ScreeningProfile): number {
  if (profile.pregnant) return 11.0;
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
