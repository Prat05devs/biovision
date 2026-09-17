import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { CaptureButton, GlassIconButton, GlassPill, scanColors } from '@/components/scan/ScanHud';
import { AppText } from '@/components/ui/AppText';
import { ErrorState } from '@/components/ui/ErrorState';
import { CAPTURE_IS_MIRRORED, frameSideFor, mirroredPictureOptions } from '@/services/vision/captureMirroring';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, spacing } from '@/theme/tokens';

export default function EyeCameraScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ side?: string }>();
  const side: 'left' | 'right' = params.side === 'right' ? 'right' : 'left';
  // The preview is mirrored, so the guide follows the frame side, not the anatomical side.
  const guideSide = frameSideFor(side);
  const cameraRef = useRef<CameraView>(null);
  const [permission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const setEyeCapture = useAssessmentStore((state) => state.setEyeCapture);
  const sideLabel = t(`eyeCamera.side.${side}`);

  useEffect(() => {
    if (permission && !permission.granted) router.replace('/scan/permissions');
  }, [permission]);

  const capture = async () => {
    if (!cameraRef.current || !ready || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync(mirroredPictureOptions);
      if (photo?.uri) {
        setEyeCapture(side, {
          id: `eye_${side}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          uri: photo.uri,
          modality: 'eye_closeup',
          anatomicalSide: side,
          capturedAt: new Date().toISOString(),
          protocolVersion: 'bilateral-single-eye-guide-v3-mirrored',
          mimeType: 'image/jpeg',
          width: photo.width,
          height: photo.height,
          sourcePlatform: Platform.OS as 'ios' | 'android' | 'web',
          captureSource: 'camera',
          mirrored: CAPTURE_IS_MIRRORED,
          quality: { lighting: 'unavailable', positioning: 'unavailable' },
        });
        router.push({ pathname: '/scan/preview', params: { side } });
      }
    } catch {
      setCameraError(true);
    } finally {
      setCapturing(false);
    }
  };

  if (permission && !permission.granted) return null;

  if (cameraError) {
    return (
      <View style={styles.errorBackground}>
        <ErrorState title={t('permissions.unavailableTitle')} body={t('permissions.unavailableBody')} action={t('common.retry')} onAction={() => setCameraError(false)} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mirror
          onCameraReady={() => setReady(true)}
          onMountError={() => setCameraError(true)}
          accessibilityLabel={t('eyeCamera.accessibilityCamera')}
        />
      ) : null}

      <View style={[styles.eyeGuide, guideSide === 'left' ? styles.guideLeft : styles.guideRight]} pointerEvents="none">
        <View style={styles.eyeOval} />
      </View>

      <View style={[styles.topBar, { top: insets.top + spacing.xs }]}>
        <GlassIconButton icon="arrowBack" label={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <GlassPill><AppText variant="small" color={colors.white} style={styles.title}>{t('eyeCamera.progress', { current: side === 'left' ? 1 : 2 })}</AppText></GlassPill>
        <GlassIconButton icon="close" label={t('common.home')} onPress={() => router.replace('/')} />
      </View>

      <View style={[styles.guidance, { top: insets.top + 64 }]} pointerEvents="none">
        <GlassPill style={styles.guidancePill}>
          <AppText variant="small" color={colors.white} style={styles.center}>{t('eyeCamera.guidance', { side: sideLabel })}</AppText>
        </GlassPill>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <AppText variant="small" color={scanColors.textMuted} style={styles.center}>
          {ready ? t('eyeCamera.capture', { side: sideLabel }) : t('eyeCamera.cameraStarting')}
        </AppText>
        {capturing ? (
          <View style={styles.busy}><ActivityIndicator color={colors.white} /></View>
        ) : (
          <CaptureButton progress={0} recording={false} disabled={!ready} label={t('eyeCamera.accessibilityCapture', { side: sideLabel })} onPress={() => void capture()} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  errorBackground: { flex: 1, backgroundColor: colors.background },
  topBar: { position: 'absolute', left: spacing.md, right: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: '600', letterSpacing: 1 },
  guidance: { position: 'absolute', left: spacing.lg, right: spacing.lg, alignItems: 'center' },
  guidancePill: { borderRadius: 20 },
  center: { textAlign: 'center' },
  eyeGuide: { position: 'absolute', top: '32%', height: 150, alignItems: 'center', justifyContent: 'center' },
  guideLeft: { left: '6%', right: '46%' },
  guideRight: { left: '46%', right: '6%' },
  eyeOval: { width: '100%', height: 110, borderRadius: 60, borderWidth: 2, borderColor: scanColors.mint },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', gap: spacing.lg },
  busy: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
});
