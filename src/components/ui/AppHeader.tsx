import { deployment } from '@/config/deployment';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from './AppText';
import { AppIcon } from './AppIcon';
import { colors, spacing } from '@/theme/redesign';
import { useRedesign } from '@/theme/RedesignContext';
import { usePreferencesStore } from '@/store/preferences.store';

type AppHeaderProps = { back?: boolean; language?: boolean; settings?: boolean; dark?: boolean; title?: string };

export function AppHeader({ back = false, language = false, settings = false, dark = false, title }: AppHeaderProps) {
  const { t } = useTranslation();
  const { hero } = useRedesign();
  const lang = usePreferencesStore(state => state.language);
  const setLanguage = usePreferencesStore(state => state.setLanguage);
  const light = dark || hero;
  const color = light ? colors.white : colors.ink;
  const glass = light ? styles.deepGlass : styles.glass;
  return (
    <View style={styles.row}>
      {back ? <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={[styles.iconButton, glass]}>
        <AppIcon name="arrowBack" size={21} color={color} strokeWidth={1.7} />
      </Pressable> : <View style={[styles.brand, glass]}>
        <Image source={require('../../../assets/images/app-icon.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <AppText variant="h3" color={color} style={styles.brandText}>{deployment.brandName}</AppText>
      </View>}
      {title ? <AppText variant="small" color={color} style={styles.title}>{title}</AppText> : <View style={styles.spacer} />}
      <View style={styles.actions}>
        {language ? <Pressable accessibilityRole="button" accessibilityLabel={t('navigation.language')}
          onPress={() => setLanguage(lang === 'en' ? 'hi' : 'en')} style={[styles.language, glass]}>
          <AppIcon name="language" size={18} color={color} strokeWidth={1.7} />
          <AppText variant="small" color={color}>{lang === 'hi' ? 'हिं' : 'EN'}</AppText>
        </Pressable> : null}
        {settings ? <Pressable accessibilityRole="button" accessibilityLabel={t('settings.screenTitle')}
          onPress={() => router.push('/settings')} style={[styles.iconButton, glass]}>
          <AppIcon name="settings" size={20} color={color} strokeWidth={1.7} />
        </Pressable> : null}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, paddingTop: 4 },
  brand: { flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 5, paddingRight: 14, borderRadius: 999 },
  brandText: { fontWeight: '600', flexShrink: 1 },
  logo: { width: 36, height: 36, borderRadius: 10 },
  title: { flex: 1, minWidth: 80, textAlign: 'center', fontWeight: '500' },
  spacer: { flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  language: { minHeight: 46, paddingHorizontal: 12, gap: 5, flexDirection: 'row', alignItems: 'center', borderRadius: 999 },
  glass: { backgroundColor: 'rgba(255,255,255,0.64)', borderWidth: 1, borderColor: colors.border },
  deepGlass: { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)' },
});
