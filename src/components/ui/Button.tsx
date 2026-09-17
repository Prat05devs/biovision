import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { AppText } from '@/components/ui/AppText';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { colors, radius, spacing } from '@/theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'urgent';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: AppIconName;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const variantStyle: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.ink },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: colors.transparent },
  urgent: { backgroundColor: colors.urgent },
};
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  disabled,
  loading,
  accessibilityLabel,
  style,
}: ButtonProps) {
  const foreground = variant === 'outline' || variant === 'ghost' ? colors.ink : colors.white;
  const [scale] = useState(() => new Animated.Value(1));
  const reduceMotion = useRef(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { reduceMotion.current = value; });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => { reduceMotion.current = value; });
    return () => subscription.remove();
  }, []);
  const animateScale = (toValue: number) => {
    if (reduceMotion.current) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue, speed: 28, bounciness: 5, useNativeDriver: true }).start();
  };
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={() => animateScale(0.965)}
      onPressOut={() => animateScale(1)}
      style={[styles.base, variantStyle[variant], (disabled || loading) && styles.disabled, style, { transform: [{ scale }] }]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' ? <AppIcon name={icon} size={19} color={foreground} /> : null}
          <AppText variant="small" color={foreground} style={styles.label}>{label}</AppText>
          {icon && iconPosition === 'right' ? <AppIcon name={icon} size={19} color={foreground} /> : null}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { flexShrink: 1, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.45 },
});
