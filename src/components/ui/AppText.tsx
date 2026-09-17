import { Children, isValidElement, type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, typography } from '@/theme/tokens';

type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'eyebrow';

const variantStyles: Record<TextVariant, TextStyle> = {
  display: { fontSize: typography.display, lineHeight: 41, fontWeight: '700', letterSpacing: -1.2 },
  h1: { fontSize: typography.h1, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 },
  h2: { fontSize: typography.h2, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: typography.h3, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: typography.body, lineHeight: 24, fontWeight: '400' },
  small: { fontSize: typography.small, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: typography.caption, lineHeight: 17, fontWeight: '600' },
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
};

// Devanagari vowel signs (matras) and the headline sit above the Latin ascender, so the
// Latin-tuned line heights clip them. Negative tracking also breaks conjunct shaping.
const DEVANAGARI = /[ऀ-ॿ꣠-ꣿ]/;
const DEVANAGARI_LINE_HEIGHT = 1.62;

function containsDevanagari(node: ReactNode): boolean {
  let found = false;
  Children.forEach(node, (child) => {
    if (found) return;
    if (typeof child === 'string') found = DEVANAGARI.test(child);
    else if (isValidElement<{ children?: ReactNode }>(child)) found = containsDevanagari(child.props.children);
  });
  return found;
}

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: TextVariant;
    color?: string;
    style?: StyleProp<TextStyle>;
  }
>;

export function AppText({
  variant = 'body',
  color = colors.ink,
  style,
  children,
  ...props
}: AppTextProps) {
  let scriptStyle: TextStyle | undefined;
  if (containsDevanagari(children)) {
    const flat = StyleSheet.flatten([variantStyles[variant], style]);
    const fontSize = flat.fontSize ?? typography.body;
    scriptStyle = {
      lineHeight: Math.max(flat.lineHeight ?? 0, Math.ceil(fontSize * DEVANAGARI_LINE_HEIGHT)),
      letterSpacing: 0,
      textTransform: 'none',
    };
  }
  return (
    <Text {...props} style={[variantStyles[variant], { color }, style, scriptStyle]}>
      {children}
    </Text>
  );
}
