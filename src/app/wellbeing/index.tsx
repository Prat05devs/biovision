import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CrisisLink } from '@/components/wellbeing/CrisisLink';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeatureRow } from '@/components/ui/FeatureRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { Screen } from '@/components/ui/Screen';
import { wellbeingService } from '@/services';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function WellbeingIntroScreen() {
  const { t } = useTranslation();
  const startWellbeing = useAssessmentStore((state) => state.startWellbeing);

  // Fetched up front so crisis contacts are already available on every screen.
  const screen = useQuery({
    queryKey: ['wellbeing-screen'],
    queryFn: () => wellbeingService.getScreen(),
    staleTime: 5 * 60 * 1000,
  });

  const start = () => {
    if (!screen.data) return;
    startWellbeing(screen.data);
    router.push('/wellbeing/questionnaire');
  };

  return (
    <Screen
      footer={
        <Button
          label={t('wellbeing.start')}
          onPress={start}
          disabled={!screen.data}
          loading={screen.isLoading}
          icon="arrowForward"
          iconPosition="right"
        />
      }
    >
      <AppHeader back language title={t('navigation.wellbeing')} />
      <View style={styles.visual}>
        <View style={styles.pulseRing} />
        <AppIcon name="heart" size={55} color={colors.primary} strokeWidth={1.8} />
      </View>
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>
        {t('wellbeing.eyebrow')}
      </AppText>
      <AppText variant="h1">{t('wellbeing.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>
        {t('wellbeing.description')}
      </AppText>

      <Card style={styles.card}>
        <FeatureRow
          compact
          icon="message"
          title={t('wellbeing.howTitle')}
          description={t('wellbeing.howBody', {
            count: screen.data?.baselineQuestionCount ?? 4,
            days: screen.data?.recallPeriodDays ?? 14,
          })}
        />
        <View style={styles.divider} />
        <FeatureRow
          compact
          icon="fileText"
          title={t('wellbeing.instrumentsTitle')}
          description={t('wellbeing.instrumentsBody')}
        />
        <View style={styles.divider} />
        <FeatureRow compact icon="shieldCheck" title={t('notice.privacy')} description={t('wellbeing.privacyBody')} />
      </Card>

      <NoticeCard title={t('notice.title')} body={t('wellbeing.notDiagnosis')} />
      <CrisisLink style={styles.crisis} />
      {screen.data ? (
        <AppText variant="caption" color={colors.inkMuted} style={styles.version}>
          {t('wellbeing.screenVersion', { version: screen.data.screenVersion })}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  visual: { height: 180, marginTop: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pulseRing: { position: 'absolute', width: 126, height: 126, borderRadius: 63, borderWidth: 18, borderColor: 'rgba(8,126,114,0.08)' },
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  card: { marginTop: spacing.xl, marginBottom: spacing.md, gap: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  crisis: { marginTop: spacing.md },
  version: { marginTop: spacing.lg, textAlign: 'center' },
});
