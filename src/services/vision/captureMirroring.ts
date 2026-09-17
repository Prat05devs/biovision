import type { CameraPictureOptions } from 'expo-camera';
import { Platform } from 'react-native';

/**
 * Front-camera output is mirrored on every platform we ship:
 * - iOS/Android: the `mirror` prop on `CameraView` mirrors both the preview and
 *   the saved photo (`isVideoMirrored` on the capture connection / a bitmap
 *   transform in `ResolveTakenPicture`).
 * - Web: the preview element is mirrored unconditionally for the front camera
 *   (`scaleX: -1`), and the `mirror` prop does not reach the still capture.
 *
 * In a mirrored frame the subject sees themselves as in a bathroom mirror, so
 * their anatomical LEFT eye appears in the LEFT half of the frame.
 *
 * The un-mirrored convention — anatomical left on the viewer's right, as used in
 * clinical photography and radiology — does NOT apply to a mirrored preview.
 * Assuming it places every guide overlay over the wrong eye.
 */
export const CAPTURE_IS_MIRRORED = true;

export type EyeSide = 'left' | 'right';

/**
 * Which half of the frame an anatomical side occupies. Overlays are positioned in
 * frame coordinates, so every guide must go through this mapping rather than
 * assuming a side.
 */
export function frameSideFor(side: EyeSide): EyeSide {
  if (CAPTURE_IS_MIRRORED) return side;
  return side === 'left' ? 'right' : 'left';
}

/**
 * Capture options that keep the saved image in the same mirrored orientation as
 * the preview the user aligned against, on every platform.
 *
 * Web needs `isImageMirror` explicitly because its still capture ignores the
 * `mirror` prop; without it, stored laterality would differ between web and
 * native and the left/right conjunctiva comparison would compare mismatched
 * orientations. `imageType` is pinned so the saved file matches the `image/jpeg`
 * mime type recorded on the capture (web otherwise defaults to PNG).
 */
export const mirroredPictureOptions: CameraPictureOptions =
  Platform.OS === 'web'
    ? { quality: 1, skipProcessing: false, isImageMirror: true, imageType: 'jpg' }
    : { quality: 1, skipProcessing: false };
