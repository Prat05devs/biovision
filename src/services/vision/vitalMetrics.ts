import type { VitalMetric, VitalScanResult } from '@/types/vitals';

type TimedSample = { value: number; timestamp: number };

const round = (value: number, digits = 0) => Number(value.toFixed(digits));
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

/**
 * Estimates breathing from slow modulation of BVP amplitude.
 *
 * A frequency is returned only when a 24-second-or-longer signal has a clear
 * spectral peak in the resting respiratory band. This deliberately abstains
 * on flat or noisy input instead of turning every capture into a number.
 */
export function estimateRespiratoryRate(samples: TimedSample[]): number | undefined {
  if (samples.length < 360) return undefined;
  const durationMs = samples.at(-1)!.timestamp - samples[0]!.timestamp;
  if (!Number.isFinite(durationMs) || durationMs < 24_000) return undefined;

  const finiteSamples = samples.filter(
    ({ value, timestamp }) => Number.isFinite(value) && Number.isFinite(timestamp),
  );
  if (finiteSamples.length < samples.length * 0.95) return undefined;

  // Convert the pulse waveform into a regularly sampled short-window RMS
  // envelope. Respiration appears as slow amplitude modulation of the BVP.
  const binMs = 500;
  const start = finiteSamples[0]!.timestamp;
  const binCount = Math.floor(durationMs / binMs);
  const bins: number[][] = Array.from({ length: binCount }, () => []);
  const signalMean = mean(finiteSamples.map(({ value }) => value));
  for (const sample of finiteSamples) {
    const index = Math.floor((sample.timestamp - start) / binMs);
    if (index >= 0 && index < bins.length) bins[index]!.push(sample.value - signalMean);
  }
  if (bins.length < 48 || bins.some((bin) => bin.length < 3)) return undefined;
  const envelope = bins.map((bin) => Math.sqrt(mean(bin.map((value) => value * value))));

  // Remove slow drift with a five-second moving average.
  const detrended = envelope.map((value, index) => {
    const from = Math.max(0, index - 5);
    const to = Math.min(envelope.length, index + 6);
    return value - mean(envelope.slice(from, to));
  });
  const variance = mean(detrended.map((value) => value * value));
  if (!Number.isFinite(variance) || variance < 1e-10) return undefined;

  const powers: { rate: number; power: number }[] = [];
  for (let rate = 8; rate <= 30; rate += 0.5) {
    const frequencyHz = rate / 60;
    let real = 0;
    let imaginary = 0;
    for (let index = 0; index < detrended.length; index += 1) {
      const phase = 2 * Math.PI * frequencyHz * (index * binMs / 1000);
      real += detrended[index]! * Math.cos(phase);
      imaginary -= detrended[index]! * Math.sin(phase);
    }
    powers.push({ rate, power: real * real + imaginary * imaginary });
  }
  const ranked = [...powers].sort((a, b) => b.power - a.power);
  const best = ranked[0];
  const background = mean(ranked.slice(Math.ceil(ranked.length * 0.25)).map(({ power }) => power));
  const total = powers.reduce((sum, { power }) => sum + power, 0);
  if (!best || best.power < background * 3 || best.power / total < 0.12) return undefined;
  return round(best.rate, 1);
}

export function derivedMetrics(respiratoryRate: number | undefined): VitalMetric[] {
  if (respiratoryRate === undefined) return [];
  return [{
    id: 'respiratoryRate',
    value: respiratoryRate,
    unit: 'breaths/min',
    evidence: 'derived',
    quality: 'poor',
    model: 'BVP amplitude spectrum v2',
    detail: 'Experimental estimate from a clear slow modulation in the pulse waveform.',
  }];
}

/** Metrics the installed camera model cannot produce. No placeholder values are emitted. */
export function unavailableCameraMetrics(): VitalMetric[] {
  return [
    { id: 'bloodPressure', unit: 'mmHg', evidence: 'unavailable', quality: 'unavailable', detail: 'Needs a validated cuff or a separately validated, calibrated blood-pressure model. FacePhys does not output blood pressure.' },
    { id: 'cardiacWorkload', unit: '×100', evidence: 'unavailable', quality: 'unavailable', detail: 'Rate-pressure product needs a measured systolic blood pressure as well as heart rate.' },
    { id: 'oxygenSaturation', unit: '%', evidence: 'unavailable', quality: 'unavailable', detail: 'Needs a validated pulse oximeter or a separately validated multi-wavelength model.' },
    { id: 'glucose', unit: 'mg/dL', evidence: 'unavailable', quality: 'unavailable', detail: 'Needs a glucometer or CGM. RGB face video cannot measure blood glucose.' },
    { id: 'hydration', unit: '/100', evidence: 'unavailable', quality: 'unavailable', detail: 'No validated camera hydration model is installed.' },
    { id: 'bmi', unit: 'kg/m²', evidence: 'unavailable', quality: 'unavailable', detail: 'BMI requires measured height and weight; it cannot be calculated from facial proportions.' },
    { id: 'biologicalAge', unit: 'years', evidence: 'unavailable', quality: 'unavailable', detail: 'No validated biological-age model or required clinical inputs are present.' },
    { id: 'diseaseRisk', unit: '/100', evidence: 'unavailable', quality: 'unavailable', detail: 'Disease risk needs a condition-specific validated model and its required history or laboratory inputs.' },
  ];
}

export const emptyVitalResult = (provider: VitalScanResult['provider'], durationSeconds: number): VitalScanResult => ({
  capturedAt: new Date().toISOString(), durationSeconds, provider, rawVideoRetained: false, metrics: [],
});
