import { Platform } from 'react-native';

import { colors as originalColors } from './tokens';

// The original tokens remain frozen for the camera/mesh screen.
export { spacing, layout, typography, MAX_FONT_SCALE } from './tokens';

export const colors = {
  ...originalColors,
  background: '#E5EBF0',
  surface: 'rgba(255,255,255,0.72)',
  surfaceMuted: '#E9EEEA',
  ink: '#0D0D0D',
  inkMuted: '#4D5B63',
  primary: '#2F7891',
  primaryDark: '#2B6B83',
  primarySoft: '#E9EEEA',
  secondary: '#39839F',
  border: 'rgba(255,255,255,0.85)',
  success: '#1E6B48',
  caution: '#7A4F00',
  elevated: '#A01F15',
  urgent: '#A01F15',
} as const;

export const radius = { sm: 14, md: 20, lg: 24, xl: 28, pill: 999 } as const;
export const shadows = {
  // Android elevation composites poorly with translucent rounded surfaces: the
  // shadow can show through as an inset rectangle. Draw outside the border box
  // instead; retain the existing native shadow on iOS and web.
  card: Platform.OS === 'android' ? {
    boxShadow: '0px 2px 4px rgba(31,74,92,0.12)',
  } : {
    shadowColor: '#1F4A5C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2,
  },
} as const;
