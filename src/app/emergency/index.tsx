import { region } from '@/config/deployment';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

export default function EmergencyScreen() {
  const { t } = useTranslation();
  const reportUrgent = useAssessmentStore((state) => state.session.finalAssessment?.urgent);
  const resetSession = useAssessmentStore((state) => state.resetSession);
  const setWellbeingResult = useAssessmentStore((state) => state.setWellbeingResult);
  const phone = reportUrgent?.phone ?? region.emergencyPhone;
  const customMessage = reportUrgent?.message ?? (reportUrgent?.messageKey ? t(reportUrgent.messageKey) : undefined);

  return (
    <Screen backgroundColor="#FFF8F7">
      <AppHeader />
      <View style={styles.warningIcon}><AppIcon name="alertTriangle" size={40} color={colors.urgent} /></View>
      <AppText variant="eyebrow" color={colors.urgent} style={styles.eyebrow}>{t('emergency.eyebrow')}</AppText>
      <AppText variant="h1">{t('emergency.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>{customMessage ?? t('emergency.description')}</AppText>
      <Card tone="urgent" style={styles.urgentCard}>
        <AppIcon name="stethoscope" size={25} color={colors.urgent} />
        <AppText variant="h3" color={colors.urgent}>{t('emergency.instruction')}</AppText>
      </Card>
      {!phone ? (
        <AppText variant="small" color={colors.urgent} style={styles.noPhone}>{t('emergency.noPhone')}</AppText>
      ) : (
        <Button label={t('emergency.call')} onPress={() => void Linking.openURL(`tel:${phone}`)} variant="urgent" icon="phone" style={styles.button} />
      )}
      <Button label={t('emergency.nearby')} onPress={() => router.push('/care')} variant="outline" icon="mapPin" style={styles.secondaryButton} />
      <Button label={t('common.home')} onPress={() => { resetSession(); setWellbeingResult(undefined); router.replace('/'); }} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  warningIcon: { width: 78, height: 78, borderRadius: radius.xl, backgroundColor: colors.urgentSoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  eyebrow: { marginTop: spacing.lg, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  urgentCard: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  noPhone: { marginTop: spacing.lg },
  button: { marginTop: spacing.xl },
  secondaryButton: { marginTop: spacing.sm },
});
