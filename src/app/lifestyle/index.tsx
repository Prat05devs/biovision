import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { retainResearchQuestionnaire } from '@/api/services.api';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OptionButton } from '@/components/ui/OptionButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { lifestyleQuestions } from '@/data/lifestyleQuestions';
import type { LifestyleQuestion } from '@/types/lifestyle';
import { assessmentService } from '@/services';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing, typography } from '@/theme/tokens';

// Height and weight are collected on the About you screen before the scan.
const habitQuestions: LifestyleQuestion[] = lifestyleQuestions.filter((question) => question.type !== 'number');

export default function LifestyleScreen() {
  const { t } = useTranslation();
  const answers = useAssessmentStore((state) => state.session.lifestyle);
  const setLifestyleAnswer = useAssessmentStore((state) => state.setLifestyleAnswer);
  const setFinalAssessment = useAssessmentStore((state) => state.setFinalAssessment);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const question = habitQuestions[index];
  const symptomCount = useAssessmentStore((state) => state.session.questionnaire.questions.length);
  const current = symptomCount + index + 1;
  const total = symptomCount + habitQuestions.length;
  const answer = question ? answers[question.id] : undefined;
  const isLast = index === habitQuestions.length - 1;

  // Hold the narrowed variants so the union survives into JSX and callbacks.
  const choiceQuestion = question?.type === 'single_choice' ? question : undefined;
  const numberQuestion = question?.type === 'number' ? question : undefined;

  const numericAnswer = Number(answer);
  const numericValid =
    numberQuestion !== undefined &&
    answer !== undefined &&
    answer !== '' &&
    Number.isFinite(numericAnswer) &&
    numericAnswer >= numberQuestion.min &&
    numericAnswer <= numberQuestion.max;
  const canAdvance = numberQuestion ? numericValid : answer !== undefined;

  const finish = async () => {
    setSubmitting(true);
    setError(false);
    try {
      const currentSession = useAssessmentStore.getState().session;
      const report = await assessmentService.complete(currentSession);
      if (currentSession.scan.researchConsent) {
        void retainResearchQuestionnaire(currentSession).catch(() => {
          if (__DEV__) console.warn('Questionnaire research retention was unavailable.');
        });
      }
      setFinalAssessment(report);
      router.replace(report.urgentKind === 'mental_health' ? '/wellbeing/support' : report.urgentActionRequired ? '/emergency' : '/result');
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!canAdvance) return;
    if (!isLast) {
      setIndex((value) => value + 1);
      return;
    }
    void finish();
  };

  const skip = () => {
    if (isLast) {
      void finish();
      return;
    }
    setIndex((value) => value + 1);
  };

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button
            label={isLast ? t('lifestyle.finish') : t('common.next')}
            onPress={next}
            disabled={!canAdvance}
            loading={submitting}
            icon="arrowForward"
            iconPosition="right"
          />
          <Button label={t('lifestyle.skip')} onPress={skip} variant="ghost" />
        </View>
      }
    >
      <Stack.Screen options={{ animation: 'fade' }} />
      <AppHeader back title={t('questions.navTitle')} />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>
        {t('questions.step')}
      </AppText>
      <View style={styles.progressRow}>
        <AppText variant="small" color={colors.inkMuted}>
          {t('lifestyle.progress', { current, total })}
        </AppText>
      </View>
      <ProgressBar progress={(current / total) * 100} />
      <AppText variant="caption" color={colors.primary} style={styles.section}>{t('lifestyle.section')}</AppText>

      <AppText variant="h1" style={styles.question}>
        {question ? t(question.textKey) : ''}
      </AppText>
      <AppText color={colors.inkMuted} style={styles.description}>
        {t('lifestyle.description')}
      </AppText>

      {choiceQuestion ? (
        <View accessibilityRole="radiogroup" style={styles.options}>
          {choiceQuestion.options.map((option) => (
            <OptionButton
              key={option.value}
              label={t(option.labelKey)}
              selected={answer === option.value}
              onPress={() => setLifestyleAnswer(choiceQuestion.id, option.value)}
            />
          ))}
        </View>
      ) : null}

      {numberQuestion ? (
        <View style={styles.numberRow}>
          <TextInput
            style={styles.numberInput}
            value={answer === undefined ? '' : String(answer)}
            onChangeText={(text) =>
              setLifestyleAnswer(numberQuestion.id, text.replace(/[^0-9.]/g, ''))
            }
            keyboardType="numeric"
            inputMode="numeric"
            placeholder={String(numberQuestion.min)}
            placeholderTextColor={colors.inkMuted}
            accessibilityLabel={t(numberQuestion.textKey)}
            maxLength={5}
          />
          <AppText variant="body" color={colors.inkMuted}>
            {t(numberQuestion.unitKey)}
          </AppText>
        </View>
      ) : null}

      {numberQuestion && answer !== undefined && answer !== '' && !numericValid ? (
        <AppText variant="caption" color={colors.caution} style={styles.hint}>
          {t('lifestyle.range', { min: numberQuestion.min, max: numberQuestion.max })}
        </AppText>
      ) : null}

      {error ? (
        <AppText variant="small" color={colors.elevated} style={styles.hint}>
          {t('processing.serviceErrorBody')}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.md },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  question: { marginTop: spacing.md },
  section: { marginTop: spacing.xl, textTransform: 'uppercase', letterSpacing: 1.1 },
  description: { marginTop: spacing.sm },
  options: { marginTop: spacing.xl, gap: spacing.sm },
  numberRow: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numberInput: {
    flex: 1,
    maxWidth: 180,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: typography.h2,
  },
  hint: { marginTop: spacing.md },
  footer: { gap: spacing.xs },
});
