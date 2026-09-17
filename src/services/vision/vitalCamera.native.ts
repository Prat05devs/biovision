import type { VitalCameraProvider } from '@/types/vitals';

import { subscribeFaceUpdates } from './facePhysNative';
import { computeHrv } from './facePhysHrv';
import { createVitalAccumulator, VITAL_SCAN_SECONDS } from './vitalAccumulator';

const HRV_INTERVAL_MS = 1000;

/**
 * FacePhys on device. The camera output (attached by LiveFaceCamera with `measureVitals`)
 * runs BlazeFace, the FacePhys SSM, and the SQI/PSD models natively; this provider applies
 * the same gating, HRV, and result rules as the web SDK path.
 */
export const vitalCameraProvider: VitalCameraProvider = {
  async start(onProgress) {
    onProgress({ state: 'initializing', elapsedSeconds: 0, requiredSeconds: VITAL_SCAN_SECONDS });
    const vitals = createVitalAccumulator(onProgress);
    let lastHrvAt = 0;

    const unsubscribe = subscribeFaceUpdates(
      (update) => {
        for (const sample of update.samples) vitals.addBvp(sample.value, sample.timestampMs);
        if (update.heartRate !== undefined || update.signalQuality !== undefined) {
          vitals.addHeartRate(update.heartRate, update.signalQuality);
        }
        else if (update.samples.length) vitals.tick();
        const now = Date.now();
        if (now - lastHrvAt < HRV_INTERVAL_MS) return;
        lastHrvAt = now;
        const window = vitals.hrvWindow();
        const hrv = window ? computeHrv(window) : undefined;
        if (hrv && hrv.rmssd !== null) vitals.setHrv(hrv.rmssd, hrv.sdnn);
        else vitals.setHrv(undefined, undefined);
      },
      (error) => vitals.report('error', error.message),
    );

    vitals.restart();
    vitals.report('warming_up');
    return {
      async stop() {
        unsubscribe();
        return vitals.result();
      },
    };
  },
};
