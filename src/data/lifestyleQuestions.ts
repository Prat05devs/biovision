import type { LifestyleQuestion } from '@/types/lifestyle';

/**
 * Phase 0 lifestyle question bank.
 *
 * Content-only, so wording and options can be reviewed and changed by a clinician
 * without touching screen code. Every band here maps to a published reference
 * range in `lifestyleThresholds.ts` — do not add a question without one.
 */
export const lifestyleQuestions: LifestyleQuestion[] = [
  {
    id: 'sleep_hours',
    type: 'single_choice',
    textKey: 'lifestyle.q.sleepHours',
    options: [
      { value: 'under_5', labelKey: 'lifestyle.opt.sleepUnder5' },
      { value: '5_to_6', labelKey: 'lifestyle.opt.sleep5to6' },
      { value: '7_to_9', labelKey: 'lifestyle.opt.sleep7to9' },
      { value: 'over_9', labelKey: 'lifestyle.opt.sleepOver9' },
    ],
  },
  {
    id: 'sleep_quality',
    type: 'single_choice',
    textKey: 'lifestyle.q.sleepQuality',
    options: [
      { value: 'rested', labelKey: 'lifestyle.opt.restedUsually' },
      { value: 'sometimes', labelKey: 'lifestyle.opt.restedSometimes' },
      { value: 'rarely', labelKey: 'lifestyle.opt.restedRarely' },
    ],
  },
  {
    id: 'activity_minutes',
    type: 'single_choice',
    textKey: 'lifestyle.q.activity',
    options: [
      { value: 'under_30', labelKey: 'lifestyle.opt.activityUnder30' },
      { value: '30_to_149', labelKey: 'lifestyle.opt.activity30to149' },
      { value: '150_plus', labelKey: 'lifestyle.opt.activity150plus' },
    ],
  },
  {
    id: 'height_cm',
    type: 'number',
    textKey: 'lifestyle.q.height',
    unitKey: 'lifestyle.unit.cm',
    min: 100,
    max: 220,
  },
  {
    id: 'weight_kg',
    type: 'number',
    textKey: 'lifestyle.q.weight',
    unitKey: 'lifestyle.unit.kg',
    min: 25,
    max: 200,
  },
  {
    id: 'tobacco',
    type: 'single_choice',
    textKey: 'lifestyle.q.tobacco',
    options: [
      { value: 'never', labelKey: 'lifestyle.opt.never' },
      { value: 'occasionally', labelKey: 'lifestyle.opt.occasionally' },
      { value: 'daily', labelKey: 'lifestyle.opt.daily' },
    ],
  },
  {
    id: 'alcohol',
    type: 'single_choice',
    textKey: 'lifestyle.q.alcohol',
    options: [
      { value: 'never', labelKey: 'lifestyle.opt.never' },
      { value: 'occasionally', labelKey: 'lifestyle.opt.occasionally' },
      { value: 'regularly', labelKey: 'lifestyle.opt.regularly' },
    ],
  },
];
