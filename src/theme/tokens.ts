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
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
} as const;

export const typography = {
  display: 34,
  h1: 28,
  h2: 22,
  h3: 18,
  body: 16,
  small: 14,
  caption: 12,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
} as const;

