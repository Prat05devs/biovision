import type { FaceLandmarker as FaceLandmarkerInstance } from '@mediapipe/tasks-vision';

import type { FaceTrackingService } from '@/types/vision';

import { emptyFaceFrame, FaceFrameTracker, mapToMirroredCoverPreview } from './faceFrameState';

const WASM_ROOT = '/mediapipe/wasm';
const VISION_BUNDLE_URL = '/mediapipe/vision_bundle.mjs';
const MODEL_URL = '/mediapipe/models/face_landmarker.task';

type MediaPipeVisionModule = typeof import('@mediapipe/tasks-vision');

/** Metro cannot transform MediaPipe's computed Wasm import. Loading the pinned,
 * locally vendored official browser module at runtime leaves that loader in the
 * browser, where it is supported. */
const loadMediaPipeVision = () => {
  const browserImport = new Function('url', 'return import(url)') as (
    url: string,
  ) => Promise<MediaPipeVisionModule>;
  return browserImport(VISION_BUNDLE_URL);
};

class WebMediaPipeFaceTrackingService implements FaceTrackingService {
  private latest = emptyFaceFrame();
  private landmarker?: FaceLandmarkerInstance;
  private animationFrame?: number;
  private running = false;
  private lastVideoTime = -1;
  private readonly tracker = new FaceFrameTracker(3);

  async start() {
    await this.stop();
    this.running = true;
    this.latest = emptyFaceFrame();

    try {
      const { FaceLandmarker, FilesetResolver } = await loadMediaPipeVision();
      const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const options = (delegate: 'GPU' | 'CPU') => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO' as const,
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      try {
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, options('GPU'));
      } catch {
        this.landmarker = await FaceLandmarker.createFromOptions(fileset, options('CPU'));
      }
      this.detectNextFrame();
    } catch (error) {
      console.warn('MediaPipe Face Landmarker failed to initialize.', error);
      this.latest = emptyFaceFrame('unavailable');
      this.running = false;
    }
  }

  async stop() {
    this.running = false;
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
    this.landmarker?.close();
    this.landmarker = undefined;
    this.lastVideoTime = -1;
    this.tracker.reset();
  }

  getLatestFrameState() {
    return this.latest;
  }

  private detectNextFrame = () => {
    if (!this.running || !this.landmarker) return;

    const video = document.querySelector('video');
    if (video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      if (video.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = video.currentTime;
        const now = performance.now();
        const detected = this.landmarker.detectForVideo(video, now).faceLandmarks[0];
        const preview = detected?.length
          ? mapToMirroredCoverPreview(
              detected.map(({ x, y, z }) => ({ x, y, z })),
              { width: video.videoWidth, height: video.videoHeight },
              { width: video.clientWidth, height: video.clientHeight },
            )
          : undefined;
        this.latest = this.tracker.update(preview, now);
      }
    }

    this.animationFrame = requestAnimationFrame(this.detectNextFrame);
  };
}

export const faceTrackingService: FaceTrackingService = new WebMediaPipeFaceTrackingService();
export const FACE_TRACKING_MODE = 'mediapipe';
