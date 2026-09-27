import { Children, isValidElement, type PropsWithChildren, type ReactNode } from 'react';
import { StyleSheet, Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, MAX_FONT_SCALE, typography } from '@/theme/tokens';
import { fontFamily, type FontWeightToken } from '@/theme/fonts';

type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'eyebrow';

/** Weight token per variant; the family is resolved from it, per script, at render time. */
const variantWeights: Record<TextVariant, FontWeightToken> = {
  display: 700,
  h1: 700,
  h2: 600,
  h3: 600,
  body: 400,
  small: 400,
  caption: 500,
  eyebrow: 700,
};

const variantStyles: Record<TextVariant, TextStyle> = {
  display: { fontSize: typography.display, lineHeight: 34, letterSpacing: -0.8 },
  h1: { fontSize: typography.h1, lineHeight: 28, letterSpacing: -0.4 },
  h2: { fontSize: typography.h2, lineHeight: 24, letterSpacing: -0.2 },
  h3: { fontSize: typography.h3, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontSize: typography.body, lineHeight: 22 },
  small: { fontSize: typography.small, lineHeight: 18 },
  caption: { fontSize: typography.caption, lineHeight: 16 },
  eyebrow: {
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.2,
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
  const devanagari = containsDevanagari(children);
  // The caller may override the weight via `style`; honour it when resolving the family.
  const flat = StyleSheet.flatten([variantStyles[variant], style]) ?? {};
  const weight = (Number(flat.fontWeight) || variantWeights[variant]) as FontWeightToken;
  const familyStyle: TextStyle = {
    fontFamily: fontFamily(weight, devanagari),
    // Custom families carry their own weight; leaving fontWeight set makes Android
    // synthesise a second, heavier stroke on top of an already-bold file.
    fontWeight: undefined,
  };

  let scriptStyle: TextStyle | undefined;
  if (devanagari) {
    const fontSize = flat.fontSize ?? typography.body;
    scriptStyle = {
      lineHeight: Math.max(flat.lineHeight ?? 0, Math.ceil(fontSize * DEVANAGARI_LINE_HEIGHT)),
      letterSpacing: 0,
      textTransform: 'none',
    };
  }
  return (
    <Text maxFontSizeMultiplier={MAX_FONT_SCALE} {...props} style={[variantStyles[variant], { color }, style, familyStyle, scriptStyle]}>
      {children}
    </Text>
  );
}
