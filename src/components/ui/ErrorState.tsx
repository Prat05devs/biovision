import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { colors, radius, spacing } from '@/theme/tokens';

export function ErrorState({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <AppIcon name="alertCircle" size={34} color={colors.elevated} />
      </View>
      <AppText variant="h2" style={styles.center}>
        {title}
      </AppText>
      <AppText color={colors.inkMuted} style={styles.center}>
        {body}
      </AppText>
      {action && onAction ? <Button label={action} onPress={onAction} style={styles.button} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: {
    width: 68,
    height: 68,
    borderRadius: radius.xl,
    backgroundColor: colors.elevatedSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  center: { textAlign: 'center', marginBottom: spacing.sm },
  button: { alignSelf: 'stretch', marginTop: spacing.lg },
});
