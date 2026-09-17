import { StyleSheet, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

export function ResultSection({ icon, title, body }: { icon: AppIconName; title: string; body: string }) {
  return (
    <View style={styles.section}>
      <View style={styles.icon}>
        <AppIcon name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <AppText variant="small" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="small" color={colors.inkMuted} style={styles.body}>
          {body}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  copy: { flex: 1 },
  title: { fontWeight: '800' },
  body: { marginTop: spacing.xxs },
});
