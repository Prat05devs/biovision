import { deployment } from '@/config/deployment';
import { z } from 'zod';

import { requestJson } from '@/api/client';
import { appendCaptureImage } from '@/api/imageFormData';
import type { ScreeningService } from '@/services/contracts';
import { AppServiceError } from '@/services/errors';
import type { AssessmentSession, CaptureAsset, SignalQuality } from '@/types/assessment';

const screeningSignalSchema = z.enum(['low', 'moderate', 'elevated', 'unavailable']);

const qualityToAppQuality = (value: string | undefined): SignalQuality => {
  if (value === 'good') return 'good';
  if (value === 'poor' || value === 'too_dark' || value === 'too_bright') return 'poor';
  return 'unavailable';
};

const screeningResponseSchema = z.object({
  success: z.boolean(),
  code: z.string().optional(),
  message: z.string().optional(),
  screening: z
    .object({
      type: z.literal('anemia'),
      signal: screeningSignalSchema,
      confidence: z.number().min(0).max(1).optional(),
      observations: z.array(z.string()).optional(),
      measurements: z.object({
        anemiaProbability: z.number().min(0).max(1).optional(),
        estimatedHemoglobinGdl: z.number().optional(),
        hemoglobinThresholdGdl: z.number().optional(),
      }).optional(),
    })
    .optional(),
  quality: z.object({
    acceptable: z.boolean(),
    lighting: z.string(),
    sharpness: z.string(),
    regionDetected: z.boolean(),
  }),
  modelVersion: z.string().nullish(),
});

export const apiScreeningService: ScreeningService = {
  async analyzeBilateralEyes({ left, right, sessionId, profile }) {
    const form = new FormData();
    form.append('sessionId', sessionId);
    form.append('ageYears', String(profile.ageYears));
    form.append('sex', profile.sex);
    form.append('pregnant', String(profile.pregnant));
    await appendCaptureImage(form, left, 'leftImage');
    await appendCaptureImage(form, right, 'rightImage');

    const raw = await requestJson('/v1/screenings/anemia', {
      method: 'POST',
      body: form,
    });
    const parsed = screeningResponseSchema.safeParse(raw);
    if (!parsed.success) {
      if (__DEV__) console.warn('Invalid anemia screening response shape.');
      throw new AppServiceError('INVALID_RESPONSE', 'Invalid screening response.');
    }
    if (!parsed.data.success || !parsed.data.screening) {
      const code = parsed.data.code === 'IMAGE_QUALITY_LOW' ? 'IMAGE_QUALITY_LOW' : 'MODEL_UNAVAILABLE';
      throw new AppServiceError(code, parsed.data.message ?? 'The screening could not be completed.');
    }
    return {
      signal: parsed.data.screening.signal,
      internalConfidence: parsed.data.screening.confidence,
      observationKeys: parsed.data.screening.observations,
      anemiaProbability: parsed.data.screening.measurements?.anemiaProbability,
      estimatedHemoglobinGdl: parsed.data.screening.measurements?.estimatedHemoglobinGdl,
      hemoglobinThresholdGdl: parsed.data.screening.measurements?.hemoglobinThresholdGdl,
      modelVersion: parsed.data.modelVersion ?? undefined,
      quality: {
        acceptable: parsed.data.quality.acceptable,
        lighting: qualityToAppQuality(parsed.data.quality.lighting),
        sharpness: qualityToAppQuality(parsed.data.quality.sharpness),
        regionDetected: parsed.data.quality.regionDetected,
      },
    };
  },
};

const captureReceiptSchema = z.object({
  captureId: z.string(),
  sha256: z.string().length(64),
  byteCount: z.number().int().positive(),
  duplicate: z.boolean(),
  retentionPurpose: z.literal('model_research'),
});

/**
 * Research retention. Both helpers are inert in every shipped deployment: they refuse unless
 * `researchCollectionAvailable` is set, and no manifest sets it.
 *
 * The endpoints they post to (`/v1/captures`, `/v1/research/questionnaire`) were removed from the
 * backend when the app moved on-device, together with the capture store that received them.
 * Restoring collection therefore means restoring the server side from git history — and the
 * clinical, ethics, privacy and security approvals that governed it — not only flipping the flag.
 */
export async function retainResearchCapture(capture: CaptureAsset, session: AssessmentSession) {
  if (
    !deployment.researchCollectionAvailable ||
    !session.scan.researchConsent ||
    !session.scan.researchConsentVersion ||
    !session.scan.researchConsentGrantedAt
  ) {
    throw new AppServiceError('CONFIGURATION_ERROR', 'Research consent is not recorded.', false);
  }

  const form = new FormData();
  form.append('sessionId', session.id);
  form.append('modality', capture.modality);
  form.append('anatomicalSide', capture.anatomicalSide);
  form.append('capturedAt', capture.capturedAt);
  form.append('protocolVersion', capture.protocolVersion);
  form.append('sourcePlatform', capture.sourcePlatform);
  form.append('width', String(capture.width));
  form.append('height', String(capture.height));
  // Front-camera images are mirrored; without this the pipeline cannot resolve
  // anatomicalSide against position in the frame.
  form.append('mirrored', String(capture.mirrored));
  form.append('researchConsent', 'true');
  form.append('consentVersion', session.scan.researchConsentVersion);
  form.append('consentGrantedAt', session.scan.researchConsentGrantedAt);
  form.append('qualityJson', JSON.stringify(capture.quality));
  await appendCaptureImage(form, capture);

  const raw = await requestJson('/v1/captures', { method: 'POST', body: form });
  const parsed = captureReceiptSchema.safeParse(raw);
  if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid capture receipt.');
  return parsed.data;
}

const questionnaireReceiptSchema = z.object({
  questionnaireResponseId: z.string(),
  sha256: z.string().length(64),
  duplicate: z.boolean(),
  retentionPurpose: z.literal('model_research'),
});

export async function retainResearchQuestionnaire(session: AssessmentSession) {
  if (
    !deployment.researchCollectionAvailable ||
    !session.scan.researchConsent ||
    !session.scan.researchConsentVersion ||
    !session.scan.researchConsentGrantedAt
  ) {
    throw new AppServiceError('CONFIGURATION_ERROR', 'Research consent is not recorded.', false);
  }
  const raw = await requestJson('/v1/research/questionnaire', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: session.id,
      researchConsent: true,
      consentVersion: session.scan.researchConsentVersion,
      consentGrantedAt: session.scan.researchConsentGrantedAt,
      questionBankVersion: session.questionnaire.version,
      startedAt: session.startedAt,
      completedAt: new Date().toISOString(),
      answerEvents: session.questionnaire.answerEvents,
    }),
  });
  const parsed = questionnaireReceiptSchema.safeParse(raw);
  if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid questionnaire receipt.');
  return parsed.data;
}
