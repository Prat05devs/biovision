import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View, useWindowDimensions, type AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { FaceMeshOverlay } from '@/components/scan/FaceMeshOverlay';
import { LiveFaceCamera } from '@/components/scan/LiveFaceCamera';
import type { LiveFaceCameraHandle } from '@/components/scan/LiveFaceCamera.types';
import { BeatingHeart, CaptureButton, GlassIconButton, GlassPill, PulseWaveform, scanColors } from '@/components/scan/ScanHud';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { appearanceService } from '@/services/vision/appearance';
import { CAPTURE_IS_MIRRORED } from '@/services/vision/captureMirroring';
import { emptyFaceFrame } from '@/services/vision/faceFrameState';
import { VITAL_SCAN_SECONDS } from '@/services/vision/vitalAccumulator';
import { vitalCameraProvider } from '@/services/vision/vitalCamera';
import { captureCurrentVideoFrame } from '@/services/vision/videoFrameCapture';
import { useAppearanceStore } from '@/store/appearance.store';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, spacing } from '@/theme/tokens';
import type { FaceFrameState } from '@/types/vision';
import type { VitalCameraSession, VitalScanProgress } from '@/types/vitals';

const initialProgress: VitalScanProgress = { state: 'initializing', elapsedSeconds: 0, requiredSeconds: VITAL_SCAN_SECONDS };

