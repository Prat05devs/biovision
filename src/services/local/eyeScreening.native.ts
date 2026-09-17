import { analyzeEyeImage, type EyeImageResult } from 'biovision-facephys';

import type { ScreeningService } from '@/services/contracts';
import { AppServiceError } from '@/services/errors';

import { interpretHemoglobin, MAX_INTER_EYE_HB_DIFFERENCE_GDL, whoHemoglobinThreshold } from './hemoglobin';

// Same exposure limits as backend/app/captures/quality.py.
const MIN_MEAN_LUMINANCE = 45;
const MAX_MEAN_LUMINANCE = 225;
const MAX_CLIPPED_FRACTION = 0.25;
const MODEL_VERSION = 'conjunctiva-colour-ridge-v1';

const lighting = (result: EyeImageResult) =>
  result.meanLuminance < MIN_MEAN_LUMINANCE ? 'too_dark'
    : result.meanLuminance > MAX_MEAN_LUMINANCE || result.clippedFraction > MAX_CLIPPED_FRACTION ? 'too_bright'
      : 'good';

/** Conjunctiva model on the device: identical pipeline and rules to the API, no upload. */
export const eyeScreeningService: ScreeningService = {
  async analyzeBilateralEyes({ left, right, profile }) {
    let results: EyeImageResult[];
    try {
      const female = profile.sex === 'female';
      results = await Promise.all([analyzeEyeImage(left.uri, female), analyzeEyeImage(right.uri, female)]);
    } catch (error) {
      throw new AppServiceError('MODEL_UNAVAILABLE', error instanceof Error ? error.message : 'Eye screening failed.');
    }
    if (results.some((result) => lighting(result) !== 'good')) {
      throw new AppServiceError('IMAGE_QUALITY_LOW', 'An eye photo is too dark or too bright. Retake it in even, indirect light.');
    }
    const usable = results.filter((result) => result.hemoglobinGdl !== undefined);
    const [leftResult, rightResult] = results;
    if (
      leftResult?.hemoglobinGdl !== undefined && rightResult?.hemoglobinGdl !== undefined &&
      Math.abs(leftResult.hemoglobinGdl - rightResult.hemoglobinGdl) > MAX_INTER_EYE_HB_DIFFERENCE_GDL
    ) {
      throw new AppServiceError('IMAGE_QUALITY_LOW', 'The two eye photos gave very different readings. Retake both in even light.');
    }
    if (!usable.length) {
      return {
        signal: 'unavailable',
        observationKeys: ['conjunctiva_region_not_detected'],
        modelVersion: MODEL_VERSION,
        quality: { acceptable: false, lighting: 'good', sharpness: 'unavailable', regionDetected: false },
      };
    }
    const hemoglobin = usable.reduce((sum, result) => sum + result.hemoglobinGdl!, 0) / usable.length;
    return {
      signal: interpretHemoglobin(hemoglobin, profile),
      estimatedHemoglobinGdl: hemoglobin,
      hemoglobinThresholdGdl: whoHemoglobinThreshold(profile),
      modelVersion: MODEL_VERSION,
      quality: { acceptable: usable.length === 2, lighting: 'good', sharpness: 'unavailable', regionDetected: true },
    };
  },
};
