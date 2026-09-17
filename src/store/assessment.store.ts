import { useHealthStore } from './health.store';
import { useAppearanceStore } from './appearance.store';
import { create } from 'zustand';

import type {
  AssessmentSession,
  CaptureAsset,
  HealthAssessmentReport,
  ScreeningProfile,
  HealthQuestion,
  ScreeningSignal,
  SignalQuality,
} from '@/types/assessment';
import type { LifestyleAnswerValue, LifestyleQuestionId } from '@/types/lifestyle';
import type { ObservationAnswers } from '@/types/observations';
import type { VitalScanResult } from '@/types/vitals';
import type {
  WellbeingAnswers,
  WellbeingResult,
  WellbeingScreen,
} from '@/types/wellbeing';

/** Stepped-screen progress. Kept in memory only, like the rest of the session. */
type WellbeingState = {
  screen?: WellbeingScreen;
  answers: WellbeingAnswers;
  /** Ask order, so a back step removes exactly the question that was last asked. */
  order: string[];
  result?: WellbeingResult;
  startedAt?: string;
};

const createWellbeing = (): WellbeingState => ({ answers: {}, order: [] });

/** Face signs the person confirmed on their own capture, and the answers they unlocked. */
type ObservationState = {
  confirmedSigns: string[];
  answers: ObservationAnswers;
};

const createObservations = (): ObservationState => ({ confirmedSigns: [], answers: {} });

const createSession = (): AssessmentSession => ({
  id: `session_${Date.now()}`,
  startedAt: new Date().toISOString(),
  scan: { researchConsent: false, eyeCaptures: {} },
  anemia: {},
  questionnaire: { version: 'unknown', questions: [], answers: {}, answerEvents: [] },
  lifestyle: {},
});

type AssessmentState = {
  session: AssessmentSession;
  wellbeing: WellbeingState;
  observations: ObservationState;
  wellbeingResult?: WellbeingResult;
  resetSession: () => void;
  setProfile: (profile: ScreeningProfile) => void;
  setFaceQuality: (quality: SignalQuality) => void;
  setFaceImage: (uri: string | undefined) => void;
  setFaceCapture: (capture: CaptureAsset | undefined) => void;
  setVitalScan: (result: VitalScanResult | undefined) => void;
  setEyeCapture: (side: 'left' | 'right', capture: CaptureAsset | undefined) => void;
  clearEyeCaptures: () => void;
  setResearchConsent: (granted: boolean) => void;
  setEyeImageUploaded: (uploaded: boolean) => void;
  setAnemiaResult: (
    signal: ScreeningSignal,
    internalConfidence?: number,
    observationKeys?: string[],
    measurements?: { estimatedHemoglobinGdl?: number; anemiaProbability?: number; hemoglobinThresholdGdl?: number; modelVersion?: string },
  ) => void;
  setQuestions: (questions: HealthQuestion[], version: string) => void;
  addQuestion: (question: HealthQuestion) => void;
  answerQuestion: (id: string, value: string | boolean | number) => void;
  setLifestyleAnswer: (id: LifestyleQuestionId, value: LifestyleAnswerValue) => void;
  setFinalAssessment: (report: HealthAssessmentReport) => void;
  setWellbeingResult: (result: WellbeingResult | undefined) => void;
  startWellbeing: (screen: WellbeingScreen) => void;
  answerWellbeing: (id: string, value: string) => void;
  stepBackWellbeing: () => void;
  resetWellbeing: () => void;
  toggleObservationSign: (id: string) => void;
  setObservationAnswer: (id: string, value: string) => void;
  resetObservations: () => void;
};

