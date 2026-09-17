import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OptionButton } from '@/components/ui/OptionButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { healthQuestions, visibleHealthQuestions } from '@/services/health/check';
import { useHealthStore } from '@/store/health.store';
import { colors, spacing } from '@/theme/tokens';

export default function HealthCheckScreen() {
  const { t } = useTranslation();
  const { answers, answer, complete } = useHealthStore();
  const [index, setIndex] = useState(0);
  const questions = visibleHealthQuestions(answers);
  const q = questions[Math.min(index, questions.length - 1)] ?? healthQuestions[0];
  const last = index >= questions.length - 1;
  const next = () => {
    if (!answers[q.id]) return;
    if (last) { complete(); router.replace('/health-summary'); }
    else setIndex(i => i + 1);
  };
  return <Screen footer={<View style={styles.actions}>
    <Button label={last ? t('health.finish') : t('common.next')} disabled={!answers[q.id]} onPress={next} icon="arrowForward" iconPosition="right" />
    {index > 0 ? <Button label={t('common.back')} variant="ghost" onPress={() => setIndex(i => i - 1)} /> : null}
  </View>}>
    <AppHeader back language title={t('health.title')} />
    <AppText variant="eyebrow" color={colors.primary} style={styles.top}>{t('health.eyebrow')}</AppText>
    <AppText variant="small" color={colors.inkMuted} style={styles.progress}>{t('health.progress', { current: index + 1, total: questions.length })}</AppText>
    <ProgressBar progress={((index + 1) / questions.length) * 100} />
    <View key={q.id} accessible accessibilityLiveRegion="polite" style={styles.heading}>
      <AppText variant="h1" accessibilityRole="header">{t(`health.q.${q.id}`)}</AppText>
      <AppText color={colors.inkMuted} style={styles.progress}>{t(`health.hint.${q.id}`)}</AppText>
    </View>
    <View accessibilityRole="radiogroup" style={styles.options}>
      {q.options.map(value => <OptionButton key={value} label={t(`health.options.${q.id}.${value}`)} selected={answers[q.id] === value} onPress={() => {
        answer(q.id, value);
        if (q.id === 'safety' && value === 'urgent') router.replace('/health-summary');
      }} />)}
    </View>
    <Card tone="soft" style={styles.note}><AppText variant="small" color={colors.inkMuted}>{t('health.private')}</AppText></Card>
    <Button label={t('health.urgentLink')} variant="ghost" onPress={() => router.push('/emergency')} />
  </Screen>;
}
const styles = StyleSheet.create({
  top: { marginTop: spacing.xl }, progress: { marginVertical: spacing.sm },
  heading: { marginTop: spacing.xxl }, options: { gap: spacing.sm, marginTop: spacing.lg },
  actions: { gap: spacing.xs }, note: { marginTop: spacing.xl, marginBottom: spacing.sm },
});
