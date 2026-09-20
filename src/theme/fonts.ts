/**
 * Typography families. The app ships its own fonts so iOS and Android render identically —
 * without them, iOS falls back to SF Pro and Android to Roboto, which have different widths and
 * make the tuned letter-spacing in AppText look wrong on one platform or the other.
 *
 * Latin: Inter. Devanagari: Noto Sans Devanagari (Inter has no Devanagari coverage).
 */
export const fontFamilies = {
  latin: {
    400: 'Inter_400Regular',
    500: 'Inter_500Medium',
    600: 'Inter_600SemiBold',
    700: 'Inter_700Bold',
    800: 'Inter_800ExtraBold',
  },
  devanagari: {
    // Noto Sans Devanagari ships no ExtraBold; 800 maps to Bold, the heaviest available.
    400: 'NotoSansDevanagari_400Regular',
    500: 'NotoSansDevanagari_500Medium',
    600: 'NotoSansDevanagari_600SemiBold',
    700: 'NotoSansDevanagari_700Bold',
    800: 'NotoSansDevanagari_700Bold',
  },
} as const;

export type FontWeightToken = keyof typeof fontFamilies.latin;

/**
 * The family for a weight and script. Android has no synthetic bolding for custom fonts, so the
 * family — not `fontWeight` — is what actually changes the weight on screen.
 */
export function fontFamily(weight: FontWeightToken = 400, devanagari = false): string {
  return devanagari ? fontFamilies.devanagari[weight] : fontFamilies.latin[weight];
}
