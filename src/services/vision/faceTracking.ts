import type { FaceTrackingService } from '@/types/vision';
// Native capture works without fabricated tracking. Register a native frame provider
// through MediaPipeFaceTrackingService when the native module is available.
export const faceTrackingService: FaceTrackingService = {
  async start() {}, async stop() {},
  getLatestFrameState() {
    return { phase: 'unavailable', guidance: 'face_not_found', lighting: 'unavailable', position: 'unavailable', landmarkCount: 0, landmarks: [], connections: [], progress: 0 };
  },
};
export const FACE_TRACKING_MODE: string = 'unavailable';
