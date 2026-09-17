import type {
  FaceConnection,
  FaceFrameState,
  FaceGuidance,
  FaceLandmark,
  FaceTrackingService,
} from '@/types/vision';
import type { SignalQuality } from '@/types/assessment';

import { LandmarkSmoother } from './landmarkSmoothing';

/**
 * Shape expected from a VisionCamera frame processor or native MediaPipe bridge.
 * Keep package-specific types outside screens so the provider can be replaced safely.
 */
export type MediaPipeFrame = {
  landmarks: FaceLandmark[];
  connections: FaceConnection[];
  contourConnections?: FaceConnection[];
  irisConnections?: FaceConnection[];
  guidance: FaceGuidance;
  lighting: SignalQuality;
  position: SignalQuality;
  progress: number;
};

export interface MediaPipeFrameProvider {
  start(onFrame: (frame: MediaPipeFrame) => void): Promise<void>;
  stop(): Promise<void>;
}

const emptyState = (): FaceFrameState => ({
  phase: 'searching',
  guidance: 'face_not_found',
  lighting: 'unavailable',
  position: 'unavailable',
  landmarkCount: 0,
  landmarks: [],
  connections: [],
  progress: 0,
});

/** Adapts real MediaPipe frames into the stable UI contract with four-frame smoothing. */
export class MediaPipeFaceTrackingService implements FaceTrackingService {
  private latest = emptyState();
  private firstFaceAt?: number;
  private readonly smoother = new LandmarkSmoother(4);

  constructor(private readonly provider: MediaPipeFrameProvider) {}

  async start() {
    this.latest = emptyState();
    this.firstFaceAt = undefined;
    this.smoother.reset();
    await this.provider.start((frame) => {
      if (!frame.landmarks.length) {
        this.latest = { ...emptyState(), lighting: frame.lighting };
        this.firstFaceAt = undefined;
        return;
      }

      this.firstFaceAt ??= Date.now();
      const locking = Date.now() - this.firstFaceAt < 200;
      const landmarks = this.smoother.push(frame.landmarks);
      this.latest = {
        phase: frame.progress >= 100 ? 'complete' : locking ? 'locking' : 'tracking',
        guidance: frame.guidance,
        lighting: frame.lighting,
        position: frame.position,
        landmarkCount: landmarks.length,
        landmarks,
        connections: frame.connections,
        contourConnections: frame.contourConnections,
        irisConnections: frame.irisConnections,
        progress: frame.progress,
      };
    });
  }

  async stop() {
    await this.provider.stop();
    this.latest = emptyState();
    this.firstFaceAt = undefined;
    this.smoother.reset();
  }

  getLatestFrameState() {
    return this.latest;
  }
}
