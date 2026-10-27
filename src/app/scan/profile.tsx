import { useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { ScanSteps } from '@/components/ui/ScanSteps';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { OptionButton } from '@/components/ui/OptionButton';
import { Screen } from '@/components/ui/Screen';
import { startQuestionsWithoutCamera } from '@/services/local/withoutCamera';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, layout, MAX_FONT_SCALE, radius, spacing, typography } from '@/theme/redesign';
import { displayFontFamily as fontFamily } from '@/theme/fonts';
import type { ScreeningProfile } from '@/types/assessment';
import { useResponsiveLayout } from '@/theme/responsive';

const MIN_AGE = 1;
const MAX_AGE = 120;
// Only ask about pregnancy where it is plausible; everyone else is recorded as not pregnant.
const PREGNANCY_MIN_AGE = 10;
const PREGNANCY_MAX_AGE = 55;

export default function ScreeningProfileScreen() {
  const { t } = useTranslation();
  const { compact } = useResponsiveLayout();
  // `mode=questions` is the camera-free check from Home: same profile, then straight to the questions.
  const questionsOnly = useLocalSearchParams<{ mode?: string }>().mode === 'questions';
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const saved = useAssessmentStore((state) => state.session.profile);
  const setProfile = useAssessmentStore((state) => state.setProfile);
  const [cameraPermission] = useCameraPermissions();
  const [ageText, setAgeText] = useState(saved ? String(saved.ageYears) : '');
  const [sex, setSex] = useState<ScreeningProfile['sex'] | undefined>(saved?.sex);
  const [pregnant, setPregnant] = useState<boolean | undefined>(saved?.pregnant);
  const lifestyle = useAssessmentStore((state) => state.session.lifestyle);
  const setLifestyleAnswer = useAssessmentStore((state) => state.setLifestyleAnswer);
  const [heightText, setHeightText] = useState(lifestyle.height_cm !== undefined ? String(lifestyle.height_cm) : '');
  const [weightText, setWeightText] = useState(lifestyle.weight_kg !== undefined ? String(lifestyle.weight_kg) : '');
  const height = heightText === '' ? undefined : Number(heightText);
  const weight = weightText === '' ? undefined : Number(weightText);
  const heightValid = height === undefined || (height >= 100 && height <= 220);
  const weightValid = weight === undefined || (weight >= 25 && weight <= 200);

  const age = ageText === '' ? undefined : Number(ageText);
  const ageValid = age !== undefined && Number.isInteger(age) && age >= MIN_AGE && age <= MAX_AGE;
  const asksPregnancy = ageValid && sex === 'female' && age >= PREGNANCY_MIN_AGE && age <= PREGNANCY_MAX_AGE;
  const complete = ageValid && sex !== undefined && (!asksPregnancy || pregnant !== undefined) && heightValid && weightValid;

  const next = async () => {
    if (!complete || age === undefined || !sex || starting) return;
    const profile = { ageYears: age, sex, pregnant: asksPregnancy ? pregnant === true : false };
    setProfile(profile);
    // Height and weight feed BMI in the lifestyle section of the report.
    if (height !== undefined) setLifestyleAnswer('height_cm', String(height));
    if (weight !== undefined) setLifestyleAnswer('weight_kg', String(weight));
    if (questionsOnly) {
      setStarting(true);
      setStartError(false);
      try {
        await startQuestionsWithoutCamera(profile);
        router.push('/questions');
      } catch {
        setStartError(true);
      } finally {
        setStarting(false);
      }
      return;
    }
    // Skip the permission page when camera access was already granted.
    router.push(cameraPermission?.granted ? '/scan/vitals' : '/scan/permissions');
  };

  return (
    <Screen footer={<Button label={t('common.continue')} onPress={() => void next()} disabled={!complete} loading={starting}
      icon={questionsOnly ? 'arrowForward' : 'camera'} iconPosition={questionsOnly ? 'right' : undefined} />}>
      <AppHeader back title={t('profile.title')} />
      <ScanSteps current={0} />
      <AppText variant="display" style={{ marginTop: 8 }}>{t('redesign.aboutYou')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>{t('profile.description')}</AppText>

      <Card style={{ marginTop: 20 }}>
      <AppText variant="h3" style={[styles.question, { marginTop: 0 }]}>{t('profile.sex')}</AppText>
      <View style={[styles.sexRow, compact && { flexDirection: 'column' }]} accessibilityRole="radiogroup">
        <OptionButton style={styles.sexOption} label={t('profile.female')} selected={sex === 'female'} onPress={() => setSex('female')} />
        <OptionButton style={styles.sexOption} label={t('profile.male')} selected={sex === 'male'} onPress={() => { setSex('male'); setPregnant(undefined); }} />
      </View>

      <AppText variant="h3" style={styles.question}>{t('profile.age')}</AppText>
      <View style={styles.ageRow}>
        <TextInput
          style={styles.numberInput}
          value={ageText}
          onChangeText={(text) => setAgeText(text.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder="30"
          placeholderTextColor={colors.inkMuted}
          accessibilityLabel={t('profile.age')}
          maxLength={3}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
        />
        <AppText color={colors.inkMuted}>{t('profile.years')}</AppText>
      </View>
      {ageText !== '' && !ageValid ? (
        <AppText variant="small" color={colors.elevated} style={styles.hint}>{t('profile.ageInvalid')}</AppText>
      ) : null}

      {asksPregnancy ? (
        <>
          <AppText variant="h3" style={styles.question}>{t('profile.pregnant')}</AppText>
          <View style={styles.options} accessibilityRole="radiogroup">
            <OptionButton label={t('common.yes')} selected={pregnant === true} onPress={() => setPregnant(true)} />
            <OptionButton label={t('common.no')} selected={pregnant === false} onPress={() => setPregnant(false)} />
          </View>
        </>
      ) : null}

      <AppText variant="h3" style={styles.question}>{t('profile.body')}</AppText>
      <View style={styles.bodyRow}>
        <View style={styles.bodyField}>
          <AppText variant="small" color={colors.inkMuted}>{t('redesign.height')}</AppText>
          <View style={styles.measurement}>
          <TextInput style={styles.numberInput} value={heightText} onChangeText={(text) => setHeightText(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad" inputMode="numeric" placeholder="165" placeholderTextColor={colors.inkMuted}
            accessibilityLabel={t('lifestyle.q.height')} maxLength={3} maxFontSizeMultiplier={MAX_FONT_SCALE} />
          <AppText color={colors.inkMuted}>cm</AppText>
          </View>
        </View>
        <View style={styles.bodyField}>
          <AppText variant="small" color={colors.inkMuted}>{t('redesign.weight')}</AppText>
          <View style={styles.measurement}>
          <TextInput style={styles.numberInput} value={weightText} onChangeText={(text) => setWeightText(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad" inputMode="numeric" placeholder="65" placeholderTextColor={colors.inkMuted}
            accessibilityLabel={t('lifestyle.q.weight')} maxLength={3} maxFontSizeMultiplier={MAX_FONT_SCALE} />
          <AppText color={colors.inkMuted}>kg</AppText>
          </View>
        </View>
      </View>
      {!heightValid || !weightValid ? (
        <AppText variant="small" color={colors.elevated} style={styles.hint}>{t('profile.bodyInvalid')}</AppText>
      ) : null}

      </Card>
      {startError ? <AppText variant="small" color={colors.elevated} accessibilityRole="alert" style={styles.hint}>{t('processing.serviceErrorBody')}</AppText> : null}
      <NoticeCard title={t('profile.whyTitle')} body={t('profile.whyBody')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { marginTop: spacing.sm },
  question: { marginTop: spacing.lg, marginBottom: spacing.xs },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numberInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    maxWidth: 140,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: typography.h2,
    fontFamily: fontFamily(600),
    fontVariant: ['tabular-nums'],
  },
  hint: { marginTop: spacing.xs },
  options: { gap: layout.optionGap },
  sexRow: { flexDirection: 'row', gap: layout.optionGap },
  sexOption: { flex: 1, minWidth: 0 },
  bodyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  bodyField: { flexGrow: 1, flexBasis: '44%', minWidth: 120, gap: 8 },
  measurement: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
