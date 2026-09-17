import type { HybridObject } from 'react-native-nitro-modules';
import type { CameraOutput } from 'react-native-vision-camera';

/** One FacePhys blood-volume-pulse sample. */
export interface FacePhysSample {
  value: number;
  /** Capture time of the source frame, in milliseconds. */
  timestampMs: number;
}

/** Face box in normalized upright image coordinates (0..1). */
export interface FacePhysFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FacePhysUpdate {
  /** Upright, unmirrored working frame size that landmarks and the face box refer to. */
  frameWidth: number;
  frameHeight: number;
  /** Latest MediaPipe Face Landmarker result: 478 x (x, y, z), normalized to the frame. Absent when no face. */
  landmarks?: number[];
  /** BVP samples produced since the previous update (empty unless measuring vitals). */
  samples: FacePhysSample[];
  /** Heart rate from the most recent PSD run, corrected for the measured frame interval. */
  heartRate?: number;
  /** Signal quality (0..1) from the SQI model for the most recent 450-sample window. */
  signalQuality?: number;
  face?: FacePhysFaceBox;
  framesPerSecond: number;
}

export interface FacePhysOutputOptions {
  /** Run FacePhys heart-rate models as well as face landmarks. */
  measureVitals: boolean;
  onUpdate: (update: FacePhysUpdate) => void;
  onError: (error: Error) => void;
}

export interface FacePhysFactory extends HybridObject<{ ios: 'swift' }> {
  createFacePhysOutput(options: FacePhysOutputOptions): CameraOutput;
}
