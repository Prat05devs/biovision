import { region, regionName } from '@/config/deployment';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radius, spacing } from '@/theme/tokens';

export default function CareMapScreen() {
  const { t, i18n } = useTranslation();
  const [error, setError] = useState(false);
  const open = async () => { try { await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(region.mapsQuery)}`); } catch { setError(true); } };
  return (
    <Screen scroll={false} footer={<Button label={t('care.list')} onPress={() => router.back()} icon="list" />}>
      <AppHeader back title={t('care.map')} />
      <View style={styles.content}>
        <View style={styles.icon}><AppIcon name="map" size={40} color={colors.primary} /></View>
        <AppText variant="h2" style={styles.center}>{t('care.googleMaps')}</AppText>
        <AppText color={colors.inkMuted} style={styles.center}>{t('care.mapBody', { city: regionName(i18n.language) })}</AppText>
        <Button label={t('care.googleMaps')} onPress={() => void open()} icon="navigation" />
        {error ? <AppText color={colors.urgent}>{t('health.error')}</AppText> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: { width: 78, height: 78, borderRadius: radius.xl, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  center: { textAlign: 'center', marginBottom: spacing.sm },
});
