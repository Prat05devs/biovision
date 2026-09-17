import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Camera, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';

import { emptyFaceFrame, FaceFrameTracker, mapToMirroredCoverPreview } from '@/services/vision/faceFrameState';
import { faceCameraOutput, subscribeFaceUpdates } from '@/services/vision/facePhysNative';
import type { FaceLandmark } from '@/types/vision';

import type { LiveFaceCameraHandle, LiveFaceCameraProps } from './LiveFaceCamera.types';

type Size = { width: number; height: number };

/**
 * Native camera with the same MediaPipe Face Landmarker mesh as the web app. Landmarks
 * come from the on-device face pipeline output, which also runs FacePhys when
 * `measureVitals` is set, so the camera session carries a single analysis stream.
 */
const LiveFaceCameraImpl = forwardRef<LiveFaceCameraHandle, LiveFaceCameraProps>(function LiveFaceCamera(
  { active, measureVitals = false, onError, onFrame, onReady }, ref,
) {
  const device = useCameraDevice('front');
  const photoOutput = usePhotoOutput({ containerFormat: 'jpeg', quality: 0.9, qualityPrioritization: 'balanced' });
  const previewSize = useRef<Size>({ width: 0, height: 0 });
  const [tracker] = useState(() => new FaceFrameTracker(measureVitals ? 2 : 3));
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useImperativeHandle(ref, () => ({
    async takePicture() {
      const photo = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      const uri = `file://${photo.filePath}`;
      const dimensions = await new Promise<Size>((resolve, reject) => {
        Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
      });
      return { uri, ...dimensions };
    },
  }), [photoOutput]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    previewSize.current = { width, height };
  }, []);

  useEffect(() => {
    if (!active) {
      tracker.reset();
      onFrameRef.current(emptyFaceFrame());
      return;
    }
    return subscribeFaceUpdates(
      (update) => {
        let preview: FaceLandmark[] | undefined;
        const points = update.landmarks;
        if (points?.length) {
          const source: FaceLandmark[] = new Array(points.length / 3);
          for (let index = 0; index < source.length; index += 1) {
            source[index] = { x: points[index * 3]!, y: points[index * 3 + 1]!, z: points[index * 3 + 2]! };
          }
          preview = mapToMirroredCoverPreview(source, { width: update.frameWidth, height: update.frameHeight }, previewSize.current);
        }
        onFrameRef.current(tracker.update(preview, Date.now()));
      },
      () => onErrorRef.current(),
    );
  }, [active, tracker]);

  // VisionCamera reconfigures the capture session whenever an output instance changes.
  const outputs = useMemo(() => [photoOutput, faceCameraOutput(measureVitals)], [measureVitals, photoOutput]);

  // Measure the wrapper: the mesh is mapped into exactly the area the cover-fit preview fills.
  return (
    <View style={StyleSheet.absoluteFill} onLayout={onLayout}>
      {device ? (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={active}
          outputs={outputs}
          mirrorMode="on"
          onError={onError}
          onPreviewStarted={onReady}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
});

export const LiveFaceCamera = memo(LiveFaceCameraImpl);
