import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/theme/tokens';
import type { WellbeingScaleResult } from '@/types/wellbeing';

const levelColors: Record<WellbeingScaleResult['level'], string> = {
  monitor: colors.primary,
  support_recommended: colors.caution,
  prompt_review: colors.caution,
  urgent: colors.urgent,
};

/**
 * One instrument's total, shown with its maximum and its published severity
 * band. The score is deliberately paired with the band label so a bare number
 * is never presented as a result on its own.
 */
export function ScaleResultCard({ scale }: { scale: WellbeingScaleResult }) {
  const { t } = useTranslation();
  const accent = levelColors[scale.level];
  const filled = Math.max(0, Math.min(1, scale.score / scale.maximumScore));

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="h3" style={styles.name}>
          {t(scale.labelKey)}
        </AppText>
        <AppText variant="small" color={colors.inkMuted}>
          {t('wellbeing.scoreOf', { score: scale.score, maximum: scale.maximumScore })}
        </AppText>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: scale.maximumScore, now: scale.score }}
      >
        <View style={[styles.fill, { width: `${filled * 100}%`, backgroundColor: accent }]} />
      </View>
      <AppText variant="small" color={accent} style={styles.band}>
        {t(scale.bandLabelKey)}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
  name: { flexShrink: 1 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  band: { fontWeight: '700' },
});
