import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { OptionButton } from '@/components/ui/OptionButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { lifestyleQuestions } from '@/data/lifestyleQuestions';
import { Screen } from '@/components/ui/Screen';
import { assessmentService } from '@/services';
import { retainResearchQuestionnaire } from '@/api/services.api';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, spacing } from '@/theme/tokens';

export default function QuestionsScreen() {
  const { t } = useTranslation();
  const session = useAssessmentStore((state) => state.session);
  const answerQuestion = useAssessmentStore((state) => state.answerQuestion);
  const addQuestion = useAssessmentStore((state) => state.addQuestion);
  const setFinalAssessment = useAssessmentStore((state) => state.setFinalAssessment);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const question = session.questionnaire.questions[index];
  if (!question) {
    return (
      <Screen scroll={false}>
        <AppHeader back title={t('navigation.scan')} />
        <ErrorState title={t('errors.title')} body={t('errors.body')} action={t('common.home')} onAction={() => router.replace('/')} />
      </Screen>
    );
  }

  const answer = session.questionnaire.answers[question.id];
  const multiSelect = question.type === 'multi_choice';
  const selected = Array.isArray(answer) ? answer : [];
  const hasAnswer = multiSelect ? selected.length > 0 : answer !== undefined;

  /**
   * Multi-select toggles instead of advancing, so the person can report every condition they
   * live with. An exclusive option ("None of these") clears the rest, and choosing anything
   * else clears it.
   */
  const toggleOption = (value: string) => {
    const exclusive = question.exclusiveValue;
    if (exclusive && value === exclusive) {
      answerQuestion(question.id, selected.includes(exclusive) ? [] : [exclusive]);
      return;
    }
    const withoutExclusive = selected.filter((item) => item !== exclusive);
    const updated = withoutExclusive.includes(value)
      ? withoutExclusive.filter((item) => item !== value)
      : [...withoutExclusive, value];
    answerQuestion(question.id, updated);
  };
  // Branching makes the exact count unknown; estimate with the base symptom questions plus habits.
  const estimatedRemaining = Math.max(2, 8 - index) + lifestyleQuestions.filter((item) => item.type !== 'number').length;
  const options = question.type === 'yes_no'
    ? [
        { value: true, label: t('common.yes') },
        { value: false, label: t('common.no') },
      ]
    : (question.options ?? []).map((option) => ({ value: option.value, label: t(option.labelKey) }));

  const next = async () => {
    if (!hasAnswer) return;
    setSubmitting(true);
    setError(false);
    try {
      const currentSession = useAssessmentStore.getState().session;
      const nextQuestion = await assessmentService.nextQuestion({
        sessionId: currentSession.id,
        anemiaSignal: currentSession.anemia.signal ?? 'unavailable',
        answers: currentSession.questionnaire.answers,
      });
      if (!nextQuestion.done && nextQuestion.question) {
        addQuestion(nextQuestion.question);
        setIndex((value) => value + 1);
        return;
      }
      // Urgent findings must not be delayed behind the optional lifestyle module.
      if (nextQuestion.urgentActionRequired) {
        const report = await assessmentService.complete(currentSession);
        if (currentSession.scan.researchConsent) {
          void retainResearchQuestionnaire(currentSession).catch(() => {
            if (__DEV__) console.warn('Questionnaire research retention was unavailable.');
          });
        }
        setFinalAssessment(report);
        router.replace(report.urgentKind === 'mental_health' ? '/wellbeing/support' : report.urgentActionRequired ? '/emergency' : '/result');
        return;
      }
      router.replace('/lifestyle');
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          label={t('common.next')}
          onPress={() => void next()}
          disabled={!hasAnswer}
          loading={submitting}
          icon="arrowForward"
          iconPosition="right"
        />
      }
    >
      <AppHeader back title={t('questions.navTitle')} />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>{t('questions.step')}</AppText>
      <AppText variant="small" color={colors.inkMuted} style={styles.progressRow}>
        {t('questions.progressCount', { current: index + 1 })}
      </AppText>
      <ProgressBar progress={((index + 1) / (index + 1 + estimatedRemaining)) * 100} />
      {question.sectionKey ? (
        <AppText variant="caption" color={colors.primary} style={styles.sectionLabel}>
          {t(question.sectionKey)}
        </AppText>
      ) : null}
      <AppText variant="h1" style={styles.question}>{t(question.textKey)}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>
        {t(question.followUpOf ? 'questions.followUpDescription' : 'questions.description')}
      </AppText>
      <View accessibilityRole={multiSelect ? 'list' : 'radiogroup'} style={styles.options}>
        {options.map((option) => (
          <OptionButton
            key={String(option.value)}
            label={option.label}
            selected={multiSelect ? selected.includes(String(option.value)) : answer === option.value}
            onPress={() => (multiSelect ? toggleOption(String(option.value)) : answerQuestion(question.id, option.value))}
          />
        ))}
      </View>
      {!hasAnswer ? <AppText variant="caption" color={colors.caution} style={styles.required}>{t(multiSelect ? 'questions.requiredMulti' : 'questions.required')}</AppText> : null}
      {error ? <AppText variant="small" color={colors.elevated} style={styles.required}>{t('processing.serviceErrorBody')}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.md },
  progressRow: { marginBottom: spacing.xs },
  question: { marginTop: spacing.md },
  sectionLabel: { marginTop: spacing.xl, textTransform: 'uppercase', letterSpacing: 1.1 },
  description: { marginTop: spacing.sm },
  options: { marginTop: spacing.xxl, gap: spacing.sm },
  required: { marginTop: spacing.md },
});
