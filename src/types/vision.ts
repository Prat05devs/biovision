import type { SignalQuality } from './assessment';

export type FaceGuidance =
  | 'move_closer'
  | 'move_back'
  | 'center_face'
  | 'hold_still'
  | 'improve_lighting'
  | 'multiple_faces'
  | 'face_not_found'
  | 'ready';

export type FaceScanPhase = 'searching' | 'locking' | 'tracking' | 'complete' | 'unavailable';

export type FaceLandmark = {
  x: number;
  y: number;
  z: number;
};

export type FaceConnection = readonly [start: number, end: number];

export type FaceFrameState = {
  phase: FaceScanPhase;
  guidance: FaceGuidance;
  lighting: SignalQuality;
  position: SignalQuality;
  landmarkCount: number;
  /** Number of vertices in the rendered face surface; detector anchors may differ. */
  surfacePointCount?: number;
  landmarks: FaceLandmark[];
  /** Dense canonical face tessellation supplied by the tracking provider. */
  connections: FaceConnection[];
  /** Landmark-derived oval, brow, eye, nose, and lip contours. */
  contourConnections?: FaceConnection[];
  /** Landmark-derived iris rings, rendered separately for visual hierarchy. */
  irisConnections?: FaceConnection[];
  progress: number;
};

export interface FaceTrackingService {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLatestFrameState(): FaceFrameState;
}

export type VitalSignalState =
  | 'idle'
  | 'preparing'
  | 'capturing'
  | 'signal_searching'
  | 'signal_good'
  | 'signal_poor'
  | 'completed'
  | 'unavailable'
  | 'error';
