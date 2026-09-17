import type { SignalQuality } from './assessment';

export type VitalMetricId =
  | 'heartRate'
  | 'heartRatePos'
  | 'hrvRmssd'
  | 'hrvSdnn'
  | 'respiratoryRate'
  | 'stressIndex'
  | 'parasympatheticActivity'
  | 'cardiacWorkload'
  | 'bloodPressure'
  | 'oxygenSaturation'
  | 'glucose'
  | 'hydration'
  | 'bmi'
  | 'biologicalAge'
  | 'diseaseRisk';

export type MetricEvidence = 'camera_model' | 'derived' | 'demo_only' | 'unavailable';

export type VitalMetric = {
  id: VitalMetricId;
  value?: number;
  secondaryValue?: number;
  unit: string;
  evidence: MetricEvidence;
  quality: SignalQuality;
  model?: string;
  detail?: string;
};

export type VitalScanResult = {
  capturedAt: string;
  durationSeconds: number;
  provider: 'facephys-0.6.9' | 'native-adapter-unavailable' | 'demo';
  rawVideoRetained: false;
  metrics: VitalMetric[];
  signalQuality?: number;
};

export type VitalScanProgress = {
  state: 'initializing' | 'warming_up' | 'measuring' | 'complete' | 'poor_signal' | 'unavailable' | 'error';
  elapsedSeconds: number;
  requiredSeconds: number;
  heartRate?: number;
  hrvRmssd?: number;
  hrvSdnn?: number;
  signalQuality?: number;
  /** Most recent blood-volume-pulse samples, oldest first, for the live waveform. */
  waveform?: number[];
  message?: string;
};

export interface VitalCameraSession {
  stop(): Promise<VitalScanResult>;
}

export interface VitalCameraProvider {
  start(onProgress: (progress: VitalScanProgress) => void): Promise<VitalCameraSession>;
}
