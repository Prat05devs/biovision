import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { colors, radius } from '@/theme/tokens';

export function ProgressBar({ progress, dark = false }: { progress: number; dark?: boolean }) {
  const [animated] = useState(() => new Animated.Value(0));
  const bounded = Math.min(100, Math.max(0, progress));
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!active) return;
      if (reduce) animated.setValue(bounded);
      else Animated.timing(animated, { toValue: bounded, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    });
    return () => { active = false; };
  }, [animated, bounded]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }}
      style={[styles.track, dark && styles.trackDark]}
    >
      <Animated.View style={[styles.fill, { width: animated.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 7, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  trackDark: { backgroundColor: 'rgba(255,255,255,0.2)' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
});
