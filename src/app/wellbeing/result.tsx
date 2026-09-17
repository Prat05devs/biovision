import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CrisisLink } from '@/components/wellbeing/CrisisLink';
import { ScaleResultCard } from '@/components/wellbeing/ScaleResultCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { Screen } from '@/components/ui/Screen';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function WellbeingResultScreen() {
  const { t } = useTranslation();
  const result = useAssessmentStore((state) => state.wellbeingResult);
  const resetWellbeing = useAssessmentStore((state) => state.resetWellbeing);

  if (!result) {
    return (
      <Screen scroll={false}>
        <AppHeader back />
        <ErrorState
          title={t('errors.title')}
          body={t('errors.body')}
          action={t('common.home')}
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  }

  const message = result.message ?? (result.messageKey ? t(result.messageKey) : t('wellbeing.monitor'));
  const care =
    result.recommendedCareCategory ??
    (result.recommendedCareCategoryKey ? t(result.recommendedCareCategoryKey) : undefined);

  return (
    <Screen>
      <AppHeader back language title={t('navigation.wellbeing')} />
      <View style={styles.icon}>
        <AppIcon name="heart" size={34} color={colors.primary} />
      </View>
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>
        {t('wellbeing.resultEyebrow')}
      </AppText>
      <AppText variant="h1">{t('wellbeing.resultTitle')}</AppText>

      <Card tone="soft" style={styles.resultCard}>
        <AppText variant="h3">{message}</AppText>
        {care ? (
          <AppText color={colors.inkMuted}>{t('wellbeing.suggestedCare', { care })}</AppText>
        ) : null}
      </Card>

      {result.scales.length ? (
        <>
          <AppText variant="h2" style={styles.sectionTitle}>
            {t('wellbeing.scoresTitle')}
          </AppText>
          <AppText variant="small" color={colors.inkMuted} style={styles.sectionBody}>
            {t('wellbeing.scoresBody')}
          </AppText>
          <View style={styles.scales}>
            {result.scales.map((scale) => (
              <ScaleResultCard key={scale.id} scale={scale} />
            ))}
          </View>
        </>
      ) : null}

      <NoticeCard title={t('notice.title')} body={t('wellbeing.notDiagnosis')} />
      <CrisisLink style={styles.crisis} />

      <View style={styles.actions}>
        <Button
          label={t('wellbeing.talkToSomeone')}
          onPress={() => router.push('/wellbeing/support')}
          icon="heartPulse"
        />
        <Button
          label={t('common.home')}
          onPress={() => {
            resetWellbeing();
            router.replace('/');
          }}
          variant="outline"
        />
      </View>
      <AppText variant="caption" color={colors.inkMuted} style={styles.version}>
        {t('wellbeing.screenVersion', { version: result.screenVersion })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  eyebrow: { marginTop: spacing.lg, marginBottom: spacing.xs },
  resultCard: { marginTop: spacing.xl, marginBottom: spacing.md, gap: spacing.sm },
  sectionTitle: { marginTop: spacing.xl },
  sectionBody: { marginTop: spacing.xs },
  scales: { marginTop: spacing.md, marginBottom: spacing.lg, gap: spacing.md },
  crisis: { marginTop: spacing.md },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  version: { marginTop: spacing.lg, textAlign: 'center' },
});
