import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui/AppText';
import type { AppearanceCheck } from '@/services/vision/appearanceModules';
import { colors, radius, spacing } from '@/theme/tokens';

/** Image and overlay share the uncropped image aspect ratio and normalized coordinates.
 * We show sampled areas, not segmentation masks or lesion boundaries. */
export function AppearancePhoto({ uri, width, height, checks }: {
  uri: string; width: number; height: number; checks: AppearanceCheck[];
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AppearanceCheck['id'] | 'none'>('none');
  const check = checks.find(item => item.id === selected);
  const available = checks.filter(item => item.regions?.length);
  return <View style={styles.container}>
    <View style={[styles.photo, { aspectRatio: width > 0 && height > 0 ? width / height : 4 / 3 }]}>
      <Image source={{ uri }} resizeMode="contain" style={StyleSheet.absoluteFill} accessibilityLabel={t('observations.captureAlt')} />
      {check?.regions ? <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
        <Svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          {check.regions.map((region, index) => <Ellipse key={index} cx={region.x * 1000} cy={region.y * 1000} rx={region.rx * 1000} ry={region.ry * 1000} stroke={colors.white} strokeWidth={3} fill="rgba(8,126,114,0.3)" />)}
        </Svg>
      </View> : null}
    </View>
    {available.length ? <>
      <AppText variant="small" color={colors.inkMuted}>{t('appearance.showRegions')}</AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
        {(['none', ...available.map(item => item.id)] as const).map(id => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: selected === id }} onPress={() => setSelected(id)} style={[styles.option, selected === id && styles.selected]}>
          <AppText variant="small" color={selected === id ? colors.white : colors.ink}>{t(id === 'none' ? 'appearance.original' : `appearance.modules.${id}`)}</AppText>
        </Pressable>)}
      </ScrollView>
      <AppText variant="caption" color={colors.inkMuted} accessibilityLiveRegion="polite">{t('appearance.regionLegend')}</AppText>
    </> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginTop: spacing.xl, gap: spacing.sm },
  photo: { width: '100%', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface },
  options: { gap: spacing.xs },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
