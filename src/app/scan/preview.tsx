import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { frameSideFor } from '@/services/vision/captureMirroring';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function PreviewScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ side?: string }>();
  const side: 'left' | 'right' = params.side === 'right' ? 'right' : 'left';
  // The stored image keeps the preview's mirrored orientation, so the review
  // guide sits on the same side of the frame as the live capture guide did.
  const guideSide = frameSideFor(side);
  const capture = useAssessmentStore((state) => state.session.scan.eyeCaptures[side]);
  const imageUri = capture?.uri;
  const setEyeCapture = useAssessmentStore((state) => state.setEyeCapture);

  if (!imageUri) {
    return (
      <Screen scroll={false}>
        <AppHeader back title={t('navigation.scan')} />
        <ErrorState
          title={t('preview.missingTitle')}
          body={t('preview.missingBody')}
          action={t('eyeIntro.continue')}
          onAction={() => router.replace({ pathname: '/scan/eye-camera', params: { side } })}
        />
      </Screen>
    );
  }

  const retake = () => {
    setEyeCapture(side, undefined);
    router.replace({ pathname: '/scan/eye-camera', params: { side } });
  };

  const confirm = () => {
    if (side === 'left') {
      router.replace({ pathname: '/scan/eye-camera', params: { side: 'right' } });
      return;
    }
    router.push('/scan/processing');
  };

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label={t('common.retake')} onPress={retake} variant="outline" style={styles.action} />
          <Button
            label={t(side === 'left' ? 'preview.continueRight' : 'preview.finish')}
            onPress={confirm}
            icon={side === 'left' ? 'arrowForward' : 'check'}
            style={styles.actionWide}
          />
        </View>
      }
    >
      <AppHeader back title={t('navigation.scan')} />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>
        {t('preview.step', { current: side === 'left' ? 1 : 2 })}
      </AppText>
      <AppText variant="h1">{t('preview.title', { side: t(`eyeCamera.side.${side}`) })}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>{t('preview.description')}</AppText>
      <View style={[styles.imageFrame, capture ? { aspectRatio: capture.width / capture.height } : undefined]}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel={t('preview.captureAlt', { side: t(`eyeCamera.side.${side}`) })}
        />
        <View
          style={[
            styles.imageGuide,
            guideSide === 'left' ? styles.imageGuideFrameLeft : styles.imageGuideFrameRight,
          ]}
        />
      </View>
      <Card tone="soft" style={styles.checks}>
        <ReviewItem icon="eye" label={t('preview.clear')} />
        <ReviewItem icon="smartphone" label={t('preview.sharp')} />
        <ReviewItem icon="sun" label={t('preview.light')} />
      </Card>
    </Screen>
  );
}

function ReviewItem({ icon, label }: { icon: 'eye' | 'smartphone' | 'sun'; label: string }) {
  return (
    <View style={styles.checkRow}>
      <AppIcon name={icon} size={21} color={colors.primary} />
      <AppText variant="small">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  imageFrame: { width: '100%', maxWidth: 760, aspectRatio: 4 / 3, alignSelf: 'center', marginTop: spacing.xl, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.ink },
  image: { width: '100%', height: '100%' },
  imageGuide: { position: 'absolute', width: '43%', height: '23%', top: '31%', borderWidth: 2, borderRadius: 60, borderColor: colors.white, borderStyle: 'dashed' },
  // Frame-relative, not anatomical. Pick with frameSideFor().
  imageGuideFrameLeft: { left: '7%' },
  imageGuideFrameRight: { right: '7%' },
  checks: { marginTop: spacing.md, gap: spacing.sm },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 0.8 },
  actionWide: { flex: 1.2 },
});
