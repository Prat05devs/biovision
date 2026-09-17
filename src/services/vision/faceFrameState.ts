import type { FaceFrameState, FaceGuidance, FaceLandmark } from '@/types/vision';

import { LandmarkSmoother } from './landmarkSmoothing';
import { FACE_CONTOURS, FACE_IRISES, FACE_TESSELATION } from './mediapipeFaceConnections';

/** How long a face must stay aligned before capture is enabled. Shared by web and native. */
export const REQUIRED_HOLD_MS = 3_200;

export const emptyFaceFrame = (phase: FaceFrameState['phase'] = 'searching'): FaceFrameState => ({
  phase,
  guidance: 'face_not_found',
  lighting: phase === 'unavailable' ? 'unavailable' : 'poor',
  position: phase === 'unavailable' ? 'unavailable' : 'poor',
  landmarkCount: 0,
  landmarks: [],
  connections: [],
  progress: 0,
});

/**
 * Maps MediaPipe's source-frame coordinates into a mirrored, cover-fit camera preview.
 * Without this transform the mesh drifts and scales independently from the face
 * whenever the preview and camera aspect ratios differ.
 */
export function mapToMirroredCoverPreview(
  landmarks: FaceLandmark[],
  source: { width: number; height: number },
  preview: { width: number; height: number },
): FaceLandmark[] {
  if (!source.width || !source.height || !preview.width || !preview.height) return landmarks;
  const scale = Math.max(preview.width / source.width, preview.height / source.height);
  const visibleWidth = source.width * scale;
  const visibleHeight = source.height * scale;
  const cropX = (visibleWidth - preview.width) / 2;
  const cropY = (visibleHeight - preview.height) / 2;
  return landmarks.map((point) => ({
    x: 1 - ((point.x * visibleWidth - cropX) / preview.width),
    y: (point.y * visibleHeight - cropY) / preview.height,
    z: point.z,
  }));
}

function assessPosition(landmarks: FaceLandmark[]): { guidance: FaceGuidance; acceptable: boolean } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  if (width < 0.2 || height < 0.28) return { guidance: 'move_closer', acceptable: false };
  if (width > 0.72 || height > 0.82) return { guidance: 'move_back', acceptable: false };
  if (Math.abs(centerX - 0.5) > 0.13 || Math.abs(centerY - 0.47) > 0.16) {
    return { guidance: 'center_face', acceptable: false };
  }
  return { guidance: 'hold_still', acceptable: true };
}

/**
 * Turns preview-space Face Landmarker results into the alignment state the scan
 * screens render: smoothing, position guidance, hold-to-capture progress, and the
 * MediaPipe tessellation, contour, and iris connections.
 */
export class FaceFrameTracker {
  private stableSince?: number;
  private readonly smoother: LandmarkSmoother;

  constructor(smoothingWindow = 3) {
    this.smoother = new LandmarkSmoother(smoothingWindow);
  }

  reset() {
    this.stableSince = undefined;
    this.smoother.reset();
  }

  update(previewLandmarks: FaceLandmark[] | undefined, now: number): FaceFrameState {
    if (!previewLandmarks?.length) {
      this.reset();
      return emptyFaceFrame();
    }
    const landmarks = this.smoother.push(previewLandmarks);
    const position = assessPosition(landmarks);
    if (position.acceptable) this.stableSince ??= now;
    else this.stableSince = undefined;

    const elapsed = this.stableSince !== undefined ? now - this.stableSince : 0;
    const progress = Math.min(100, Math.round((elapsed / REQUIRED_HOLD_MS) * 100));
    return {
      phase: progress >= 100 ? 'complete' : elapsed < 280 ? 'locking' : 'tracking',
      guidance: progress >= 100 ? 'ready' : position.guidance,
      lighting: 'good',
      position: position.acceptable ? 'good' : 'poor',
      landmarkCount: landmarks.length,
      surfacePointCount: landmarks.length,
      landmarks,
      connections: FACE_TESSELATION,
      contourConnections: FACE_CONTOURS,
      irisConnections: FACE_IRISES,
      progress,
    };
  }
}
