import { AppearanceChecks } from '@/components/observations/AppearanceChecks';
import { useAppearanceStore } from '@/store/appearance.store';
import { region, regionName, deployment } from '@/config/deployment';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { buildHealthPlan, healthSources, healthVersion, visibleHealthQuestions } from '@/services/health/check';
import { useHealthStore } from '@/store/health.store';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function HealthSummaryScreen() {
  const { t, i18n } = useTranslation();
  const { answers, completedAt } = useHealthStore();
  const captureUri = useAssessmentStore(s => s.session.scan.faceImageUri);
  const captured = !!captureUri;
  const appearance = useAppearanceStore(s => s.captureUri === captureUri ? s.result : undefined);
  const [error, setError] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const plan = buildHealthPlan(answers);
  const open = async (url: string) => { setError(false); try { await Linking.openURL(url); } catch { setError(true); } };
  const answerLines = visibleHealthQuestions(answers).filter(q => answers[q.id]).map(q => `${t(`health.q.${q.id}`)}: ${t(`health.options.${q.id}.${answers[q.id]}`)}`);
  const date = completedAt ? new Date(completedAt).toLocaleString(i18n.language === 'hi' ? 'hi-IN' : 'en-IN') : undefined;
  const share = async () => {
    setError(false);
    const message = [deployment.brandName, t('health.summaryTitle'), date, t('health.summaryIntro'), t(`health.level.${plan.level}`), t(`health.reason.${plan.level}`), ...answerLines, ...plan.actions.map(id => t(`health.action.${id}`)), t('health.prepareBody'), t('health.safetyBody', { phone: region.emergencyPhone }), t(captured ? 'health.scanCaptured' : 'health.scanSkipped'), appearance ? t(`appearance.finding.${appearance.finding}`) : undefined, appearance ? t('appearance.interpretation') : undefined, ...(appearance?.checks ?? []).map(check => `${t(`appearance.modules.${check.id}`)}: ${t(`appearance.status.${check.status}`)}. ${t(`appearance.detail.${check.reason}`)} ${t(`appearance.scope.${check.id}`)}`), healthVersion].filter(Boolean).join('\n\n');
    try { await Share.share({ message }); } catch { setError(true); }
  };
  if (!plan.complete && !plan.urgent) return <Screen><AppHeader back language /><AppText variant="h1" style={styles.top}>{t('health.level.incomplete')}</AppText><AppText style={styles.top}>{t('health.incomplete')}</AppText><Button label={t('health.review')} onPress={() => router.replace('/health-check')} style={styles.top} /></Screen>;
  return <Screen>
    <AppHeader language />
    <AppText variant="eyebrow" color={colors.primary} style={styles.top}>{t('health.eyebrow')}</AppText>
    <AppText variant="h1" style={styles.space}>{t('health.summaryTitle')}</AppText>
    <AppText color={colors.inkMuted} style={styles.space}>{t('health.summaryIntro')}</AppText>
    {date ? <AppText variant="caption" color={colors.inkMuted} style={styles.space}>{t('health.date', { date })}</AppText> : null}
    <Card tone={plan.urgent ? 'urgent' : plan.level === 'prompt' ? 'caution' : 'soft'} style={styles.card}>
      <AppIcon name={plan.urgent ? 'alertTriangle' : 'navigation'} size={28} color={plan.urgent ? colors.urgent : colors.primary} />
      <AppText variant="h2">{t(`health.level.${plan.level}`)}</AppText>
      <AppText>{t(`health.reason.${plan.level}`)}</AppText>
      {plan.urgent ? <Button label={t('health.call', { phone: region.emergencyPhone })} variant="urgent" icon="phone" onPress={() => void open(`tel:${region.emergencyPhone}`)} /> : <Button label={t('health.care', { city: regionName(i18n.language) })} icon="mapPin" onPress={() => router.push({ pathname: '/care', params: { specialty: plan.specialty } })} />}
    </Card>
    {!plan.urgent ? <>
      <AppText variant="h2" style={styles.top}>{t('health.today')}</AppText>
      {plan.actions.map((id, index) => <Card key={id} style={styles.action}>
        <View style={styles.number}><AppText color={colors.primary}>{index + 1}</AppText></View>
        <AppText style={styles.actionCopy}>{t(`health.action.${id}`)}</AppText>
      </Card>)}
      {(answers.stress === 'difficult' || answers.concern === 'mood' || answers.priority === 'support') ? <Button label={t('navigation.wellbeing')} variant="outline" onPress={() => router.push('/wellbeing')} style={styles.top} /> : null}
      <Card style={styles.card}><AppText variant="h2">{t('health.prepare')}</AppText><AppText color={colors.inkMuted}>{t('health.prepareBody')}</AppText></Card>
    </> : null}
    <Card style={styles.card}>
      <AppText variant="h2">{t('health.sourceTitle')}</AppText>
      <AppText variant="h3">{t('health.scanTitle')}</AppText>
      <AppText color={colors.inkMuted}>{t(captured ? 'health.scanCaptured' : 'health.scanSkipped')}</AppText>
      {appearance ? <AppText variant="small">{t(`appearance.finding.${appearance.finding}`)}. {t('appearance.interpretation')}</AppText> : null}
      {appearance?.checks ? <AppearanceChecks checks={appearance.checks} /> : null}
      <AppText variant="h3">{t('health.answersTitle')}</AppText>
      <AppText color={colors.inkMuted}>{t('health.answerCount', { answered: plan.answered, total: plan.total })}</AppText>
      <Button label={t('health.answersTitle')} variant="outline" onPress={() => setShowAnswers(v => !v)} icon="list" />
      {showAnswers ? answerLines.map(line => <AppText key={line} variant="small">{line}</AppText>) : null}
    </Card>
    <Card tone="caution" style={styles.card}><AppText variant="h3">{t('health.safetyTitle')}</AppText><AppText variant="small">{t('health.safetyBody', { phone: region.emergencyPhone })}</AppText><Button label={t('health.call', { phone: region.emergencyPhone })} variant="outline" onPress={() => void open(`tel:${region.emergencyPhone}`)} icon="phone" /></Card>
    {!plan.urgent ? <View style={styles.card}>
      <AppText variant="small" color={colors.inkMuted}>{t('health.shareHint')}</AppText>
      <Button label={t('health.share')} onPress={() => void share()} icon="share" />
      <Button label={t('health.review')} onPress={() => router.push('/health-check')} variant="outline" />
    </View> : null}
    {error ? <AppText accessibilityRole="alert" color={colors.urgent}>{t('health.error')}</AppText> : null}
    <Card style={styles.card}><AppText variant="h3">{t('health.sources')}</AppText><AppText variant="small" color={colors.inkMuted}>{t('health.sourcesBody')}</AppText>{healthSources.map(source => <Button key={source.url} label={source.name} variant="ghost" onPress={() => void open(source.url)} />)}</Card>
    <AppText variant="caption" color={colors.inkMuted} style={styles.top}>{healthVersion} · {t('health.private')}</AppText>
    <Button label={t('common.home')} variant="ghost" onPress={() => router.replace('/')} style={styles.top} />
  </Screen>;
}
const styles = StyleSheet.create({
  top: { marginTop: spacing.xl }, space: { marginTop: spacing.sm }, card: { marginTop: spacing.xl, gap: spacing.md },
  action: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, alignItems: 'flex-start' },
  actionCopy: { flex: 1 }, number: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
