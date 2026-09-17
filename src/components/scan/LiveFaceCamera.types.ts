import type { FaceFrameState } from '@/types/vision';

export type CapturedFacePhoto = {
  uri: string;
  width: number;
  height: number;
};

export type LiveFaceCameraHandle = {
  takePicture: () => Promise<CapturedFacePhoto>;
};

export type LiveFaceCameraProps = {
  active: boolean;
  /** Attach the on-device FacePhys heart-rate output (native). Web reads the preview video instead. */
  measureVitals?: boolean;
  onError: () => void;
  onFrame: (frame: FaceFrameState) => void;
  onReady: () => void;
};
