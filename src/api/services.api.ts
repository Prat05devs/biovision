import { deployment } from '@/config/deployment';
import { z } from 'zod';

import { requestJson } from '@/api/client';
import { appendCaptureImage } from '@/api/imageFormData';
import type {
  AssessmentService,
  HealthcareService,
  ObservationService,
  ScreeningService,
  WellbeingService,
} from '@/services/contracts';
import { AppServiceError } from '@/services/errors';
import type { AssessmentSession, CaptureAsset, SignalQuality } from '@/types/assessment';

const screeningSignalSchema = z.enum(['low', 'moderate', 'elevated', 'unavailable']);

const questionSchema = z.object({
  id: z.string(),
  type: z.enum(['yes_no', 'single_choice']),
  textKey: z.string(),
  required: z.boolean(),
  options: z
    .array(z.object({ value: z.string(), labelKey: z.string() }))
    .optional(),
  sectionKey: z.string().optional(),
  followUpOf: z.string().optional(),
});

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

const reportSchema = z.object({
  assessmentId: z.string(),
  urgentActionRequired: z.boolean(),
  screeningResult: z.object({
    signal: screeningSignalSchema,
    labelKey: z.string().optional(),
    label: z.string().optional(),
  }),
  questionnaireAssessment: z.object({
    level: z.enum(['no_specific_concern', 'follow_up_recommended', 'prompt_medical_review']),
    summaryKey: z.string(),
    evidenceKeys: z.array(z.string()),
  }),
  explanation: z.object({
    whatWasObservedKey: z.string().optional(),
    whatWasObserved: z.string().optional(),
    whyItMayMatterKey: z.string().optional(),
    whyItMayMatter: z.string().optional(),
  }),
  recommendedTest: z.object({ nameKey: z.string().optional(), name: z.string().optional() }).optional(),
  recommendedCare: z.object({ categoryKey: z.string().optional(), category: z.string().optional() }).optional(),
  urgent: z.object({ messageKey: z.string().optional(), message: z.string().optional(), phone: z.string().optional() }).nullish(),
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

export const apiAssessmentService: AssessmentService = {
  async nextQuestion(input) {
    const raw = await requestJson('/v1/assessment/next-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const parsed = z
      .object({
        question: questionSchema.optional(),
        done: z.boolean(),
        urgentActionRequired: z.boolean().default(false),
        configVersion: z.string(),
      })
      .refine((value) => value.done || value.question !== undefined)
      .safeParse(raw);
    if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid question response.');
    return parsed.data;
  },
  async complete(session) {
    const raw = await requestJson('/v1/assessment/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: session.id,
        screening: { anemiaSignal: session.anemia.signal },
        answers: session.questionnaire.answers,
      }),
    });
    const parsed = reportSchema.safeParse(raw);
    if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid assessment response.');
    return { ...parsed.data, urgent: parsed.data.urgent ?? undefined };
  },
};

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

const facilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  facilityType: z.enum([
    'hospital',
    'clinic',
    'government_health_centre',
    'diagnostic_lab',
    'mental_health_service',
  ]),
  specialties: z.array(z.string()),
  address: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  distanceKm: z.number().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  directionsUrl: z.string().optional(),
  isGovernment: z.boolean(),
  isVerified: z.boolean().default(true),
});

export const apiHealthcareService: HealthcareService = {
  async listFacilities(input) {
    const params = new URLSearchParams();
    if (input?.latitude !== undefined) params.set('lat', String(input.latitude));
    if (input?.longitude !== undefined) params.set('lng', String(input.longitude));
    const suffix = params.size ? `?${params.toString()}` : '';
    const raw = await requestJson(`/v1/healthcare/facilities${suffix}`, { method: 'GET' });
    const parsed = z.object({ facilities: z.array(facilitySchema) }).safeParse(raw);
    if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid facility response.');
    return parsed.data.facilities;
  },
};

