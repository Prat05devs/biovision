import type { VitalCameraProvider } from '@/types/vitals';

import { createVitalAccumulator, VITAL_SCAN_SECONDS } from './vitalAccumulator';

const MODEL_PATH = '/vitalcamera/models/';

const finite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

export const vitalCameraProvider: VitalCameraProvider = {
  async start(onProgress) {
    const video = document.querySelector('video');
    if (!(video instanceof HTMLVideoElement)) throw new Error('Camera preview is not ready.');

    onProgress({ state: 'initializing', elapsedSeconds: 0, requiredSeconds: VITAL_SCAN_SECONDS });
    const { default: BrowserAdapter } = await import('vitalcamera-sdk/adapter');
    const models = await BrowserAdapter.loadModels(MODEL_PATH, {
      emotion: false,
      gaze: false,
      faceLandmarker: false,
    });
    const adapter = new BrowserAdapter({
      videoElement: video,
      manageCamera: false,
      models,
      modelBasePath: MODEL_PATH,
      workerBasePath: '/vitalcamera/workers/',
      vitalcameraConfig: {
        enableEmotion: false,
        enableGaze: false,
        enableEyeState: false,
        enableFaceLandmarker: false,
        enableHeadPose: true,
        enableHrv: true,
        hrvMinDuration: 15,
      },
    });

    const vitals = createVitalAccumulator(onProgress);
    let stopped = false;

    const onHeartRate = (event: Record<string, unknown>) => vitals.addHeartRate(finite(event.hr), finite(event.sqi));
    const onBvp = (event: Record<string, unknown>) => {
      const value = finite(event.value);
      if (value !== undefined) { vitals.addBvp(value, finite(event.timestamp) ?? Date.now()); vitals.tick(); }
    };
    const onHrv = (event: Record<string, unknown>) =>
      vitals.setHrv(finite(event.rmssd), finite(event.sdnn));
    const onError = (event: Record<string, unknown>) =>
      vitals.report('error', typeof event.message === 'string' ? event.message : 'Signal engine error.');

    await adapter.init();
    adapter.vitalcamera.on('heartrate', onHeartRate).on('bvp', onBvp).on('hrv', onHrv).on('error', onError);
    vitals.restart();
    adapter.start();
    vitals.report('warming_up');

    return {
      async stop() {
        if (!stopped) {
          stopped = true;
          adapter.stop();
          adapter.vitalcamera.off('heartrate', onHeartRate).off('bvp', onBvp).off('hrv', onHrv).off('error', onError);
          await adapter.destroy();
        }
        return vitals.result();
      },
    };
  },
};
