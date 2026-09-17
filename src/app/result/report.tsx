import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LifestyleFindings } from '@/components/result/LifestyleFindings';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { Screen } from '@/components/ui/Screen';
import { SignalBadge } from '@/components/ui/SignalBadge';
import { buildLifestyleProfile } from '@/services/lifestyle/lifestyleProfile';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, spacing } from '@/theme/tokens';

export default function ReportScreen() {
  const { t } = useTranslation();
  const session = useAssessmentStore((state) => state.session);
  const report = session.finalAssessment;

  if (!report) {
    return (
      <Screen scroll={false}>
        <AppHeader back />
        <ErrorState title={t('errors.title')} body={t('errors.body')} action={t('common.home')} onAction={() => router.replace('/')} />
      </Screen>
    );
  }

  const signal = report.screeningResult.signal;
  const signalLabel = report.screeningResult.label ?? (report.screeningResult.labelKey ? t(report.screeningResult.labelKey) : t(`result.signal.${signal}`));
  const lifestyleProfile = buildLifestyleProfile(session.lifestyle);
  const nextStep = report.recommendedTest?.name ?? (report.recommendedTest?.nameKey ? t(report.recommendedTest.nameKey) : t('result.test'));

  return (
    <Screen>
      <AppHeader back title={t('report.title')} />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>{t('report.eyebrow')}</AppText>
      <AppText variant="h1">{t('report.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>{t('report.disclaimer')}</AppText>
      <Card style={styles.reportCard}>
        <ReportRow label={t('report.status')} value={t('report.completed')} />
        <Divider />
        <View style={styles.row}>
          <AppText variant="small" color={colors.inkMuted}>{t('report.anemia')}</AppText>
          <SignalBadge signal={signal} label={signalLabel} />
        </View>
        <Divider />
        <ReportRow label={t('report.answers')} value={t('report.answersCount', { count: Object.keys(session.questionnaire.answers).length })} />
        <Divider />
        <ReportRow label={t('result.questionnaireTitle')} value={t(report.questionnaireAssessment.summaryKey)} />
        <Divider />
        <ReportRow label={t('report.nextStep')} value={nextStep} emphasize />
      </Card>
      <LifestyleFindings profile={lifestyleProfile} />
      <NoticeCard title={t('notice.title')} body={t('report.privacy')} />
      <View style={styles.actions}>
        <Button label={t('report.share')} onPress={() => router.push('/result/share')} icon="share" />
        <Button label={t('result.nearby')} onPress={() => router.push('/care')} variant="outline" icon="mapPin" />
      </View>
    </Screen>
  );
}

function ReportRow({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.row}>
      <AppText variant="small" color={colors.inkMuted}>{label}</AppText>
      <AppText variant={emphasize ? 'h3' : 'small'} style={styles.value}>{value}</AppText>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  reportCard: { marginTop: spacing.xl, gap: spacing.lg },
  row: { gap: spacing.xs },
  value: { fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
});
