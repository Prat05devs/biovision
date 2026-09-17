import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CrisisLink } from '@/components/wellbeing/CrisisLink';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { OptionButton } from '@/components/ui/OptionButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { wellbeingService } from '@/services';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, spacing } from '@/theme/tokens';
import type { HealthQuestion } from '@/types/assessment';

export default function WellbeingQuestionnaireScreen() {
  const { t } = useTranslation();
  const answers = useAssessmentStore((state) => state.wellbeing.answers);
  const screen = useAssessmentStore((state) => state.wellbeing.screen);
  const answerWellbeing = useAssessmentStore((state) => state.answerWellbeing);
  const stepBackWellbeing = useAssessmentStore((state) => state.stepBackWellbeing);
  const setWellbeingResult = useAssessmentStore((state) => state.setWellbeingResult);

  // The first question comes from a query; every later one is fetched by the
  // confirm handler, so the flow never advances from inside an effect.
  const first = useQuery({
    queryKey: ['wellbeing-first-question'],
    queryFn: () => wellbeingService.nextQuestion({}),
  });

  const [asked, setAsked] = useState<HealthQuestion[]>([]);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const question = asked.length ? asked[asked.length - 1] : first.data?.question;

  const finish = async (finalAnswers: Record<string, string>) => {
    const result = await wellbeingService.assess(finalAnswers);
    setWellbeingResult(result);
    router.replace(result.urgentActionRequired ? '/wellbeing/support' : '/wellbeing/result');
  };

  const confirm = async () => {
    if (!question || selected === undefined || busy) return;
    const nextAnswers = { ...answers, [question.id]: selected };
    setBusy(true);
    setFailed(false);
    try {
      const step = await wellbeingService.nextQuestion(nextAnswers);
      answerWellbeing(question.id, selected);
      if (step.done || !step.question) {
        await finish(nextAnswers);
        return;
      }
      setAsked((current) => [...(current.length ? current : question ? [question] : []), step.question!]);
      setSelected(undefined);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    const previous = asked[asked.length - 2] ?? first.data?.question;
    stepBackWellbeing();
    setAsked((current) => current.slice(0, -1));
    setSelected(previous ? answers[previous.id] : undefined);
  };

  if (first.isLoading) {
    return (
      <Screen scroll={false}>
        <AppHeader back />
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
          <AppText>{t('common.loading')}</AppText>
        </View>
      </Screen>
    );
  }

  if (first.isError || failed || !question) {
    return (
      <Screen scroll={false}>
        <AppHeader back />
        <ErrorState
          title={t('errors.title')}
          body={t('errors.body')}
          action={t('common.retry')}
          onAction={() => {
            setFailed(false);
            void first.refetch();
          }}
        />
      </Screen>
    );
  }

  const answered = Object.keys(answers).length;
  // A stepped screen has no fixed length, so progress is shown against the
  // questions unlocked so far rather than a total that can still grow.
  const total = Math.max(answered + 1, screen?.baselineQuestionCount ?? 4);
  const isRiskQuestion = question.id === screen?.riskQuestionId;

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button
            label={t('common.next')}
            onPress={() => void confirm()}
            disabled={selected === undefined}
            loading={busy}
            icon="arrowForward"
            iconPosition="right"
          />
          {answered > 0 ? (
            <Button label={t('common.back')} onPress={back} variant="ghost" icon="arrowBack" />
          ) : null}
        </View>
      }
    >
      <AppHeader back title={t('navigation.wellbeing')} />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>
        {question.sectionKey ? t(question.sectionKey) : t('wellbeing.eyebrow')}
      </AppText>
      <AppText variant="small" color={colors.inkMuted}>
        {t('wellbeing.questionCount', { count: answered + 1 })}
      </AppText>
      <ProgressBar progress={((answered + 1) / total) * 100} />
      <AppText variant="small" color={colors.inkMuted} style={styles.recall}>
        {t('wellbeing.recallPeriod', { days: screen?.recallPeriodDays ?? 14 })}
      </AppText>
      <AppText variant="h1" style={styles.question}>
        {t(question.textKey)}
      </AppText>

      {isRiskQuestion ? (
        <NoticeCard title={t('wellbeing.crisis.eyebrow')} body={t('wellbeing.crisis.itemNotice')} urgent />
      ) : null}

      <View accessibilityRole="radiogroup" style={styles.options}>
        {(question.options ?? []).map((option) => (
          <OptionButton
            key={option.value}
            label={t(option.labelKey)}
            selected={selected === option.value}
            onPress={() => setSelected(option.value)}
          />
        ))}
      </View>

      <CrisisLink style={styles.crisis} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.md },
  recall: { marginTop: spacing.sm },
  question: { marginTop: spacing.xl },
  options: { marginTop: spacing.xl, gap: spacing.sm },
  crisis: { marginTop: spacing.xl },
  footer: { gap: spacing.xs },
});
