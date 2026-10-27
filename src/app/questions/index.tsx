import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { OptionButton } from '@/components/ui/OptionButton';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { lifestyleQuestions } from '@/data/lifestyleQuestions';
import { Screen } from '@/components/ui/Screen';
import { ScanSteps } from '@/components/ui/ScanSteps';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { assessmentService } from '@/services';
import { retainResearchQuestionnaire } from '@/api/services.api';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, layout, radius, spacing } from '@/theme/redesign';
import { useResponsiveLayout } from '@/theme/responsive';

const concernIcons: Record<string, AppIconName> = {
  none: 'shieldCheck', tiredness: 'moon', breathing: 'wind', heart: 'heartPulse',
  skin: 'sparkles', mood: 'brain', head: 'activity', metabolic: 'droplet',
  stomach: 'leaf', joints: 'hand', ent: 'messages', eyes: 'eye', womens: 'heart',
};

export default function QuestionsScreen() {
  const { t } = useTranslation();
  const session = useAssessmentStore((state) => state.session);
  const answerQuestion = useAssessmentStore((state) => state.answerQuestion);
  const addQuestion = useAssessmentStore((state) => state.addQuestion);
  const setFinalAssessment = useAssessmentStore((state) => state.setFinalAssessment);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);
  const { compact } = useResponsiveLayout();

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
        profile: currentSession.profile,
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
      <ScanSteps current={3} />
      <AppText variant="display" style={styles.heading}>{t(question.id === 'urgent_symptoms' ? 'redesign.safetyTitle' : question.id === 'main_concern' ? 'redesign.mainConcern' : 'redesign.questionsTitle')}</AppText>
      <Card style={styles.questionCard}>
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
      {question.contextKey ? (
        // Sensitive questions open with a calm reason, not an alarm, before anyone has answered.
        <Card tone="soft" style={styles.context}>
          <AppText variant="small" color={colors.primaryDark}>{t('profile.whyTitle')}</AppText>
          <AppText variant="small">{t(question.contextKey)}</AppText>
        </Card>
      ) : null}
      <AppText variant="h1" style={styles.question}>{t(question.textKey)}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>
        {t(question.followUpOf ? 'questions.followUpDescription' : 'questions.description')}
      </AppText>
      <View accessibilityRole={multiSelect ? 'list' : 'radiogroup'} style={[styles.options, question.id === 'main_concern' && styles.concerns]}>
        {options.map((option) => (
          question.id === 'main_concern' ? <Pressable key={String(option.value)} accessibilityRole="radio"
            accessibilityLabel={option.label} accessibilityState={{ checked: answer === option.value }}
            onPress={() => answerQuestion(question.id, option.value)}
            style={({ pressed }) => [styles.concern, compact && { flexBasis: '100%' }, option.value === 'none' && styles.concernNone, answer === option.value && styles.concernSelected, pressed && { opacity: 0.75 }]}>
            <View style={styles.concernIcon}><AppIcon name={concernIcons[String(option.value)] ?? 'stethoscope'} size={22} color={colors.primary} strokeWidth={1.6} /></View>
            <AppText variant="small" color={answer === option.value ? colors.white : colors.ink}>{option.label}</AppText>
          </Pressable> :
          <OptionButton
            key={String(option.value)}
            multiple={multiSelect}
            label={option.label}
            selected={multiSelect ? selected.includes(String(option.value)) : answer === option.value}
            onPress={() => (multiSelect ? toggleOption(String(option.value)) : answerQuestion(question.id, option.value))}
          />
        ))}
      </View>
      </Card>
      {!hasAnswer ? <AppText variant="caption" color={colors.caution} style={styles.required}>{t(multiSelect ? 'questions.requiredMulti' : 'questions.required')}</AppText> : null}
      {error ? <AppText variant="small" color={colors.elevated} style={styles.required}>{t('processing.serviceErrorBody')}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: spacing.md },
  questionCard: { marginTop: spacing.lg },
  concerns: { flexDirection: 'row', flexWrap: 'wrap' },
  concern: { flexBasis: '45%', flexGrow: 1, minHeight: 116, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, padding: 14, gap: 12, justifyContent: 'space-between' },
  concernSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  concernNone: { flexBasis: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', minHeight: 76 },
  concernIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { marginTop: spacing.lg, marginBottom: spacing.sm },
  progressRow: { marginBottom: spacing.xs },
  question: { marginTop: spacing.md },
  sectionLabel: { marginTop: spacing.lg, textTransform: 'uppercase', letterSpacing: 1.1 },
  description: { marginTop: spacing.sm },
  context: { marginTop: spacing.md, gap: spacing.xs },
  options: { marginTop: spacing.xl, gap: layout.optionGap },
  required: { marginTop: spacing.md },
});
