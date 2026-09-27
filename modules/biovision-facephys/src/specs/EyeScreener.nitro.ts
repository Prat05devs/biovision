import type { HybridObject } from 'react-native-nitro-modules';

export interface EyeImageResult {
  /** Mean ITU-R 601 luminance (0-255) and near-white fraction of the photo. */
  meanLuminance: number;
  clippedFraction: number;
  /** Absent when not enough conjunctiva was visible to estimate haemoglobin. */
  hemoglobinGdl?: number;
}

export interface FaceImageResult {
  /** Size of the upright, downscaled image the landmarks and pixels describe. */
  width: number;
  height: number;
  /** RGBA pixels, width x height x 4. */
  pixels: ArrayBuffer;
  /** 478 x (x, y, z) MediaPipe landmarks normalized to width and height; empty when no face was found. */
  landmarks: number[];
}

export interface EyeScreener extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /** Estimates haemoglobin from a local lower-eyelid JPEG, off the JS thread. */
  analyze(path: string, female: boolean): Promise<EyeImageResult>;
  /** Runs MediaPipe Face Landmarker on a local photo (the same model as the web app). */
  detectFace(path: string, maxEdge: number): Promise<FaceImageResult>;
}
