import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeatureRow } from '@/components/ui/FeatureRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { Screen } from '@/components/ui/Screen';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function EyeInstructionsScreen() {
  const { t } = useTranslation();
  const clearEyeCaptures = useAssessmentStore((state) => state.clearEyeCaptures);
  const start = () => {
    clearEyeCaptures();
    router.push({ pathname: '/scan/eye-camera', params: { side: 'left' } });
  };
  return (
    <Screen footer={<Button label={t('eyeIntro.continue')} onPress={start} icon="camera" />}>
      <AppHeader back title={t('navigation.scan')} />
      <View style={styles.visual}>
        <View style={styles.eyeLine} />
        <AppIcon name="eye" size={74} color={colors.primary} strokeWidth={1.6} />
        <View style={styles.scanCornerTop} />
        <View style={styles.scanCornerBottom} />
      </View>
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>
        {t('eyeIntro.step')}
      </AppText>
      <AppText variant="h1">{t('eyeIntro.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>
        {t('eyeIntro.description')}
      </AppText>
      <Card style={styles.card}>
        <FeatureRow compact icon="hand" title={t('eyeIntro.instruction1')} />
        <FeatureRow compact icon="sun" title={t('eyeIntro.instruction2')} />
        <FeatureRow compact icon="scan" title={t('eyeIntro.instruction3')} />
      </Card>
      <NoticeCard title={t('eyeIntro.dataTitle')} body={t('eyeIntro.dataBody')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: {
    height: 190,
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  eyeLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#9ED6CB' },
  scanCornerTop: { position: 'absolute', width: 50, height: 50, top: 30, left: 42, borderTopWidth: 2, borderLeftWidth: 2, borderColor: colors.primary },
  scanCornerBottom: { position: 'absolute', width: 50, height: 50, bottom: 30, right: 42, borderBottomWidth: 2, borderRightWidth: 2, borderColor: colors.primary },
  eyebrow: { marginTop: spacing.xxl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  card: { marginTop: spacing.xxl, gap: spacing.lg },
});
