import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { colors } from '@/theme/tokens';

export const scanColors = {
  glass: 'rgba(6, 22, 24, 0.46)',
  glassStrong: 'rgba(6, 22, 24, 0.62)',
  hairline: 'rgba(255, 255, 255, 0.16)',
  mint: '#6FF2C8',
  mintSoft: '#BFFBEA',
  heart: '#FF5A6E',
  textMuted: 'rgba(233, 250, 246, 0.72)',
} as const;

/** Round translucent button that floats over the camera. */
export function GlassIconButton({ icon, label, onPress }: { icon: AppIconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}
      style={({ pressed }) => [styles.glassButton, pressed && styles.pressed]}>
      <AppIcon name={icon} size={21} color={colors.white} />
    </Pressable>
  );
}

export function GlassPill({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.pill, style]}>{children}</View>;
}

/** Live blood-volume-pulse trace, drawn from the model's own samples. */
export function PulseWaveform({ samples, width, height }: { samples: number[] | undefined; width: number; height: number }) {
  const path = useMemo(() => {
    if (!samples || samples.length < 4) return '';
    let min = Infinity, max = -Infinity;
    for (const value of samples) { if (value < min) min = value; if (value > max) max = value; }
    const range = max - min || 1;
    const step = width / (samples.length - 1);
    return samples.reduce((d, value, index) => {
      const x = index * step;
      const y = height - 3 - ((value - min) / range) * (height - 6);
      return `${d}${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)} `;
    }, '');
  }, [samples, width, height]);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="trace" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={scanColors.mint} stopOpacity="0" />
          <Stop offset="0.35" stopColor={scanColors.mint} stopOpacity="0.55" />
          <Stop offset="1" stopColor={scanColors.mintSoft} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      {path ? <Path d={path} fill="none" stroke="url(#trace)" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" /> : null}
    </Svg>
  );
}

/** A heart that beats at the measured rate (a gentle idle pulse before a rate exists). */
export function BeatingHeart({ bpm, size = 26 }: { bpm?: number; size?: number }) {
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      const period = bpm && bpm > 30 ? 60_000 / bpm : 1100;
      animation = Animated.loop(Animated.sequence([
        Animated.timing(scale, { toValue: 1.22, duration: period * 0.14, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: period * 0.16, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.08, duration: period * 0.12, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: period * 0.58, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]));
      animation.start();
    });
    return () => { cancelled = true; animation?.stop(); };
  }, [bpm, scale]);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <AppIcon name="heart" size={size} color={scanColors.heart} strokeWidth={2.4} />
    </Animated.View>
  );
}

const RING_SIZE = 92;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Shutter-style start button; during a scan the ring fills and shows seconds left. */
export function CaptureButton({ progress, secondsLeft, disabled, recording, label, onPress }: {
  progress: number;
  secondsLeft?: number;
  disabled: boolean;
  recording: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled || recording} onPress={onPress}
      style={({ pressed }) => [styles.capture, pressed && styles.pressed, disabled && styles.disabled]}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="rgba(255,255,255,0.35)" strokeWidth={RING_STROKE} fill="none" />
        {recording ? (
          <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={scanColors.mint} strokeWidth={RING_STROKE} fill="none"
            strokeLinecap="round" strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`} />
        ) : null}
      </Svg>
      {recording ? (
        <AppText variant="h2" color={colors.white} style={styles.seconds}>{secondsLeft}</AppText>
      ) : (
        <View style={[styles.captureCore, disabled && styles.captureCoreDisabled]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glassButton: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: scanColors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: scanColors.hairline,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: scanColors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: scanColors.hairline,
  },
  capture: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  captureCore: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.white },
  captureCoreDisabled: { backgroundColor: 'rgba(255,255,255,0.55)' },
  seconds: { fontVariant: ['tabular-nums'] },
  pressed: { transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.6 },
});