const supportResourceSchema = z.object({
  id: z.string(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  phone: z.string().nullable().optional(),
  alternatePhone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  operator: z.string(),
  availability: z.string(),
  cost: z.string(),
  kind: z.string(),
  verified: z.boolean(),
  verifiedOn: z.string(),
  sourceUrl: z.string(),
});

const nullableToUndefined = <T,>(value: T | null | undefined): T | undefined => value ?? undefined;

const toSupportResource = (resource: z.infer<typeof supportResourceSchema>) => ({
  ...resource,
  phone: nullableToUndefined(resource.phone),
  alternatePhone: nullableToUndefined(resource.alternatePhone),
  website: nullableToUndefined(resource.website),
});

const wellbeingScreenSchema = z.object({
  screenVersion: z.string(),
  recallPeriodDays: z.number().int().positive(),
  baselineQuestionCount: z.number().int().positive(),
  maximumQuestionCount: z.number().int().positive(),
  riskQuestionId: z.string(),
  region: z.string(),
  emergencyNumber: z.string().nullable().optional(),
  // A build with no verified directory must render an honest empty state, not fail.
  supportResources: z.array(supportResourceSchema).default([]),
});

const wellbeingNextQuestionSchema = z.object({
  question: questionSchema.nullable().optional(),
  done: z.boolean(),
  urgentActionRequired: z.boolean(),
  answeredCount: z.number().int().nonnegative(),
  unlockedCount: z.number().int().nonnegative(),
  screenVersion: z.string(),
});

const wellbeingResultSchema = z.object({
  urgentActionRequired: z.boolean(),
  riskItemEndorsed: z.boolean(),
  level: z.enum(['monitor', 'support_recommended', 'prompt_review', 'urgent']),
  messageKey: z.string().optional(),
  message: z.string().optional(),
  recommendedCareCategoryKey: z.string().nullable().optional(),
  recommendedCareCategory: z.string().nullable().optional(),
  scales: z
    .array(
      z.object({
        id: z.string(),
        labelKey: z.string(),
        score: z.number().int().nonnegative(),
        maximumScore: z.number().int().positive(),
        bandLabelKey: z.string(),
        level: z.enum(['monitor', 'support_recommended', 'prompt_review', 'urgent']),
        positive: z.boolean(),
      }),
    )
    .default([]),
  screenVersion: z.string(),
  emergencyNumber: z.string().nullable().optional(),
  supportResources: z.array(supportResourceSchema).default([]),
});

export const apiWellbeingService: WellbeingService = {
  async getScreen() {
    const raw = await requestJson('/v1/wellbeing/screen', { method: 'GET' });
    const parsed = wellbeingScreenSchema.safeParse(raw);
    if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid wellbeing screen.');
    return {
      ...parsed.data,
      emergencyNumber: nullableToUndefined(parsed.data.emergencyNumber),
      supportResources: parsed.data.supportResources.map(toSupportResource),
    };
  },
  async nextQuestion(answers) {
    const raw = await requestJson('/v1/wellbeing/next-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const parsed = wellbeingNextQuestionSchema.safeParse(raw);
    if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid wellbeing step.');
    return { ...parsed.data, question: nullableToUndefined(parsed.data.question) };
  },
  async assess(answers) {
    const raw = await requestJson('/v1/wellbeing/assessment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const parsed = wellbeingResultSchema.safeParse(raw);
    if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid wellbeing response.');
    return {
      ...parsed.data,
      recommendedCareCategoryKey: nullableToUndefined(parsed.data.recommendedCareCategoryKey),
      recommendedCareCategory: nullableToUndefined(parsed.data.recommendedCareCategory),
      emergencyNumber: nullableToUndefined(parsed.data.emergencyNumber),
      supportResources: parsed.data.supportResources.map(toSupportResource),
    };
  },
};

const faceSignSchema = z.object({
  id: z.string(),
  region: z.string(),
  labelKey: z.string(),
  promptKey: z.string(),
  traditionalKey: z.string(),
  clinicalKey: z.string(),
  corroboration: z.enum(['corroborated', 'traditional_only']),
  traditionalSystems: z.array(z.string()),
  traditionalConcept: z.string(),
  clinicalCitation: z.string(),
  priority: z.boolean(),
});

export const apiObservationService: ObservationService = {
  async getSigns() {
    const raw = await requestJson('/v1/observations/signs', { method: 'GET' });
    const parsed = z
      .object({
        signsVersion: z.string(),
        basis: z.string(),
        clinicallyValidated: z.boolean(),
        signs: z.array(faceSignSchema),
      })
      .safeParse(raw);
    if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid sign catalogue.');
    return parsed.data;
  },
  async getProfile({ confirmedSigns, answers }) {
    const raw = await requestJson('/v1/observations/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmedSigns, answers }),
    });
    const parsed = z
      .object({
        signsVersion: z.string(),
        basis: z.string(),
        clinicallyValidated: z.boolean(),
        observedSigns: z.array(faceSignSchema),
        followUpQuestions: z.array(questionSchema),
        answeredCount: z.number().int().nonnegative(),
        questionCount: z.number().int().nonnegative(),
        complete: z.boolean(),
        stage: z.enum(['observation_only', 'complete']),
      })
      .safeParse(raw);
    if (!parsed.success) throw new AppServiceError('INVALID_RESPONSE', 'Invalid observation profile.');
    return parsed.data;
  },
};
