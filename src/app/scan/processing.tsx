import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { assessmentService, screeningService } from '@/services';
import { retainResearchCapture } from '@/api/services.api';
import { AppServiceError } from '@/services/errors';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

const statusKeys = ['processing.prepare', 'processing.quality', 'processing.analyze', 'processing.summary'];

export default function ProcessingScreen() {
  const { t } = useTranslation();
  const session = useAssessmentStore((state) => state.session);
  const setAnemiaResult = useAssessmentStore((state) => state.setAnemiaResult);
  const setQuestions = useAssessmentStore((state) => state.setQuestions);
  const setEyeImageUploaded = useAssessmentStore((state) => state.setEyeImageUploaded);
  const [statusIndex, setStatusIndex] = useState(0);
  const [errorCode, setErrorCode] = useState<string>();
  const started = useRef(false);
  const [orbit] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (errorCode) return;
    let mounted = true;
    let rotation: Animated.CompositeAnimation | undefined;
    let pulse: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!mounted || reduce) return;
      rotation = Animated.loop(Animated.timing(orbit, { toValue: 1, duration: 5200, easing: Easing.linear, useNativeDriver: true }));
      pulse = Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1150, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      rotation.start(); pulse.start();
    });
    return () => { mounted = false; rotation?.stop(); pulse?.stop(); };
  }, [breathe, errorCode, orbit]);

  useEffect(() => {
    const statusTimer = setInterval(
      () => setStatusIndex((value) => Math.min(statusKeys.length - 1, value + 1)),
      700,
    );
    return () => clearInterval(statusTimer);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const run = async () => {
      const leftEye = session.scan.eyeCaptures.left;
      const rightEye = session.scan.eyeCaptures.right;
      const profile = session.profile;
      if (!profile) {
        // The reference range depends on age, sex and pregnancy; never screen without them.
        router.replace('/scan/profile');
        return;
      }
      if (!leftEye || !rightEye) {
        setErrorCode('IMAGE_QUALITY_LOW');
        return;
      }
      try {
        if (session.scan.researchConsent) {
          const captures = [leftEye, rightEye];
          if (session.scan.faceCapture) captures.unshift(session.scan.faceCapture);
          void Promise.allSettled(
            captures.map((capture) => retainResearchCapture(capture, session)),
          ).then((retention) => {
            if (__DEV__ && retention.some((result) => result.status === 'rejected')) {
              console.warn('Research retention was unavailable; operational screening continued.');
            }
          });
        }
        let signal: 'low' | 'moderate' | 'elevated' | 'unavailable' = 'unavailable';
        try {
          const screening = await screeningService.analyzeBilateralEyes({
            left: leftEye,
            right: rightEye,
            sessionId: session.id,
            profile,
          });
          signal = screening.signal;
          setAnemiaResult(screening.signal, screening.internalConfidence, screening.observationKeys, {
            estimatedHemoglobinGdl: screening.estimatedHemoglobinGdl,
            anemiaProbability: screening.anemiaProbability,
            hemoglobinThresholdGdl: screening.hemoglobinThresholdGdl,
            modelVersion: screening.modelVersion,
          });
          setEyeImageUploaded(true);
        } catch (error) {
          // A photo that needs retaking stops here; any other failure leaves the other results intact.
          if (error instanceof AppServiceError && error.code === 'IMAGE_QUALITY_LOW') throw error;
          setAnemiaResult(signal);
        }
        const next = await assessmentService.nextQuestion({
          sessionId: session.id,
          anemiaSignal: signal,
          answers: {},
        });
        if (!next.question) throw new AppServiceError('INVALID_RESPONSE', 'No assessment question was returned.');
        setQuestions([next.question], next.configVersion);
        router.replace('/questions');
      } catch (error) {
        setErrorCode(error instanceof AppServiceError ? error.code : 'ASSESSMENT_FAILED');
      }
    };
    void run();
  }, [session, setAnemiaResult, setEyeImageUploaded, setQuestions]);

  const qualityError = errorCode === 'IMAGE_QUALITY_LOW';

  return (
    <Screen
      scroll={false}
      footer={
        errorCode ? (
          qualityError ? (
            <Button label={t('processing.retake')} onPress={() => { useAssessmentStore.getState().clearEyeCaptures(); router.replace({ pathname: '/scan/eye-camera', params: { side: 'left' } }); }} icon="camera" />
          ) : (
            <Button label={t('common.retry')} onPress={() => router.replace('/scan/processing')} icon="refresh" />
          )
        ) : undefined
      }
    >
      <AppHeader back title={t('navigation.scan')} />
      <View style={styles.content}>
        <View style={[styles.orb, errorCode && styles.orbError]}>
          {errorCode ? (
            <AppIcon name="alertTriangle" size={42} color={colors.elevated} />
          ) : (
            <>
              <Animated.View style={[styles.orbPulse, { opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [.52, .08] }), transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [.76, 1.18] }) }] }]} />
              <Animated.View style={[styles.orbit, { transform: [{ rotate: orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                <View style={styles.orbitDot} />
              </Animated.View>
              <View style={styles.orbInner}><AppIcon name="scan" size={30} color={colors.primary} /></View>
            </>
          )}
        </View>
        <AppText variant="eyebrow" color={errorCode ? colors.elevated : colors.primary} style={styles.eyebrow}>
          {t('processing.step')}
        </AppText>
        <AppText variant="h1" style={styles.center}>
          {errorCode
            ? t(qualityError ? 'processing.qualityErrorTitle' : 'processing.serviceErrorTitle')
            : t('processing.title')}
        </AppText>
        <AppText color={colors.inkMuted} style={styles.body}>
          {errorCode
            ? t(qualityError ? 'processing.qualityErrorBody' : 'processing.serviceErrorBody')
            : t('processing.description')}
        </AppText>
        {!errorCode ? (
          <Card style={styles.statusCard}>
            {statusKeys.map((key, index) => (
              <View key={key} style={styles.statusRow}>
                <AppIcon
                  name={index < statusIndex ? 'checkCircle' : index === statusIndex ? 'circleDot' : 'circle'}
                  size={20}
                  color={index <= statusIndex ? colors.primary : colors.border}
                />
                <AppText variant="small" color={index <= statusIndex ? colors.ink : colors.inkMuted}>
                  {t(key)}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.huge },
  orb: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  orbError: { backgroundColor: colors.elevatedSoft },
  orbInner: { position: 'absolute', width: 68, height: 68, borderRadius: radius.pill, borderWidth: 1, borderColor: '#A5DCD2', backgroundColor: 'rgba(255,255,255,0.58)', alignItems: 'center', justifyContent: 'center' },
  orbPulse: { position: 'absolute', width: 104, height: 104, borderRadius: 52, borderWidth: 2, borderColor: colors.primary },
  orbit: { position: 'absolute', width: 94, height: 94, borderRadius: 47 },
  orbitDot: { position: 'absolute', width: 9, height: 9, borderRadius: 5, top: -4, left: 42.5, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: .4, shadowRadius: 6, elevation: 3 },
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.xs },
  center: { textAlign: 'center' },
  body: { textAlign: 'center', marginTop: spacing.sm, maxWidth: 340 },
  statusCard: { alignSelf: 'stretch', marginTop: spacing.xxl, gap: spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
