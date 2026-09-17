import type { AppearanceCheck } from './appearanceModules';
export type AppearanceResult = {
  imageSize?: { width: number; height: number };
  checks?: AppearanceCheck[];
  featureProfile?: import('./featureProfile').FeatureProfileItem[];
  ruleVersion?: string;
  status: 'complete' | 'unavailable' | 'retake';
  provider: string;
  finding: 'under_eye_contrast' | 'no_clear_contrast' | 'not_assessed';
  reason?: 'no_face' | 'multiple_faces' | 'lighting' | 'pose' | 'resolution' | 'provider_unavailable';
  /** Experimental visual contrast, never a disease prediction or confidence. */
  method: 'landmarks_and_relative_luminance';
};
export interface AppearanceProvider {
  analyze(uri: string): Promise<AppearanceResult>;
}
export const unavailableAppearance = (): AppearanceResult => ({
  status: 'unavailable', provider: 'unavailable', finding: 'not_assessed',
  reason: 'provider_unavailable', method: 'landmarks_and_relative_luminance',
});
