export type RegionBrightness = { leftUnder: number; rightUnder: number; leftCheek: number; rightCheek: number };
/** Engineering-only contrast thresholds, not clinical cut-offs. No skin-tone classification. */
export function compareUnderEyeBrightness(r: RegionBrightness): 'lighting' | 'under_eye_contrast' | 'no_clear_contrast' {
  const values = Object.values(r);
  if (values.some(v => !Number.isFinite(v) || v < 25 || v > 235)) return 'lighting';
  if (Math.abs(r.leftCheek - r.rightCheek) / Math.max(r.leftCheek, r.rightCheek) > 0.20) return 'lighting';
  // Bilateral relative contrast is less sensitive to global exposure than absolute darkness.
  const leftContrast = (r.leftCheek - r.leftUnder) / r.leftCheek;
  const rightContrast = (r.rightCheek - r.rightUnder) / r.rightCheek;
  return leftContrast > 0.16 && rightContrast > 0.16 ? 'under_eye_contrast' : 'no_clear_contrast';
}
