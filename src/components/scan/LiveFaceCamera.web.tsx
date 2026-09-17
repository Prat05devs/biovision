import { CameraView } from 'expo-camera';
import { forwardRef, memo, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';

import { mirroredPictureOptions } from '@/services/vision/captureMirroring';
import { faceTrackingService } from '@/services/vision/faceTracking';
import type { LiveFaceCameraHandle, LiveFaceCameraProps } from './LiveFaceCamera.types';

const LiveFaceCameraImpl = forwardRef<LiveFaceCameraHandle, LiveFaceCameraProps>(function LiveFaceCamera(
  { active, onError, onFrame, onReady }, ref,
) {
  const camera = useRef<CameraView>(null);
  useImperativeHandle(ref, () => ({
    async takePicture() {
      const photo = await camera.current?.takePictureAsync(mirroredPictureOptions);
      if (!photo?.uri) throw new Error('Face capture returned no image.');
      return { uri: photo.uri, width: photo.width, height: photo.height };
    },
  }), []);

  useEffect(() => {
    if (!active) return;
    void faceTrackingService.start();
    const interval = setInterval(() => onFrame(faceTrackingService.getLatestFrameState()), 100);
    return () => { clearInterval(interval); void faceTrackingService.stop(); };
  }, [active, onFrame]);

  if (!active) return null;
  return <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="front" mirror onCameraReady={onReady} onMountError={onError} />;
});

export const LiveFaceCamera = memo(LiveFaceCameraImpl);
