import type {
  AssessmentSession,
  CaptureAsset,
  HealthAssessmentReport,
  HealthQuestion,
  ScreeningProfile,
  ScreeningSignal,
  SignalQuality,
} from '@/types/assessment';
import type { HealthcareFacility } from '@/types/healthcare';
import type {
  FaceSignCatalogue,
  ObservationAnswers,
  ObservationProfile,
} from '@/types/observations';
import type {
  WellbeingAnswers,
  WellbeingNextQuestion,
  WellbeingResult,
  WellbeingScreen,
} from '@/types/wellbeing';

export type ScreeningAnalysis = {
  signal: ScreeningSignal;
  internalConfidence?: number;
  observationKeys?: string[];
  estimatedHemoglobinGdl?: number;
  anemiaProbability?: number;
  hemoglobinThresholdGdl?: number;
  modelVersion?: string;
  quality: {
    acceptable: boolean;
    lighting: SignalQuality;
    sharpness: SignalQuality;
    regionDetected: boolean;
  };
};

/** `mental_health` routes to crisis support (Tele-MANAS) instead of 112. */
export type UrgentKind = 'medical' | 'mental_health';

export interface ScreeningService {
  analyzeBilateralEyes(input: {
    left: CaptureAsset;
    right: CaptureAsset;
    sessionId: string;
    profile: ScreeningProfile;
  }): Promise<ScreeningAnalysis>;
}

export interface AssessmentService {
  nextQuestion(input: {
    sessionId: string;
    anemiaSignal: ScreeningSignal;
    answers: Record<string, string | boolean | number | string[]>;
  }): Promise<{
    question?: HealthQuestion;
    done: boolean;
    urgentActionRequired: boolean;
    urgentKind?: UrgentKind;
    configVersion: string;
  }>;
  complete(session: AssessmentSession): Promise<HealthAssessmentReport>;
}

export interface HealthcareService {
  listFacilities(input?: {
    latitude?: number;
    longitude?: number;
  }): Promise<HealthcareFacility[]>;
}

export interface WellbeingService {
  /** Screen metadata plus crisis contacts, available before the first answer. */
  getScreen(): Promise<WellbeingScreen>;
  /** Stepped administration: the next unlocked question given the answers so far. */
  nextQuestion(answers: WellbeingAnswers): Promise<WellbeingNextQuestion>;
  assess(answers: WellbeingAnswers): Promise<WellbeingResult>;
}

export interface ObservationService {
  /** The catalogue of face signs a person can confirm on their own capture. */
  getSigns(): Promise<FaceSignCatalogue>;
  /** Confirmed signs plus the follow-up questions they unlock. */
  getProfile(input: {
    confirmedSigns: string[];
    answers: ObservationAnswers;
  }): Promise<ObservationProfile>;
}
