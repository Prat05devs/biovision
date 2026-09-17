import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { OptionButton } from '@/components/ui/OptionButton';
import { Screen } from '@/components/ui/Screen';
import { usePreferencesStore, type AppLanguage } from '@/store/preferences.store';
import { colors, spacing } from '@/theme/tokens';

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const language = usePreferencesStore((state) => state.language);
  const setLanguage = usePreferencesStore((state) => state.setLanguage);
  const languages: { value: AppLanguage; label: string }[] = [
    { value: 'en', label: t('settings.english') },
    { value: 'hi', label: t('settings.hindi') },
  ];

  return (
    <Screen footer={<Button label={t('common.done')} onPress={() => router.back()} icon="check" />}>
      <AppHeader back title={t('navigation.language')} />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>{t('settings.eyebrow')}</AppText>
      <AppText variant="h1">{t('settings.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>{t('settings.description')}</AppText>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {languages.map((item) => (
          <OptionButton key={item.value} label={item.label} selected={language === item.value} onPress={() => setLanguage(item.value)} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xxl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  options: { marginTop: spacing.xxl, gap: spacing.sm },
});
