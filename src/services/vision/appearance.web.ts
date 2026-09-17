import type { FaceLandmarker as Landmarker } from '@mediapipe/tasks-vision';
import type { AppearanceProvider, AppearanceResult } from './appearance.types';
import { unavailableAppearance } from './appearance.types';
import { analyzeFaceLandmarks } from './faceAnalysis';
import { deployment } from '@/config/deployment';
const provider = 'mediapipe-local-appearance-v1';
export const appearanceService: AppearanceProvider = {
  async analyze(uri) {
    if (!deployment.appearance.enabled || deployment.appearance.provider !== provider) return unavailableAppearance();
    let detector: Landmarker | undefined;
    try {
      // Only process our local capture; never fetch a third-party face URL.
      if (!/^(data:image\/|blob:)/.test(uri)) return unavailableAppearance();
      const photo = new Image();
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { photo.src = ''; reject(new Error('Image timeout')); }, 15000);
        photo.onload = () => { clearTimeout(timeout); resolve(); };
        photo.onerror = () => { clearTimeout(timeout); reject(new Error('Image unavailable')); };
        photo.src = uri;
      });
      const retake = (reason: AppearanceResult['reason']): AppearanceResult => ({ status: 'retake', provider, reason, finding: 'not_assessed', method: 'landmarks_and_relative_luminance' });
      if (photo.naturalWidth < 320 || photo.naturalHeight < 320) return retake('resolution');
      const load = new Function('url', 'return import(url)') as (url: string) => Promise<typeof import('@mediapipe/tasks-vision')>;
      const { FaceLandmarker, FilesetResolver } = await load('/mediapipe/vision_bundle.mjs');
      detector = await FaceLandmarker.createFromOptions(await FilesetResolver.forVisionTasks('/mediapipe/wasm'), {
        baseOptions: { modelAssetPath: '/mediapipe/models/face_landmarker.task', delegate: 'CPU' },
        runningMode: 'IMAGE', numFaces: 2, minFaceDetectionConfidence: 0.65, minFacePresenceConfidence: 0.65,
      });
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1024 / Math.max(photo.naturalWidth, photo.naturalHeight));
      canvas.width = Math.round(photo.naturalWidth * scale); canvas.height = Math.round(photo.naturalHeight * scale);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return unavailableAppearance();
      context.drawImage(photo, 0, 0, canvas.width, canvas.height);
      const detected = detector.detect(canvas).faceLandmarks;
      if (detected.length !== 1) return retake(detected.length ? 'multiple_faces' : 'no_face');
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      return analyzeFaceLandmarks(pixels, detected[0]!, provider);
    } catch { return unavailableAppearance(); }
    finally { detector?.close(); }
  },
};
