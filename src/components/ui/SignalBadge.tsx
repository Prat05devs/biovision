import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';
import type { ScreeningSignal } from '@/types/assessment';

const tone = {
  low: { backgroundColor: colors.successSoft, color: colors.success },
  moderate: { backgroundColor: colors.cautionSoft, color: colors.caution },
  elevated: { backgroundColor: colors.elevatedSoft, color: colors.elevated },
  unavailable: { backgroundColor: colors.surfaceMuted, color: colors.inkMuted },
};

export function SignalBadge({ signal, label }: { signal: ScreeningSignal; label: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone[signal].backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: tone[signal].color }]} />
      <AppText variant="small" color={tone[signal].color} style={styles.label}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  label: { fontWeight: '800' },
});

