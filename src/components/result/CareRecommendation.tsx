import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import type { CareRouting } from '@/services/care/routing';
import { colors, radius, shadows, spacing } from '@/theme/tokens';

const timing = { routine: 'result.care.timing.routine', follow_up: 'result.care.timing.follow_up', prompt: 'result.care.timing.prompt' } as const;

/** The doctor to see, why, how soon, and which tests to ask about. */
export function CareRecommendation({ routing }: { routing: CareRouting }) {
  const { t } = useTranslation();
  const openCare = (specialty: string) => router.push({ pathname: '/care', params: { specialty } });
  const primaryName = t(`specialties.${routing.primary}`);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}><AppIcon name="stethoscope" size={24} color={colors.white} /></View>
        <View style={styles.flex}>
          <AppText variant="caption" color="#BFEDE4">{t('result.care.recommended')}</AppText>
          <AppText variant="h2" color={colors.white}>{primaryName}</AppText>
          <AppText variant="small" color="#DDF5F0">{t(timing[routing.level])}</AppText>
        </View>
      </View>

      {routing.reasons.length ? (
        <View style={styles.block}>
          <AppText variant="caption" color="#BFEDE4">{t('result.care.why')}</AppText>
          {routing.reasons.map((reason) => (
            <View key={reason.key} style={styles.reason}>
              <View style={styles.bullet} />
              <AppText variant="small" color={colors.white} style={styles.flex}>{t(`care.reasons.${reason.key}`, reason.values)}</AppText>
            </View>
          ))}
        </View>
      ) : null}

      {routing.tests.length ? (
        <View style={styles.block}>
          <AppText variant="caption" color="#BFEDE4">{t('result.care.tests')}</AppText>
          <View style={styles.chips}>
            {routing.tests.map((test) => (
              <View key={test} style={styles.chip}><AppText variant="caption" color={colors.white} style={styles.chipText}>{t(`care.tests.${test}`)}</AppText></View>
            ))}
          </View>
        </View>
      ) : null}

      <Button label={t('result.care.find', { specialty: primaryName })} onPress={() => openCare(routing.primary)} icon="mapPin" style={styles.button} />
      {routing.also ? (
        <Pressable accessibilityRole="button" onPress={() => openCare(routing.also!)} style={({ pressed }) => [styles.also, pressed && styles.pressed]}>
          <AppText variant="small" color="#DDF5F0" style={styles.flex}>{t('result.care.also', { specialty: t(`specialties.${routing.also}`) })}</AppText>
          <AppIcon name="chevronForward" size={18} color="#DDF5F0" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primaryDark, gap: spacing.md, ...shadows.card },
  header: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  icon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  block: { gap: spacing.xs },
  reason: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6FF2C8', marginTop: 7 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.14)' },
  chipText: { fontWeight: '700' },
  button: { backgroundColor: colors.primary },
  also: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  pressed: { opacity: 0.8 },
});
