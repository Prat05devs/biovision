import type { LifestyleAnswers } from './lifestyle';
import type { VitalScanResult } from './vitals';

export type ScreeningSignal = 'low' | 'moderate' | 'elevated' | 'unavailable';
export type SignalQuality = 'good' | 'poor' | 'unavailable';

export type CaptureModality = 'face_neck' | 'eye_closeup';
export type AnatomicalSide = 'left' | 'right' | 'not_applicable';

export type CaptureAsset = {
  id: string;
  uri: string;
  modality: CaptureModality;
  anatomicalSide: AnatomicalSide;
  capturedAt: string;
  protocolVersion: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/heif';
  width: number;
  height: number;
  sourcePlatform: 'ios' | 'android' | 'web';
  captureSource: 'camera' | 'photo_library';
  /**
   * Whether the stored image is horizontally mirrored relative to the subject.
   * Front-camera captures are mirrored, so `anatomicalSide` cannot be inferred
   * from position in the frame without this flag.
   */
  mirrored: boolean;
  quality: {
    lighting: SignalQuality;
    positioning: SignalQuality;
    landmarkCount?: number;
  };
};

export type QuestionOption = {
  value: string;
  labelKey: string;
};

export type HealthQuestion = {
  id: string;
  type: 'yes_no' | 'single_choice';
  textKey: string;
  required: boolean;
  options?: QuestionOption[];
  sectionKey?: string;
  followUpOf?: string;
};

export type AnswerEvent = {
  questionId: string;
  value: string | boolean | number;
  answeredAt: string;
  questionBankVersion: string;
};

export type HealthAssessmentReport = {
  assessmentId: string;
  urgentActionRequired: boolean;
  urgentKind?: 'medical' | 'mental_health';
  screeningResult: {
    signal: ScreeningSignal;
    labelKey?: string;
    label?: string;
  };
  questionnaireAssessment: {
    level: 'no_specific_concern' | 'follow_up_recommended' | 'prompt_medical_review';
    summaryKey: string;
    evidenceKeys: string[];
  };
  explanation: {
    whatWasObservedKey?: string;
    whatWasObserved?: string;
    whyItMayMatterKey?: string;
    whyItMayMatter?: string;
  };
  recommendedTest?: {
    nameKey?: string;
    name?: string;
  };
  recommendedCare?: {
    categoryKey?: string;
    category?: string;
  };
  urgent?: {
    messageKey?: string;
    message?: string;
    phone?: string;
  };
};

/** Entered by the person before the scan; never inferred from images. */
export type ScreeningProfile = {
  ageYears: number;
  sex: 'female' | 'male';
  pregnant: boolean;
};

export type AssessmentSession = {
  id: string;
  startedAt: string;
  profile?: ScreeningProfile;
  scan: {
    faceQuality?: SignalQuality;
    faceImageUri?: string;
    faceCapture?: CaptureAsset;
    eyeCaptures: Partial<Record<'left' | 'right', CaptureAsset>>;
    eyeImageUploaded?: boolean;
    researchConsent: boolean;
    researchConsentVersion?: string;
    researchConsentGrantedAt?: string;
    /** Derived metrics only. Raw face video is never retained in the session. */
    vitals?: VitalScanResult;
  };
  anemia: {
    signal?: ScreeningSignal;
    internalConfidence?: number;
    observationKeys?: string[];
    estimatedHemoglobinGdl?: number;
    anemiaProbability?: number;
    hemoglobinThresholdGdl?: number;
    modelVersion?: string;
  };
  questionnaire: {
    version: string;
    questions: HealthQuestion[];
    answers: Record<string, string | boolean | number>;
    answerEvents: AnswerEvent[];
  };
  /** Self-reported Phase 0 lifestyle answers. General guidance only, no clinical scoring. */
  lifestyle: LifestyleAnswers;
  finalAssessment?: HealthAssessmentReport;
};
