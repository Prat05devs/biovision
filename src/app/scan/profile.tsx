import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { OptionButton } from '@/components/ui/OptionButton';
import { Screen } from '@/components/ui/Screen';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing, typography } from '@/theme/tokens';
import type { ScreeningProfile } from '@/types/assessment';

const MIN_AGE = 1;
const MAX_AGE = 120;
// Only ask about pregnancy where it is plausible; everyone else is recorded as not pregnant.
const PREGNANCY_MIN_AGE = 10;
const PREGNANCY_MAX_AGE = 55;

export default function ScreeningProfileScreen() {
  const { t } = useTranslation();
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

  const next = () => {
    if (!complete || age === undefined || !sex) return;
    setProfile({ ageYears: age, sex, pregnant: asksPregnancy ? pregnant === true : false });
    // Height and weight feed BMI in the lifestyle section of the report.
    if (height !== undefined) setLifestyleAnswer('height_cm', String(height));
    if (weight !== undefined) setLifestyleAnswer('weight_kg', String(weight));
    // Skip the permission page when camera access was already granted.
    router.push(cameraPermission?.granted ? '/scan/vitals' : '/scan/permissions');
  };

  return (
    <Screen footer={<Button label={t('common.continue')} onPress={next} disabled={!complete} icon="camera" />}>
      <AppHeader back title={t('profile.title')} />
      <AppText color={colors.inkMuted} style={styles.description}>{t('profile.description')}</AppText>

      <AppText variant="h2" style={styles.question}>{t('profile.age')}</AppText>
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
        />
        <AppText color={colors.inkMuted}>{t('profile.years')}</AppText>
      </View>
      {ageText !== '' && !ageValid ? (
        <AppText variant="small" color={colors.elevated} style={styles.hint}>{t('profile.ageInvalid')}</AppText>
      ) : null}

      <AppText variant="h2" style={styles.question}>{t('profile.sex')}</AppText>
      <View style={styles.options} accessibilityRole="radiogroup">
        <OptionButton label={t('profile.female')} selected={sex === 'female'} onPress={() => setSex('female')} />
        <OptionButton label={t('profile.male')} selected={sex === 'male'} onPress={() => { setSex('male'); setPregnant(undefined); }} />
      </View>

      {asksPregnancy ? (
        <>
          <AppText variant="h2" style={styles.question}>{t('profile.pregnant')}</AppText>
          <View style={styles.options} accessibilityRole="radiogroup">
            <OptionButton label={t('common.yes')} selected={pregnant === true} onPress={() => setPregnant(true)} />
            <OptionButton label={t('common.no')} selected={pregnant === false} onPress={() => setPregnant(false)} />
          </View>
        </>
      ) : null}

      <AppText variant="h2" style={styles.question}>{t('profile.body')}</AppText>
      <View style={styles.bodyRow}>
        <View style={styles.bodyField}>
          <TextInput style={styles.numberInput} value={heightText} onChangeText={(text) => setHeightText(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad" inputMode="numeric" placeholder="165" placeholderTextColor={colors.inkMuted}
            accessibilityLabel={t('lifestyle.q.height')} maxLength={3} />
          <AppText color={colors.inkMuted}>cm</AppText>
        </View>
        <View style={styles.bodyField}>
          <TextInput style={styles.numberInput} value={weightText} onChangeText={(text) => setWeightText(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad" inputMode="numeric" placeholder="65" placeholderTextColor={colors.inkMuted}
            accessibilityLabel={t('lifestyle.q.weight')} maxLength={3} />
          <AppText color={colors.inkMuted}>kg</AppText>
        </View>
      </View>
      {!heightValid || !weightValid ? (
        <AppText variant="small" color={colors.elevated} style={styles.hint}>{t('profile.bodyInvalid')}</AppText>
      ) : null}

      <NoticeCard title={t('profile.whyTitle')} body={t('profile.whyBody')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  description: { marginTop: spacing.sm },
  question: { marginTop: spacing.xl, marginBottom: spacing.sm },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numberInput: {
    flex: 1,
    maxWidth: 140,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: typography.h2,
  },
  hint: { marginTop: spacing.xs },
  options: { gap: spacing.xs },
  bodyRow: { flexDirection: 'row', gap: spacing.md },
  bodyField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
