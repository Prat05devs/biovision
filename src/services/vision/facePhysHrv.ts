/**
 * HRV from timestamped FacePhys BVP samples. A line-for-line port of `_runHrv`
 * in vitalcamera-sdk 0.6.9's psd.worker.js, so native and web produce the same
 * RMSSD/SDNN for the same signal. `scripts/test-facephys-hrv.cjs` checks parity.
 */
export type BvpSample = { t: number; v: number };

export type HrvResult =
  | { rmssd: number; sdnn: number; meanRR: number; n: number; rr: number[] }
  | { rmssd: null; reject: string };

const median = (sorted: number[]) => sorted[Math.floor(sorted.length / 2)]!;

function detectPeaks(samples: BvpSample[], minIbiMs = 333) {
  const n = samples.length;
  if (n < 6) return [];
  let sum = 0;
  for (const s of samples) sum += s.v;
  const mean = sum / n;
  let sumSq = 0;
  for (const s of samples) { const d = s.v - mean; sumSq += d * d; }
  const thresh = mean + 0.3 * Math.sqrt(sumSq / n);
  const peaks: number[] = [];
  for (let i = 2; i < n - 2; i++) {
    const v = samples[i]!.v;
    if (v > thresh && v >= samples[i - 1]!.v && v >= samples[i + 1]!.v && v >= samples[i - 2]!.v && v >= samples[i + 2]!.v) {
      const last = peaks[peaks.length - 1];
      if (last === undefined || samples[i]!.t - samples[last]!.t >= minIbiMs) peaks.push(i);
      else if (v > samples[last]!.v) peaks[peaks.length - 1] = i;
    }
  }
  return peaks;
}

function refinePeakTimes(indices: number[], samples: BvpSample[]) {
  const n = samples.length;
  return indices.map((i) => {
    if (i <= 0 || i >= n - 1) return samples[i]!.t;
    const x0 = samples[i - 1]!.t, y0 = samples[i - 1]!.v;
    const x1 = samples[i]!.t, y1 = samples[i]!.v;
    const x2 = samples[i + 1]!.t, y2 = samples[i + 1]!.v;
    const denom = (x0 - x1) * (x0 - x2) * (x1 - x2);
    if (Math.abs(denom) < 1e-12) return x1;
    const a = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / denom;
    const b = (x2 * x2 * (y0 - y1) + x1 * x1 * (y2 - y0) + x0 * x0 * (y1 - y2)) / denom;
    if (Math.abs(a) < 1e-12 || a > 0) return x1;
    const xv = -b / (2 * a);
    return xv < x0 || xv > x2 ? x1 : xv;
  });
}

function filterOutliers(rr: number[], k = 0.25) {
  if (rr.length < 4) return rr.slice();
  const mid = median(rr.slice().sort((a, b) => a - b));
  return rr.filter((v) => Math.abs(v - mid) / mid <= k);
}

function filterCompensatingPairs(rr: number[]) {
  if (rr.length < 4) return rr.slice();
  const diffs = rr.slice(1).map((v, i) => Math.abs(v - rr[i]!));
  const q1 = diffs.slice().sort((a, b) => a - b)[Math.floor(diffs.length / 4)]!;
  const meanRR = rr.reduce((sum, v) => sum + v, 0) / rr.length;
  const threshold = Math.max(4 * q1, 0.12 * meanRR);
  const medianRR = median(rr.slice().sort((a, b) => a - b));
  const offMedian = (v: number) => Math.abs(v - medianRR) / medianRR;
  const keep = rr.map(() => true);
  for (let i = 1; i < rr.length; i++) {
    if (diffs[i - 1]! > threshold) {
      const previous = offMedian(rr[i - 1]!), current = offMedian(rr[i]!);
      if (previous > 0.05 && current > 0.05) { keep[i - 1] = false; keep[i] = false; }
      else if (previous > current) keep[i - 1] = false;
      else keep[i] = false;
    }
  }
  return rr.filter((_, i) => keep[i]);
}

export function computeHrv(samples: BvpSample[]): HrvResult {
  if (samples.length < 30) return { rmssd: null, reject: 'too_few_samples' };
  const peaks = detectPeaks(samples);
  if (peaks.length < 6) return { rmssd: null, reject: 'too_few_peaks' };
  const peakTimes = refinePeakTimes(peaks, samples);
  const rrPhys = peakTimes.slice(1).map((t, i) => t - peakTimes[i]!).filter((v) => v >= 300 && v <= 2000);
  if (rrPhys.length < 5) return { rmssd: null, reject: 'rr_below_phys_min' };
  const rrInRange = filterOutliers(rrPhys);
  if (rrInRange.length < 5) return { rmssd: null, reject: 'too_few_after_outlier_filter' };
  const rrClean = filterCompensatingPairs(rrInRange);
  if (rrClean.length < 5) return { rmssd: null, reject: 'too_few_after_compensating_pairs' };
  if ((rrPhys.length - rrClean.length) / rrPhys.length > 0.5) return { rmssd: null, reject: 'high_rejection_rate' };

  let sumSqDiff = 0;
  for (let i = 1; i < rrClean.length; i++) { const d = rrClean[i]! - rrClean[i - 1]!; sumSqDiff += d * d; }
  const meanRR = rrClean.reduce((sum, v) => sum + v, 0) / rrClean.length;
  const sdnn = Math.sqrt(rrClean.reduce((sum, v) => sum + (v - meanRR) * (v - meanRR), 0) / rrClean.length);
  return { rmssd: Math.sqrt(sumSqDiff / (rrClean.length - 1)), sdnn, meanRR, n: rrClean.length, rr: rrClean };
}

/**
 * Baevsky stress index from cleaned RR intervals (ms): AMo / (2 · Mo · MxDMn), with a 50 ms
 * histogram bin, Mo and MxDMn in seconds and AMo in percent. Needs at least 15 intervals.
 */
export function baevskyStressIndex(rr: number[]): number | undefined {
  if (rr.length < 15) return undefined;
  const binMs = 50;
  const counts = new Map<number, number>();
  for (const interval of rr) {
    const bin = Math.floor(interval / binMs);
    counts.set(bin, (counts.get(bin) ?? 0) + 1);
  }
  let modeBin = 0, modeCount = 0;
  for (const [bin, count] of counts) if (count > modeCount) { modeBin = bin; modeCount = count; }
  const mode = ((modeBin + 0.5) * binMs) / 1000;
  const amplitude = (modeCount / rr.length) * 100;
  const range = (Math.max(...rr) - Math.min(...rr)) / 1000;
  if (range <= 0 || mode <= 0) return undefined;
  return amplitude / (2 * mode * range);
}

/** 0-100 recovery (parasympathetic) score: 20 · ln(RMSSD), the scale used by common HRV apps. */
export const recoveryScore = (rmssd: number) => Math.max(0, Math.min(100, 20 * Math.log(rmssd)));
