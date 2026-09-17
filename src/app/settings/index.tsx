import Constants from 'expo-constants';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { deployment } from '@/config/deployment';
import { usePreferencesStore } from '@/store/preferences.store';
import { colors, radius, spacing } from '@/theme/tokens';

type Row = { icon: AppIconName; label: string; value?: string; href: Href };

export default function SettingsScreen() {
  const { t } = useTranslation();
  const language = usePreferencesStore((state) => state.language);
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const build = Constants.expoConfig?.ios?.buildNumber;

  const groups: { title: string; rows: Row[] }[] = [
    { title: t('settings.general'), rows: [
      { icon: 'language', label: t('navigation.language'), value: language === 'hi' ? t('settings.hindi') : t('settings.english'), href: '/settings/language' },
    ] },
    { title: t('settings.about'), rows: [
      { icon: 'info', label: t('settings.howItWorks'), href: { pathname: '/settings/legal', params: { doc: 'howItWorks' } } },
      { icon: 'stethoscope', label: t('settings.medical'), href: { pathname: '/settings/legal', params: { doc: 'medical' } } },
      { icon: 'shieldCheck', label: t('settings.privacy'), href: { pathname: '/settings/legal', params: { doc: 'privacy' } } },
      { icon: 'fileText', label: t('settings.terms'), href: { pathname: '/settings/legal', params: { doc: 'terms' } } },
      { icon: 'list', label: t('settings.acknowledgements'), href: { pathname: '/settings/legal', params: { doc: 'acknowledgements' } } },
    ] },
  ];

  return (
    <Screen>
      <AppHeader back title={t('settings.screenTitle')} />
      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <AppText variant="eyebrow" color={colors.inkMuted} style={styles.groupTitle}>{group.title}</AppText>
          <Card style={styles.card}>
            {group.rows.map((row, index) => (
              <Pressable key={row.label} accessibilityRole="button" onPress={() => router.push(row.href)}
                style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.pressed]}>
                <View style={styles.icon}><AppIcon name={row.icon} size={19} color={colors.primary} /></View>
                <AppText style={styles.label}>{row.label}</AppText>
                {row.value ? <AppText variant="small" color={colors.inkMuted}>{row.value}</AppText> : null}
                <AppIcon name="chevronForward" size={18} color={colors.inkMuted} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
      <View style={styles.footer}>
        <AppText variant="h3">{deployment.brandName}</AppText>
        <AppText variant="caption" color={colors.inkMuted}>{t('settings.version', { version, build: build ?? '1' })}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: spacing.xl },
  groupTitle: { marginBottom: spacing.xs, marginLeft: spacing.xs },
  card: { paddingVertical: 0, paddingHorizontal: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, minHeight: 56 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  footer: { alignItems: 'center', marginTop: spacing.xxl, gap: spacing.xxs },
});
