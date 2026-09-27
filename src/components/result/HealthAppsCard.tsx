import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { listInstalledHealthApps, openInstalledHealthApp, type InstalledApp } from '@/services/results/healthApps';
import { colors, radius, spacing } from '@/theme/tokens';

/** The health and fitness apps on this phone, so readings can be compared with the person's own. */
export function HealthAppsCard() {
  const { t } = useTranslation();
  const [apps, setApps] = useState<InstalledApp[] | undefined>();

  useEffect(() => {
    let active = true;
    void listInstalledHealthApps()
      .catch(() => [])
      .then((found) => { if (active) setApps(found); });
    return () => { active = false; };
  }, []);

  // Still looking: render nothing rather than a flash of "no apps found".
  if (!apps) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <AppIcon name="activity" size={18} color={colors.primary} />
        <AppText variant="h3">{t('result.healthApps.title')}</AppText>
      </View>
      <AppText variant="small" color={colors.inkMuted}>
        {t(apps.length ? 'result.healthApps.body' : 'result.healthApps.none')}
      </AppText>
      {apps.map((app, index) => (
        <View key={app.id}>
          {index ? <View style={styles.divider} /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('result.healthApps.open', { name: app.name })}
            onPress={() => void openInstalledHealthApp(app)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            {app.icon ? (
              <Image source={{ uri: app.icon }} style={styles.icon} />
            ) : (
              <View style={[styles.icon, styles.iconFallback]}>
                <AppIcon name="heartPulse" size={18} color={colors.primary} />
              </View>
            )}
            <AppText variant="body" style={styles.name} numberOfLines={1}>{app.name}</AppText>
            <AppIcon name="chevronForward" size={18} color={colors.inkMuted} />
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.xl, gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48, paddingVertical: spacing.xs },
  pressed: { opacity: 0.7 },
  icon: { width: 32, height: 32, borderRadius: radius.sm },
  iconFallback: { backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
