import { StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

export function FeatureRow({
  icon,
  title,
  description,
  compact = false,
}: {
  icon: AppIconName;
  title: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.icon, compact && styles.iconCompact]}>
        <AppIcon name={icon} size={compact ? 18 : 22} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <AppText variant={compact ? 'small' : 'h3'}>{title}</AppText>
        {description ? (
          <AppText variant="small" color={colors.inkMuted} style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconCompact: { width: 36, height: 36, borderRadius: radius.sm },
  copy: { flex: 1 },
  description: { marginTop: spacing.xxs },
});
