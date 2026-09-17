import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import type { AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeatureRow } from '@/components/ui/FeatureRow';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/theme/tokens';

const steps: { icon: AppIconName; key: string }[] = [
  { icon: 'list', key: 'profile' },
  { icon: 'scan', key: 'face' },
  { icon: 'eye', key: 'eyes' },
  { icon: 'messages', key: 'questions' },
];

export default function ScanIntroScreen() {
  const { t } = useTranslation();
  return (
    <Screen footer={<Button label={t('scanIntro.begin')} onPress={() => router.push('/scan/profile')} icon="arrowForward" iconPosition="right" />}>
      <AppHeader back title={t('navigation.scan')} />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>{t('scanIntro.step')}</AppText>
      <AppText variant="h1">{t('scanIntro.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>{t('scanIntro.description')}</AppText>
      <Card style={styles.card}>
        {steps.map(({ icon, key }, index) => (
          <View key={key} style={styles.block}>
            {index ? <View style={styles.divider} /> : null}
            <FeatureRow icon={icon} title={t(`scanIntro.steps.${key}.title`)} description={t(`scanIntro.steps.${key}.body`)} />
          </View>
        ))}
      </Card>
      <Card tone="soft" style={styles.card}>
        <FeatureRow icon="sun" title={t('scanIntro.goodLight')} description={t('scanIntro.goodLightBody')} />
        <View style={styles.divider} />
        <FeatureRow icon="smartphone" title={t('scanIntro.steady')} description={t('scanIntro.steadyBody')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xxl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  card: { marginTop: spacing.xl, gap: spacing.lg },
  block: { gap: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