export const useAssessmentStore = create<AssessmentState>((set) => ({
  session: createSession(),
  wellbeing: createWellbeing(),
  observations: createObservations(),
  wellbeingResult: undefined,
  resetSession: () => { useHealthStore.getState().reset(); useAppearanceStore.getState().reset(); set({ session: createSession(), observations: createObservations() }); },
  setProfile: (profile) => set((state) => ({ session: { ...state.session, profile } })),
  setFaceQuality: (quality) =>
    set((state) => ({
      session: { ...state.session, scan: { ...state.session.scan, faceQuality: quality } },
    })),
  setFaceImage: (faceImageUri) =>
    set((state) => ({
      session: {
        ...state.session,
        scan: { ...state.session.scan, faceImageUri },
      },
    })),
  setFaceCapture: (faceCapture) =>
    set((state) => ({
      session: {
        ...state.session,
        scan: { ...state.session.scan, faceCapture, faceImageUri: faceCapture?.uri },
      },
    })),
  setVitalScan: (vitals) =>
    set((state) => ({
      session: {
        ...state.session,
        scan: { ...state.session.scan, vitals },
      },
    })),
  setEyeCapture: (side, eyeCapture) =>
    set((state) => ({
      session: {
        ...state.session,
        scan: {
          ...state.session.scan,
          eyeCaptures: {
            ...state.session.scan.eyeCaptures,
            [side]: eyeCapture,
          },
          eyeImageUploaded: false,
        },
      },
    })),
  clearEyeCaptures: () =>
    set((state) => ({
      session: {
        ...state.session,
        scan: {
          ...state.session.scan,
          eyeCaptures: {},
          eyeImageUploaded: false,
        },
      },
    })),
  setResearchConsent: (researchConsent) =>
    set((state) => ({
      session: {
        ...state.session,
        scan: {
          ...state.session.scan,
          researchConsent,
          researchConsentVersion: researchConsent ? 'research-captures-and-responses-v2' : undefined,
          researchConsentGrantedAt: researchConsent ? new Date().toISOString() : undefined,
        },
      },
    })),
  setEyeImageUploaded: (eyeImageUploaded) =>
    set((state) => ({
      session: {
        ...state.session,
        scan: { ...state.session.scan, eyeImageUploaded },
      },
    })),
  setAnemiaResult: (signal, internalConfidence, observationKeys, measurements) =>
    set((state) => ({
      session: {
        ...state.session,
        anemia: { signal, internalConfidence, observationKeys, ...measurements },
      },
    })),
  setQuestions: (questions, version) =>
    set((state) => ({
      session: {
        ...state.session,
        questionnaire: { version, questions, answers: {}, answerEvents: [] },
      },
    })),
  addQuestion: (question) =>
    set((state) => ({
      session: {
        ...state.session,
        questionnaire: {
          ...state.session.questionnaire,
          questions: state.session.questionnaire.questions.some(({ id }) => id === question.id)
            ? state.session.questionnaire.questions
            : [...state.session.questionnaire.questions, question],
        },
      },
    })),
  answerQuestion: (id, value) =>
    set((state) => ({
      session: {
        ...state.session,
        questionnaire: {
          ...state.session.questionnaire,
          answers: { ...state.session.questionnaire.answers, [id]: value },
          answerEvents: [
            ...state.session.questionnaire.answerEvents.filter((event) => event.questionId !== id),
            {
              questionId: id,
              value,
              answeredAt: new Date().toISOString(),
              questionBankVersion: state.session.questionnaire.version,
            },
          ],
        },
      },
    })),
  setLifestyleAnswer: (id, value) =>
    set((state) => ({
      session: {
        ...state.session,
        lifestyle: { ...state.session.lifestyle, [id]: value },
      },
    })),
  setFinalAssessment: (finalAssessment) =>
    set((state) => ({ session: { ...state.session, finalAssessment } })),
  setWellbeingResult: (wellbeingResult) =>
    set((state) => ({
      wellbeingResult,
      wellbeing: { ...state.wellbeing, result: wellbeingResult },
    })),
  startWellbeing: (screen) =>
    set({
      wellbeing: { ...createWellbeing(), screen, startedAt: new Date().toISOString() },
      wellbeingResult: undefined,
    }),
  answerWellbeing: (id, value) =>
    set((state) => ({
      wellbeing: {
        ...state.wellbeing,
        answers: { ...state.wellbeing.answers, [id]: value },
        order: state.wellbeing.order.includes(id)
          ? state.wellbeing.order
          : [...state.wellbeing.order, id],
      },
    })),
  stepBackWellbeing: () =>
    set((state) => {
      const order = [...state.wellbeing.order];
      const last = order.pop();
      if (last === undefined) return state;
      const answers = { ...state.wellbeing.answers };
      // Later answers can only exist for questions this one unlocked, and the
      // ask order is append-only, so dropping the last entry is sufficient.
      delete answers[last];
      return { wellbeing: { ...state.wellbeing, answers, order } };
    }),
  resetWellbeing: () => set({ wellbeing: createWellbeing(), wellbeingResult: undefined }),
  toggleObservationSign: (id) =>
    set((state) => {
      const confirmed = state.observations.confirmedSigns.includes(id)
        ? state.observations.confirmedSigns.filter((sign) => sign !== id)
        : [...state.observations.confirmedSigns, id];
      // Unconfirming a sign can close questions that only it opened, so any
      // answer no longer reachable is dropped rather than silently submitted.
      return { observations: { ...state.observations, confirmedSigns: confirmed } };
    }),
  setObservationAnswer: (id, value) =>
    set((state) => ({
      observations: {
        ...state.observations,
        answers: { ...state.observations.answers, [id]: value },
      },
    })),
  resetObservations: () => set({ observations: createObservations() }),
}));
