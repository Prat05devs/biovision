/**
 * Published reference ranges backing the Phase 0 lifestyle findings.
 *
 * Every value here is a population guideline, not a BioVision decision rule.
 * Keep the citation next to the number so a clinician reviewing this file can
 * check it directly, and update `sourceKey` copy if a threshold changes.
 */

/**
 * Asian-Indian BMI cut-offs, which are LOWER than the global 25/30 because South
 * Asians develop type 2 diabetes, dyslipidaemia and cardiovascular disease at a
 * lower BMI. Using the global thresholds would under-flag this population.
 * Source: revised consensus definition of obesity in Asian Indians.
 */
export const bmiBands = {
  underweightBelow: 18.5,
  healthyBelow: 23,
  overweightBelow: 25,
} as const;

/**
 * Adults aged 18–60 need 7 or more hours of sleep per night.
 * Source: AASM / Sleep Research Society consensus.
 */
export const sleepBands = {
  adequate: '7_to_9',
  longSleep: 'over_9',
} as const;

/**
 * At least 150 minutes of moderate-intensity aerobic activity per week.
 * Source: WHO guidelines on physical activity and sedentary behaviour.
 */
export const activityBands = {
  meetsGuideline: '150_plus',
} as const;
