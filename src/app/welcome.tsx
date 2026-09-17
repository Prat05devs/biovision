import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { usePreferencesStore } from '@/store/preferences.store';
import { colors, radius, spacing } from '@/theme/tokens';

const points: { icon: AppIconName; key: string }[] = [
  { icon: 'scan', key: 'measure' },
  { icon: 'shieldCheck', key: 'private' },
  { icon: 'stethoscope', key: 'doctor' },
  { icon: 'phone', key: 'emergency' },
];

/** Shown once before first use: what the app does, privacy, and that it does not replace a doctor. */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const acceptTerms = usePreferencesStore((state) => state.acceptTerms);
  const [agreed, setAgreed] = useState(false);

  const start = () => {
    acceptTerms();
    router.replace('/');
  };

  return (
    <Screen footer={<Button label={t('welcome.continue')} onPress={start} disabled={!agreed} icon="arrowForward" iconPosition="right" />}>
      <AppHeader language />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>{t('welcome.eyebrow')}</AppText>
      <AppText variant="display">{t('welcome.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>{t('welcome.description')}</AppText>

      <Card style={styles.card}>
        {points.map(({ icon, key }, index) => (
          <View key={key} style={styles.block}>
            {index ? <View style={styles.divider} /> : null}
            <View style={styles.point}>
              <View style={styles.icon}><AppIcon name={icon} size={20} color={colors.primary} /></View>
              <View style={styles.flex}>
                <AppText variant="h3">{t(`welcome.points.${key}.title`)}</AppText>
                <AppText variant="small" color={colors.inkMuted} style={styles.body}>{t(`welcome.points.${key}.body`)}</AppText>
              </View>
            </View>
          </View>
        ))}
      </Card>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        onPress={() => setAgreed((value) => !value)}
        style={[styles.agree, agreed && styles.agreeOn]}
      >
        <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <AppIcon name="check" size={16} color={colors.white} strokeWidth={3} /> : null}</View>
        <AppText variant="small" style={styles.flex}>{t('welcome.agree')}</AppText>
      </Pressable>
      <View style={styles.links}>
        <Button label={t('settings.privacy')} variant="ghost" onPress={() => router.push({ pathname: '/settings/legal', params: { doc: 'privacy' } })} />
        <Button label={t('settings.terms')} variant="ghost" onPress={() => router.push({ pathname: '/settings/legal', params: { doc: 'terms' } })} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  card: { marginTop: spacing.xl, gap: spacing.lg },
  block: { gap: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  icon: { width: 38, height: 38, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  body: { marginTop: spacing.xxs },
  agree: { marginTop: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  agreeOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.inkMuted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.sm },
});
