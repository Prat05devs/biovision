import type { VitalMetric, VitalMetricId } from '@/types/vitals';

export type RangeStatus = 'normal' | 'low' | 'high';

/** `benign` marks the side of the range that is not a concern (e.g. a low stress index). */
type Range = { low?: number; high?: number; unitLabel: string; benign?: RangeStatus };

/**
 * Resting adult reference ranges used to colour results.
 * Heart rate: AHA 60-100 bpm. Breathing: 12-20 per minute. RMSSD and SDNN: short-term
 * resting values (Nunan et al. 2010 normative review). Baevsky stress index: 50-150
 * typical rest. Recovery score: 20·ln(RMSSD), so 60-90 maps to RMSSD ~20-90 ms.
 */
const ranges: Partial<Record<VitalMetricId, Range>> = {
  heartRate: { low: 60, high: 100, unitLabel: 'bpm' },
  respiratoryRate: { low: 12, high: 20, unitLabel: '/min' },
  hrvRmssd: { low: 19, high: 75, unitLabel: 'ms', benign: 'high' },
  hrvSdnn: { low: 32, high: 93, unitLabel: 'ms', benign: 'high' },
  stressIndex: { low: 50, high: 150, unitLabel: '', benign: 'low' },
  parasympatheticActivity: { low: 60, high: 90, unitLabel: '/100', benign: 'high' },
};

export const METRIC_ORDER: VitalMetricId[] = [
  'heartRate', 'hrvRmssd', 'stressIndex', 'parasympatheticActivity', 'respiratoryRate', 'hrvSdnn',
];

export function metricRange(id: VitalMetricId) {
  return ranges[id];
}

export function metricStatus(metric: VitalMetric): RangeStatus | undefined {
  const range = ranges[metric.id];
  if (!range || metric.value === undefined) return undefined;
  const status: RangeStatus = range.low !== undefined && metric.value < range.low ? 'low'
    : range.high !== undefined && metric.value > range.high ? 'high' : 'normal';
  return status === range.benign ? 'normal' : status;
}

export function rangeLabel(id: VitalMetricId): string | undefined {
  const range = ranges[id];
  if (!range) return undefined;
  return `${range.low ?? ''}–${range.high ?? ''}${range.unitLabel ? ` ${range.unitLabel}` : ''}`;
}
