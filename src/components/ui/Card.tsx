import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme/tokens';

type CardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'soft' | 'caution' | 'urgent' | 'dark';
}>;

const tones: Record<NonNullable<CardProps['tone']>, ViewStyle> = {
  default: { backgroundColor: colors.surface, borderColor: colors.border },
  soft: { backgroundColor: colors.primarySoft, borderColor: '#BEE4DC' },
  caution: { backgroundColor: colors.cautionSoft, borderColor: '#F2D49A' },
  urgent: { backgroundColor: colors.urgentSoft, borderColor: '#F8B4AE' },
  dark: { backgroundColor: colors.ink, borderColor: colors.ink },
};

export function Card({ children, style, tone = 'default' }: CardProps) {
  return <View style={[styles.card, tones[tone], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
});

