import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * A persistent route to crisis support.
 *
 * It appears on every wellbeing screen so that reaching help never depends on
 * finishing the questionnaire or on a particular score.
 */
export function CrisisLink({ style }: { style?: object }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('wellbeing.crisis.linkAccessibility')}
      onPress={() => router.push('/wellbeing/support')}
      style={({ pressed }) => [styles.link, pressed && styles.pressed, style]}
    >
      <View style={styles.icon}>
        <AppIcon name="heartPulse" size={18} color={colors.urgent} />
      </View>
      <AppText variant="small" color={colors.urgent} style={styles.label}>
        {t('wellbeing.crisis.link')}
      </AppText>
      <AppIcon name="chevronForward" size={18} color={colors.urgent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F8B4AE',
    backgroundColor: colors.urgentSoft,
  },
  pressed: { opacity: 0.78 },
  icon: { alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontWeight: '700' },
});