export default function FaceScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [frame, setFrame] = useState<FaceFrameState>(() => emptyFaceFrame());
  const frameRef = useRef(frame);
  const [progress, setProgress] = useState(initialProgress);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [recording, setRecording] = useState(false);
  const [weakSignal, setWeakSignal] = useState(false);
  const [startedAt, setStartedAt] = useState<number>();
  const [now, setNow] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const cameraRef = useRef<LiveFaceCameraHandle | null>(null);
  const sessionRef = useRef<VitalCameraSession | undefined>(undefined);
  const finishingRef = useRef(false);
  const setVitalScan = useAssessmentStore((state) => state.setVitalScan);
  const setFaceCapture = useAssessmentStore((state) => state.setFaceCapture);
  const setFaceQuality = useAssessmentStore((state) => state.setFaceQuality);

  useFocusEffect(useCallback(() => {
    setIsFocused(true);
    return () => setIsFocused(false);
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => () => { void sessionRef.current?.stop(); sessionRef.current = undefined; }, []);

  /** Grabs one still for the face-appearance checks and starts analysing it in the background. */
  const captureStill = useCallback(async () => {
    let photo = await captureCurrentVideoFrame();
    if (!photo && cameraRef.current) {
      photo = await Promise.race([
        cameraRef.current.takePicture(),
        new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 2500)),
      ]).catch(() => undefined);
    }
    if (!photo?.uri) return;
    const latest = frameRef.current;
    setFaceQuality(latest.position === 'good' ? 'good' : 'poor');
    setFaceCapture({
      id: `face_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      uri: photo.uri,
      modality: 'face_neck',
      anatomicalSide: 'not_applicable',
      capturedAt: new Date().toISOString(),
      protocolVersion: 'face-video-vitals-v2-auto-still',
      mimeType: 'image/jpeg',
      width: photo.width,
      height: photo.height,
      sourcePlatform: Platform.OS as 'ios' | 'android' | 'web',
      captureSource: 'camera',
      mirrored: CAPTURE_IS_MIRRORED,
      quality: { lighting: latest.lighting, positioning: latest.position, landmarkCount: latest.landmarkCount },
    });
    const uri = photo.uri;
    const appearance = useAppearanceStore.getState();
    appearance.reset();
    void appearanceService.analyze(uri).then((result) => useAppearanceStore.getState().setResult(uri, result)).catch(() => undefined);
  }, [setFaceCapture, setFaceQuality]);

  const finish = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || finishingRef.current) return;
    finishingRef.current = true;
    sessionRef.current = undefined;
    try {
      const [result] = await Promise.all([session.stop(), captureStill()]);
      setVitalScan(result);
      if (result.metrics.some((metric) => metric.id === 'heartRate')) {
        router.replace('/scan/eye-instructions');
      } else {
        setWeakSignal(true);
      }
    } finally {
      finishingRef.current = false;
      setRecording(false);
      setStartedAt(undefined);
    }
  }, [captureStill, setVitalScan]);

  useEffect(() => {
    if (!recording || startedAt === undefined) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current - startedAt >= VITAL_SCAN_SECONDS * 1000) void finish();
    }, 200);
    return () => clearInterval(interval);
  }, [finish, recording, startedAt]);

  const handleFrame = useCallback((next: FaceFrameState) => {
    frameRef.current = next;
    setFrame(next);
  }, []);
  const handleReady = useCallback(() => setCameraReady(true), []);
  const handleCameraError = useCallback(() => setCameraError(true), []);

  const aligned = frame.position === 'good';
  const start = async () => {
    if (!cameraReady || !aligned || recording) return;
    setWeakSignal(false);
    setProgress(initialProgress);
    setRecording(true);
    try {
      sessionRef.current = await vitalCameraProvider.start(setProgress);
      setNow(Date.now());
      setStartedAt(Date.now());
    } catch {
      setRecording(false);
      setCameraError(true);
    }
  };

  const elapsed = startedAt === undefined ? 0 : Math.min(VITAL_SCAN_SECONDS, (now - startedAt) / 1000);
  const secondsLeft = Math.ceil(VITAL_SCAN_SECONDS - elapsed);
  const guidance = recording
    ? t(`vitals.state.${progress.state === 'initializing' ? 'warming_up' : progress.state}`)
    : cameraError ? t('vitals.cameraError')
      : weakSignal ? t('vitals.weakSignal')
        : t(`face.guidance.${frame.guidance}`);
  const heartRate = progress.heartRate && progress.state !== 'warming_up' ? Math.round(progress.heartRate) : undefined;
  const cardWidth = Math.min(width - spacing.lg * 2, 420);

  return (
    <View style={styles.container}>
      <LiveFaceCamera
        ref={cameraRef}
        active={isFocused && appState === 'active'}
        measureVitals
        onFrame={handleFrame}
        onReady={handleReady}
        onError={handleCameraError}
      />
      <View style={StyleSheet.absoluteFill} pointerEvents="none"><FaceMeshOverlay frame={frame} minimal /></View>

      <View style={[styles.topBar, { top: insets.top + spacing.xs }]}>
        <GlassIconButton icon="arrowBack" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <GlassPill><AppText variant="small" color={colors.white} style={styles.title}>{t('vitals.title')}</AppText></GlassPill>
        <GlassIconButton icon="close" label={t('common.home')} onPress={() => router.replace('/')} />
      </View>

      <View style={[styles.guidance, { top: insets.top + 64 }]} pointerEvents="none">
        <GlassPill>
          <View style={[styles.dot, { backgroundColor: aligned || recording ? scanColors.mint : '#FFC66D' }]} />
          <AppText variant="small" color={colors.white}>{guidance}</AppText>
        </GlassPill>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        {recording ? (
          <View style={[styles.liveCard, { width: cardWidth }]}>
            <View style={styles.liveHeader}>
              <BeatingHeart bpm={heartRate} />
              <AppText style={styles.bpm} color={colors.white}>{heartRate ?? '--'}</AppText>
              <AppText variant="small" color={scanColors.textMuted}>BPM</AppText>
              <View style={styles.liveStats}>
                <Stat label="HRV" value={progress.hrvRmssd === undefined ? '--' : `${Math.round(progress.hrvRmssd)} ms`} />
                <Stat label={t('vitals.signal')} value={progress.signalQuality === undefined ? '--' : `${Math.round(progress.signalQuality * 100)}%`} />
              </View>
            </View>
            <PulseWaveform samples={progress.waveform} width={cardWidth - spacing.lg * 2} height={54} />
          </View>
        ) : weakSignal ? (
          <View style={[styles.liveCard, { width: cardWidth }]}>
            <AppText variant="h3" color={colors.white}>{t('vitals.weakSignalTitle')}</AppText>
            <AppText variant="small" color={scanColors.textMuted}>{t('vitals.weakSignalBody')}</AppText>
            <Button label={t('vitals.continueWithout')} variant="outline" onPress={() => router.replace('/scan/eye-instructions')} style={styles.skip} />
          </View>
        ) : (
          <AppText variant="small" color={scanColors.textMuted} style={styles.hint}>{t('vitals.hint')}</AppText>
        )}
        <CaptureButton
          progress={elapsed / VITAL_SCAN_SECONDS}
          secondsLeft={secondsLeft}
          recording={recording}
          disabled={!cameraReady || !aligned}
          label={t('vitals.start')}
          onPress={() => void start()}
        />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color={scanColors.textMuted}>{label}</AppText>
      <AppText variant="small" color={colors.white} style={styles.statValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  topBar: { position: 'absolute', left: spacing.md, right: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '600' },
  guidance: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: spacing.lg },
  hint: { textAlign: 'center', paddingHorizontal: spacing.xxl },
  liveCard: {
    padding: spacing.lg, gap: spacing.sm, borderRadius: 26, backgroundColor: scanColors.glassStrong,
    borderWidth: StyleSheet.hairlineWidth, borderColor: scanColors.hairline,
  },
  liveHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  bpm: { fontSize: 40, lineHeight: 48, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  liveStats: { marginLeft: 'auto', flexDirection: 'row', gap: spacing.md },
  stat: { alignItems: 'flex-end' },
  statValue: { fontVariant: ['tabular-nums'], fontWeight: '600' },
  skip: { marginTop: spacing.xs },
});
