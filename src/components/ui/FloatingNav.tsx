import type { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon, type AppIconName } from './AppIcon';
import { colors, shadows } from '@/theme/redesign';

const items: Record<string, { icon: AppIconName; label: string }> = {
  index: { icon: 'home', label: 'redesign.home' },
  care: { icon: 'mapPin', label: 'navigation.care' },
  wellbeing: { icon: 'message', label: 'navigation.wellbeing' },
  result: { icon: 'fileText', label: 'result.title' },
};

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Height the pill occupies above the safe area; screens leave this much room below content. */
export const FLOATING_NAV_SPACE = 84;

export function FloatingNav({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;
  // Absolutely positioned, so the pill floats over the screen rather than sitting in a bar.
  return (
    <View pointerEvents="box-none" style={[styles.overlay, { bottom: insets.bottom + 12 }]}>
      <View style={styles.pill} accessibilityRole="tablist">
        {state.routes.map((route, index) => {
          const item = items[route.name];
          if (!item) return null;
          const selected = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!selected && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={t(item.label)}
            accessibilityState={{ selected }} onPress={onPress}
            style={({ pressed }) => [styles.item, selected && styles.selected, pressed && styles.pressed]}>
            <AppIcon name={item.icon} size={21} color={selected ? colors.white : colors.ink} strokeWidth={1.7} />
          </Pressable>;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: { flexDirection: 'row', gap: 6, padding: 6, borderRadius: 999,
    borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.82)', ...shadows.card },
  item: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.ink },
  pressed: { opacity: 0.65 },
});
