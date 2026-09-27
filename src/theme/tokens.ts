export const colors = {
  background: '#F4F8F7',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF3F1',
  ink: '#102A2E',
  inkMuted: '#577073',
  primary: '#087E72',
  primaryDark: '#075D57',
  primarySoft: '#D9F1EC',
  secondary: '#335CFF',
  border: '#D8E4E2',
  success: '#287A54',
  successSoft: '#E2F4E9',
  caution: '#9C6500',
  cautionSoft: '#FFF1D4',
  elevated: '#9D3F31',
  elevatedSoft: '#FCE7E3',
  urgent: '#B42318',
  urgentSoft: '#FEE4E2',
  black: '#041315',
  white: '#FFFFFF',
  overlay: 'rgba(1, 16, 18, 0.58)',
  cameraOverlay: 'rgba(1, 16, 18, 0.72)',
  transparent: 'transparent',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 56,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/**
 * A compact scale in line with iOS and Material defaults. Testers read the earlier, larger
 * scale as built for low vision; people who need bigger text get it from the system setting,
 * which AppText honours up to MAX_FONT_SCALE.
 */
export const typography = {
  display: 28,
  h1: 22,
  h2: 18,
  h3: 16,
  body: 15,
  small: 13,
  caption: 12,
} as const;

/** Upper bound on the system text-size multiplier, so the largest settings cannot break layouts. */
export const MAX_FONT_SCALE = 1.3;

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
} as const;

