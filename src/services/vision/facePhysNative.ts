import { createFacePhysOutput, type FacePhysUpdate } from 'biovision-facephys';
import type { CameraOutput } from 'react-native-vision-camera';

type UpdateListener = (update: FacePhysUpdate) => void;
type ErrorListener = (error: Error) => void;

const outputs = new Map<boolean, CameraOutput>();
const updateListeners = new Set<UpdateListener>();
const errorListeners = new Set<ErrorListener>();
let lastError: Error | undefined;

// Development diagnostics: one summary line every 3 s in the Metro terminal.
let diagnosticsAt = 0;
let diagnosticSamples = 0;
function logDiagnostics(update: FacePhysUpdate) {
  diagnosticSamples += update.samples.length;
  const now = Date.now();
  if (now - diagnosticsAt < 3000) return;
  console.log(
    `[face-pipeline] ${update.frameWidth}x${update.frameHeight} @ ${update.framesPerSecond} fps, ` +
    `face=${update.landmarks ? 'yes' : 'no'}, bvp samples=${diagnosticSamples}` +
    (update.signalQuality !== undefined ? `, sqi=${update.signalQuality.toFixed(2)}` : '') +
    (update.heartRate !== undefined ? `, hr=${update.heartRate.toFixed(1)}` : ''),
  );
  diagnosticsAt = now;
  diagnosticSamples = 0;
}

/**
 * The on-device face pipeline output: MediaPipe Face Landmarker for the mesh and,
 * with `measureVitals`, FacePhys heart rate. One instance per mode so switching
 * screens never reconfigures an output another screen is still using.
 */
export function faceCameraOutput(measureVitals: boolean): CameraOutput {
  let output = outputs.get(measureVitals);
  if (!output) {
    output = createFacePhysOutput({
      measureVitals,
      onUpdate: (update) => {
        if (__DEV__) logDiagnostics(update);
        for (const listener of updateListeners) listener(update);
      },
      onError: (error) => {
        lastError = error;
        if (__DEV__) console.warn('[face-pipeline] failed', error);
        for (const listener of errorListeners) listener(error);
      },
    });
    outputs.set(measureVitals, output);
  }
  return output;
}

export function subscribeFaceUpdates(onUpdate: UpdateListener, onError?: ErrorListener) {
  updateListeners.add(onUpdate);
  if (onError) {
    errorListeners.add(onError);
    if (lastError) onError(lastError);
  }
  return () => {
    updateListeners.delete(onUpdate);
    if (onError) errorListeners.delete(onError);
  };
}
