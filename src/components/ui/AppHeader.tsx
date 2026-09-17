import { deployment } from '@/config/deployment';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { AppIcon } from '@/components/ui/AppIcon';
import { colors, radius, spacing } from '@/theme/tokens';

type AppHeaderProps = {
  back?: boolean;
  language?: boolean;
  /** Show the settings button (language, privacy, terms and about live there). */
  settings?: boolean;
  dark?: boolean;
  title?: string;
};

export function AppHeader({ back = false, language = false, settings = false, dark = false, title }: AppHeaderProps) {
  const { t } = useTranslation();
  const color = dark ? colors.white : colors.ink;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            onPress={goBack}
            hitSlop={10}
            style={styles.iconButton}
          >
            <AppIcon name="arrowBack" size={23} color={color} />
          </Pressable>
        ) : (
          <View style={styles.brandRow}>
            <View style={styles.logoSmall}>
              <View style={styles.logoDot} />
            </View>
            <AppText variant="h3" color={color}>
              {deployment.brandName}
            </AppText>
          </View>
        )}
      </View>
      {title ? (
        <AppText variant="small" color={color} numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <View style={[styles.side, styles.right]}>
        {settings ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings.screenTitle')}
            onPress={() => router.push('/settings')}
            hitSlop={10}
            style={styles.iconButton}
          >
            <AppIcon name="settings" size={23} color={color} />
          </Pressable>
        ) : language ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('navigation.language')}
            onPress={() => router.push('/settings/language')}
            hitSlop={10}
            style={styles.iconButton}
          >
            <AppIcon name="language" size={23} color={color} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { minWidth: 60, flexDirection: 'row', alignItems: 'center' },
  right: { justifyContent: 'flex-end' },
  title: { flex: 1, textAlign: 'center', fontWeight: '700' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  logoSmall: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
});
