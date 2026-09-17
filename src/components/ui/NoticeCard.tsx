import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, spacing } from '@/theme/tokens';

export function NoticeCard({ title, body, urgent = false }: { title: string; body: string; urgent?: boolean }) {
  const color = urgent ? colors.urgent : colors.caution;
  return (
    <Card tone={urgent ? 'urgent' : 'caution'} style={styles.card}>
      <View style={styles.titleRow}>
        <AppIcon name={urgent ? 'alertTriangle' : 'info'} size={20} color={color} />
        <AppText variant="small" color={color} style={styles.title}>
          {title}
        </AppText>
      </View>
      <AppText variant="small" color={colors.ink}>
        {body}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Vertical margins keep the notice clear of inputs and cards above and below it on every screen.
  card: { gap: spacing.sm, padding: spacing.xl, marginVertical: spacing.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { fontWeight: '800' },
});
