import type { SignalQuality } from '@/types/assessment';
import type { VitalMetric, VitalScanProgress, VitalScanResult } from '@/types/vitals';

import { baevskyStressIndex, computeHrv, recoveryScore } from './facePhysHrv';
import { derivedMetrics, estimateRespiratoryRate } from './vitalMetrics';

export const VITAL_SCAN_SECONDS = 30;
const WARM_UP_SECONDS = 8;
// FacePhys defaults (vitalcamera-sdk 0.6.9): a heart rate is usable from SQI 0.38,
// and only samples above SQI 0.6 feed HRV once 15 s of clean signal exist.
const MEASURING_SQI = 0.38;
const GOOD_SQI = 0.55;
const HRV_SQI = 0.6;
const HRV_MIN_SECONDS = 15;
const HRV_MAX_WINDOW_MS = 120_000;
const WAVEFORM_SAMPLES = 150;

const median = (values: number[]): number | undefined => {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

/**
 * Collects FacePhys events and turns them into progress and the final result.
 * Shared by the web SDK adapter and the native camera output so both platforms
 * gate, smooth, and report estimates identically.
 */
export function createVitalAccumulator(onProgress: (progress: VitalScanProgress) => void) {
  let startedAt = Date.now();
  let lastSqi = 0;
  let lastState: VitalScanProgress['state'] = 'warming_up';
  let rmssd: number | undefined;
  let sdnn: number | undefined;
  const heartRates: number[] = [];
  const qualities: number[] = [];
  const bvp: { value: number; timestamp: number }[] = [];
  const hrvSamples: { t: number; v: number }[] = [];

  const elapsedSeconds = () => (Date.now() - startedAt) / 1000;

  const report = (state: VitalScanProgress['state'], message?: string) => {
    lastState = state;
    onProgress({
      state,
      elapsedSeconds: Math.min(VITAL_SCAN_SECONDS, elapsedSeconds()),
      requiredSeconds: VITAL_SCAN_SECONDS,
      heartRate: median(heartRates.slice(-8)),
      hrvRmssd: rmssd,
      hrvSdnn: sdnn,
      signalQuality: median(qualities.slice(-8)),
      waveform: bvp.slice(-WAVEFORM_SAMPLES).map(({ value }) => value),
      message,
    });
  };

  return {
    restart() { startedAt = Date.now(); },
    report,
    /** Re-emit the current state so the live waveform keeps moving between estimates. */
    tick() { report(lastState); },
    addHeartRate(hr: number | undefined, sqi: number | undefined) {
      if (hr !== undefined && Number.isFinite(hr) && hr >= 35 && hr <= 220) heartRates.push(hr);
      if (sqi !== undefined && Number.isFinite(sqi)) { qualities.push(sqi); lastSqi = sqi; }
      report(elapsedSeconds() < WARM_UP_SECONDS ? 'warming_up' : (sqi ?? 0) >= MEASURING_SQI ? 'measuring' : 'poor_signal');
    },
    addBvp(value: number, timestamp: number) {
      if (!Number.isFinite(value)) return;
      bvp.push({ value, timestamp });
      if (lastSqi >= HRV_SQI) hrvSamples.push({ t: timestamp, v: value });
      while (hrvSamples.length > 1 && timestamp - hrvSamples[0]!.t > HRV_MAX_WINDOW_MS) hrvSamples.shift();
    },
    /** Clean HRV window, or undefined while the signal is noisy or shorter than 15 s. */
    hrvWindow() {
      if (lastSqi < HRV_SQI || hrvSamples.length < 2) return undefined;
      const seconds = (hrvSamples[hrvSamples.length - 1]!.t - hrvSamples[0]!.t) / 1000;
      return seconds >= HRV_MIN_SECONDS ? hrvSamples.slice() : undefined;
    },
    setHrv(nextRmssd: number | undefined, nextSdnn: number | undefined, message?: string) {
      rmssd = nextRmssd;
      sdnn = nextSdnn;
      report('measuring', message);
    },
    result(): VitalScanResult {
      const heartRate = median(heartRates.filter((_, index) => index >= Math.floor(heartRates.length / 3)));
      const sqi = median(qualities.slice(-12));
      const quality: SignalQuality = sqi !== undefined && sqi >= GOOD_SQI ? 'good' : sqi !== undefined && sqi >= MEASURING_SQI ? 'poor' : 'unavailable';
      const metrics: VitalMetric[] = [];
      const acceptedHeartRate = quality === 'unavailable' ? undefined : heartRate;
      if (acceptedHeartRate !== undefined) {
        metrics.push({ id: 'heartRate', value: Math.round(acceptedHeartRate), unit: 'BPM', evidence: 'camera_model', quality, model: 'FacePhys SSM 0.6.9' });
        // Recompute over the whole clean window so the beat intervals behind the stress index are available.
        const hrv = hrvSamples.length > 1 ? computeHrv(hrvSamples) : undefined;
        const finalRmssd = hrv && hrv.rmssd !== null ? hrv.rmssd : rmssd;
        const finalSdnn = hrv && hrv.rmssd !== null ? hrv.sdnn : sdnn;
        if (finalRmssd !== undefined) {
          metrics.push({ id: 'hrvRmssd', value: Number(finalRmssd.toFixed(1)), unit: 'ms', evidence: 'camera_model', quality, model: 'FacePhys BVP peak pipeline 0.6.9' });
          metrics.push({ id: 'parasympatheticActivity', value: Math.round(recoveryScore(finalRmssd)), unit: '/100', evidence: 'derived', quality, model: '20 · ln(RMSSD)' });
        }
        if (finalSdnn !== undefined) metrics.push({ id: 'hrvSdnn', value: Number(finalSdnn.toFixed(1)), unit: 'ms', evidence: 'camera_model', quality, model: 'FacePhys BVP peak pipeline 0.6.9' });
        const stress = hrv && hrv.rmssd !== null ? baevskyStressIndex(hrv.rr) : undefined;
        if (stress !== undefined) metrics.push({ id: 'stressIndex', value: Math.round(stress), unit: '', evidence: 'derived', quality, model: 'Baevsky stress index' });
        metrics.push(...derivedMetrics(estimateRespiratoryRate(bvp)));
      }
      return {
        capturedAt: new Date().toISOString(),
        durationSeconds: Math.min(VITAL_SCAN_SECONDS, elapsedSeconds()),
        provider: 'facephys-0.6.9',
        rawVideoRetained: false,
        metrics,
        signalQuality: sqi,
      };
    },
  };
}
