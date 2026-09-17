import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { FeatureProfileItem } from '@/services/vision/featureProfile';
import { colors, radius, spacing } from '@/theme/tokens';

export function FeatureProfileCard({ items }: { items: FeatureProfileItem[] }) {
  const { t } = useTranslation();
  if (!items || items.length === 0) return null;

  return (
    <Card tone="soft" style={styles.container}>
      <View style={styles.header}>
        <AppText variant="eyebrow" color={colors.primary}>{t('vitals.faceProfile.title')}</AppText>
        <View style={styles.headerLine} />
      </View>
      <AppText variant="small" color={colors.inkMuted} style={styles.description}>
        {t('vitals.faceProfile.body')}
      </AppText>
      <View style={styles.list}>
        {items.map((item) => (
          <View
            accessible
            accessibilityLabel={`${t(`vitals.faceProfile.metric.${item.id}`, { defaultValue: item.label })}: ${t(`vitals.faceProfile.value.${item.valueText}`, { defaultValue: item.valueText })}, ${item.score} ${t('vitals.faceProfile.outOfTen')}`}
            key={item.id}
            style={styles.row}
          >
            <View style={styles.topRow}>
              <AppText variant="caption" style={styles.label}>{t(`vitals.faceProfile.metric.${item.id}`, { defaultValue: item.label })}</AppText>
              <AppText variant="small" style={styles.valueText}>{t(`vitals.faceProfile.value.${item.valueText}`, { defaultValue: item.valueText })}</AppText>
              <View style={styles.scoreContainer} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <AppText variant="h3">{item.score}</AppText>
                <AppText variant="caption" color={colors.inkMuted}>/10</AppText>
              </View>
            </View>
            <View style={styles.barBackground} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={[styles.barFill, { width: `${(item.score / 10) * 100}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.primary,
  },
  description: { marginTop: spacing.sm },
  list: { gap: spacing.lg, marginTop: spacing.xl },
  row: {
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    flex: 1,
  },
  valueText: {
    flex: 1,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    minWidth: 48,
    justifyContent: 'flex-end',
  },
  barBackground: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  }
});
