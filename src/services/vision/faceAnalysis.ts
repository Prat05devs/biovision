import { compareUnderEyeBrightness } from './appearanceMath';
import { analyseEyeRedness, analyseForehead, analyseLipTone, analyseSpots, appearanceThresholds, sampleRegion, type AppearanceCheck, type PixelFrame, type Region } from './appearanceModules';
import type { AppearanceResult } from './appearance.types';
import { calculateRealFeatureProfile, type LandmarkPoint } from './featureProfile';

/**
 * Face-appearance checks and geometry from one MediaPipe Face Landmarker result on a photo.
 * Shared by web (MediaPipe Wasm) and iOS (the same model run natively), so both give identical results.
 */
export function analyzeFaceLandmarks(pixels: PixelFrame, landmarks: LandmarkPoint[], provider: string): AppearanceResult {
  const canvas = { width: pixels.width, height: pixels.height };
  const retake = (reason: AppearanceResult['reason']): AppearanceResult => ({ status: 'retake', provider, reason, finding: 'not_assessed', method: 'landmarks_and_relative_luminance' });
  const a = landmarks[33]!, b = landmarks[263]!, nose = landmarks[1]!;
  const eyeDistance = Math.abs(a.x - b.x);
  if (eyeDistance * canvas.width < 80) return retake('resolution');
  if (Math.abs(a.y - b.y) > eyeDistance * 0.16 || Math.abs(nose.x - (a.x + b.x) / 2) > eyeDistance * 0.18) return retake('pose');
  const mean = (x: number, y: number) => {
    const samples = sampleRegion(pixels, { x, y, rx: eyeDistance * .09, ry: eyeDistance * canvas.width / canvas.height * .035 });
    if (samples.length < appearanceThresholds.minPatchPixels) return NaN;
    const luminance = samples.map(p => p.light).sort((a, b) => a - b);
    return luminance[Math.floor(luminance.length / 2)] ?? NaN;
  };
  // Regions below the model's lower eyelid landmarks, compared with nearby cheek skin.
  const left = landmarks[145]!, right = landmarks[374]!;
  const vertical = eyeDistance * canvas.width / canvas.height;
  const contrast = compareUnderEyeBrightness({
    leftUnder: mean(left.x, left.y + vertical * 0.08), rightUnder: mean(right.x, right.y + vertical * 0.08),
    leftCheek: mean(left.x, left.y + vertical * 0.26), rightCheek: mean(right.x, right.y + vertical * 0.26),
  });
  if (contrast === 'lighting') return retake('lighting');
  const point = (id: number) => landmarks[id]!;
  const faceWidth = Math.abs(point(454).x - point(234).x);
  const patch = (x: number, y: number, rx: number, ry: number): Region => ({ x, y, rx, ry });
  const foreheadY = point(10).y * .35 + point(151).y * .65;
  const foreheadX = point(151).x;
  const forehead = [-1, 0, 1].map(offset => patch(foreheadX + offset * faceWidth * .13, foreheadY, faceWidth * .065, vertical * .055));
  const cheeks = [left, right].map(p => patch(p.x, p.y + vertical * .30, faceWidth * .07, vertical * .10));
  const eyes = [[33, 133, 159, 145], [362, 263, 386, 374]].map(([outer, inner, upper, lower]) => {
    const a = point(outer!), b = point(inner!), top = point(upper!), bottom = point(lower!);
    return patch((a.x + b.x) / 2, (top.y + bottom.y) / 2, Math.abs(a.x - b.x) / 2, Math.abs(bottom.y - top.y) / 2);
  });
  const mouthLeft = point(61), mouthRight = point(291);
  const lipWidth = Math.abs(mouthRight.x - mouthLeft.x);
  const upperOuter = point(0), upperInner = point(13), lowerInner = point(14), lowerOuter = point(17);
  const lips = [
    patch((mouthLeft.x + mouthRight.x) / 2, (upperOuter.y + upperInner.y) / 2, lipWidth * .30, Math.abs(upperInner.y - upperOuter.y) * .32),
    patch((mouthLeft.x + mouthRight.x) / 2, (lowerInner.y + lowerOuter.y) / 2, lipWidth * .30, Math.abs(lowerOuter.y - lowerInner.y) * .32),
  ];
  const checks: AppearanceCheck[] = [
    { id: 'underEyes', status: contrast === 'under_eye_contrast' ? 'noticed' : 'not_flagged', reason: contrast === 'under_eye_contrast' ? 'contrast' : 'no_clear_signal',
      regions: [left, right].map(p => patch(p.x, p.y + vertical * .08, eyeDistance * .09, vertical * .035)) },
    analyseForehead(pixels, forehead),
    analyseSpots(pixels, [...forehead, ...cheeks], faceWidth),
    analyseEyeRedness(pixels, eyes),
    analyseLipTone(pixels, lips, cheeks, lipWidth),
  ];
  const featureProfile = calculateRealFeatureProfile(landmarks, canvas.width / canvas.height);
  return { status: 'complete', provider, finding: contrast, imageSize: { width: canvas.width, height: canvas.height }, checks, featureProfile, ruleVersion: appearanceThresholds.version, method: 'landmarks_and_relative_luminance' };
}
