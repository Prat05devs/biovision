import { lifestyleQuestions } from '@/data/lifestyleQuestions';
import { activityBands, bmiBands, sleepBands } from '@/data/lifestyleThresholds';
import type {
  LifestyleAnswers,
  LifestyleFinding,
  LifestyleProfile,
} from '@/types/lifestyle';

/**
 * Derives the Phase 0 lifestyle profile from self-reported answers.
 *
 * Deliberately kept out of components: this compares answers against published
 * population reference ranges (see `lifestyleThresholds.ts`) and produces general
 * health information. It performs no clinical scoring, feeds nothing into the
 * anemia signal, and must never claim a condition.
 */

function bmiFinding(answers: LifestyleAnswers): { finding?: LifestyleFinding; bmi?: number } {
  const heightCm = Number(answers.height_cm);
  const weightKg = Number(answers.weight_kg);
  if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg) || heightCm <= 0) {
    return {};
  }

  const metres = heightCm / 100;
  const bmi = weightKg / (metres * metres);
  if (!Number.isFinite(bmi)) return {};

  const band =
    bmi < bmiBands.underweightBelow
      ? 'underweight'
      : bmi < bmiBands.healthyBelow
        ? 'healthy'
        : bmi < bmiBands.overweightBelow
          ? 'overweight'
          : 'high';

  return {
    bmi,
    finding: {
      id: 'bmi',
      status: band === 'healthy' ? 'ok' : 'attention',
      titleKey: 'lifestyle.finding.bmiTitle',
      value: bmi.toFixed(1),
      valueKey: `lifestyle.finding.bmiBand.${band}`,
      guidanceKey: `lifestyle.guidance.bmi.${band}`,
      sourceKey: 'lifestyle.source.bmi',
    },
  };
}

function sleepFinding(answers: LifestyleAnswers): LifestyleFinding | undefined {
  const hours = answers.sleep_hours;
  const quality = answers.sleep_quality;
  if (typeof hours !== 'string') return undefined;

  const adequateDuration = hours === sleepBands.adequate;
  const restedWell = quality === 'rested';
  const band = !adequateDuration
    ? hours === sleepBands.longSleep
      ? 'long'
      : 'short'
    : restedWell
      ? 'good'
      : 'unrefreshing';

  return {
    id: 'sleep',
    status: band === 'good' ? 'ok' : 'attention',
    titleKey: 'lifestyle.finding.sleepTitle',
    valueKey: `lifestyle.finding.sleepBand.${band}`,
    guidanceKey: `lifestyle.guidance.sleep.${band}`,
    sourceKey: 'lifestyle.source.sleep',
  };
}

function activityFinding(answers: LifestyleAnswers): LifestyleFinding | undefined {
  const activity = answers.activity_minutes;
  if (typeof activity !== 'string') return undefined;

  const band =
    activity === activityBands.meetsGuideline
      ? 'meets'
      : activity === '30_to_149'
        ? 'partial'
        : 'low';

  return {
    id: 'activity',
    status: band === 'meets' ? 'ok' : 'attention',
    titleKey: 'lifestyle.finding.activityTitle',
    valueKey: `lifestyle.finding.activityBand.${band}`,
    guidanceKey: `lifestyle.guidance.activity.${band}`,
    sourceKey: 'lifestyle.source.activity',
  };
}

function substanceFinding(
  id: 'tobacco' | 'alcohol',
  answers: LifestyleAnswers,
): LifestyleFinding | undefined {
  const value = answers[id];
  if (typeof value !== 'string') return undefined;

  const usesNone = value === 'never';
  const heavy = value === 'daily' || value === 'regularly';
  const band = usesNone ? 'none' : heavy ? 'frequent' : 'occasional';

  return {
    id,
    status: usesNone ? 'ok' : 'attention',
    titleKey: `lifestyle.finding.${id}Title`,
    valueKey: `lifestyle.finding.${id}Band.${band}`,
    guidanceKey: `lifestyle.guidance.${id}.${band}`,
    sourceKey: `lifestyle.source.${id}`,
  };
}

export function buildLifestyleProfile(answers: LifestyleAnswers): LifestyleProfile {
  const { finding: bmi, bmi: bmiValue } = bmiFinding(answers);

  const findings = [
    bmi,
    sleepFinding(answers),
    activityFinding(answers),
    substanceFinding('tobacco', answers),
    substanceFinding('alcohol', answers),
  ].filter((finding): finding is LifestyleFinding => finding !== undefined);

  // Areas to work on first, so the report leads with what is actionable.
  findings.sort((a, b) => Number(b.status === 'attention') - Number(a.status === 'attention'));

  return {
    answeredCount: lifestyleQuestions.filter(
      (question) => answers[question.id] !== undefined && answers[question.id] !== '',
    ).length,
    totalCount: lifestyleQuestions.length,
    bmi: bmiValue,
    findings,
  };
}
