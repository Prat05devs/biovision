import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import type { AppearanceCheck } from '@/services/vision/appearanceModules';
import { colors, spacing } from '@/theme/tokens';
export function AppearanceChecks({ checks }: { checks: AppearanceCheck[] }) {
  const { t } = useTranslation();
  return <View style={styles.list}>
    {checks.map(check => <Card key={check.id} style={styles.card}>
      <View style={styles.row}>
        <AppIcon name={check.status === 'not_assessable' ? 'info' : 'eye'} size={22} color={colors.primary} />
        <AppText variant="h3" style={styles.label}>{t(`appearance.modules.${check.id}`)}</AppText>
      </View>
      <AppText variant="small" color={check.status === 'noticed' ? colors.caution : colors.inkMuted}>{t(`appearance.status.${check.status}`)}</AppText>
      <AppText>{t(`appearance.detail.${check.reason}`)}</AppText>
      <AppText variant="caption" color={colors.inkMuted}>{t(`appearance.scope.${check.id}`)}</AppText>
    </Card>)}
  </View>;
}
const styles = StyleSheet.create({ list: { gap: spacing.sm, marginTop: spacing.lg }, card: { gap: spacing.sm }, row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, label: { flex: 1 } });
