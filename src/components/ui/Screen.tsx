import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { RedesignContext } from '@/theme/RedesignContext';
import { FLOATING_NAV_SPACE } from './FloatingNav';

import { colors, layout, spacing } from '@/theme/redesign';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  backgroundColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  hero?: boolean;
}>;

export function Screen({
  children,
  scroll = true,
  padded = true,
  backgroundColor = colors.background,
  contentStyle,
  footer,
  hero = false,
}: ScreenProps) {
  const pathname = usePathname();
  // Tab screens sit under the floating nav (see app/(tabs)/_layout), so their last card or
  // footer action is kept clear of it.
  const tabbed = ['/', '/care', '/wellbeing', '/result'].includes(pathname);
  const navRoom = tabbed ? { paddingBottom: FLOATING_NAV_SPACE } : null;
  const content = scroll ? (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={[styles.scrollContent, padded && styles.padded, !footer && navRoom, contentStyle]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fixedContent, padded && styles.padded, !footer && navRoom, contentStyle]}>{children}</View>
  );

  return (
    <RedesignContext.Provider value={{ enabled: true, hero }}>
      <View style={[styles.safe, { backgroundColor }]}>
        <LinearGradient pointerEvents="none" colors={hero ? ['#2B6C86', '#5E9BB3', '#A7C5D3', '#D9E3EA', colors.background] : ['#C5D9E2', '#D9E3EA', colors.background, colors.background, colors.background]}
          locations={hero ? [0, 0.36, 0.62, 0.82, 1] : [0, 0.24, 0.5, 0.76, 1]} style={styles.gradient} />
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
          <StatusBar style={hero ? 'light' : 'dark'} />
          <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {content}
            {footer ? <View style={[styles.footer, navRoom]}><View style={styles.footerContent}>{footer}</View></View> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </RedesignContext.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 540 },
  fixedContent: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  scrollContent: { flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingBottom: spacing.huge },
  padded: { paddingHorizontal: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    backgroundColor: 'rgba(229,235,240,0.96)',
  },
  // Footers often hold a primary and a secondary action; keep them apart however they are passed.
  footerContent: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: layout.buttonGap },
});
