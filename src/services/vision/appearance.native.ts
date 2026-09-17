import { detectFaceInImage } from 'biovision-facephys';

import { deployment } from '@/config/deployment';

import { analyzeFaceLandmarks } from './faceAnalysis';
import type { AppearanceProvider, AppearanceResult } from './appearance.types';
import { unavailableAppearance } from './appearance.types';
import type { LandmarkPoint } from './featureProfile';

const provider = 'mediapipe-native-appearance-v1';

/** MediaPipe Face Landmarker runs natively on the still; the checks are the web app's own code. */
export const appearanceService: AppearanceProvider = {
  async analyze(uri): Promise<AppearanceResult> {
    if (!deployment.appearance.enabled || !uri.startsWith('file://')) return unavailableAppearance();
    try {
      const face = await detectFaceInImage(uri, 1024);
      if (!face.landmarks.length) {
        return { status: 'retake', provider, reason: 'no_face', finding: 'not_assessed', method: 'landmarks_and_relative_luminance' };
      }
      const landmarks: LandmarkPoint[] = [];
      for (let index = 0; index < face.landmarks.length; index += 3) {
        landmarks.push({ x: face.landmarks[index]!, y: face.landmarks[index + 1]!, z: face.landmarks[index + 2]! });
      }
      const pixels = { width: face.width, height: face.height, data: new Uint8Array(face.pixels) };
      return analyzeFaceLandmarks(pixels, landmarks, provider);
    } catch (error) {
      if (__DEV__) console.warn('Native appearance analysis failed.', error);
      return unavailableAppearance();
    }
  },
};
