import { router } from 'expo-router';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LifestyleFindings } from '@/components/result/LifestyleFindings';
import { FeatureProfileCard } from '@/components/scan/FeatureProfileCard';
import { CareRecommendation } from '@/components/result/CareRecommendation';
import { buildCareRouting, levelSummaryKey } from '@/services/care/routing';
import { showHealthAppPicker } from '@/services/results/healthApps';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { Screen } from '@/components/ui/Screen';
import { buildLifestyleProfile } from '@/services/lifestyle/lifestyleProfile';
import { METRIC_ORDER, metricStatus, rangeLabel, type RangeStatus } from '@/services/results/metricRanges';
import { useAppearanceStore } from '@/store/appearance.store';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';
import type { VitalMetric } from '@/types/vitals';

const levelTone = {
  no_specific_concern: { color: colors.success, background: colors.successSoft, icon: 'checkCircle' },
  follow_up_recommended: { color: colors.caution, background: colors.cautionSoft, icon: 'info' },
  prompt_medical_review: { color: colors.elevated, background: colors.elevatedSoft, icon: 'alertTriangle' },
} as const;

const statusTone: Record<RangeStatus, { color: string; background: string }> = {
  normal: { color: colors.success, background: colors.successSoft },
  low: { color: colors.caution, background: colors.cautionSoft },
  high: { color: colors.caution, background: colors.cautionSoft },
};

const hemoglobinTone = {
  low: { key: 'normal', color: colors.success, background: colors.successSoft },
  moderate: { key: 'borderline', color: colors.caution, background: colors.cautionSoft },
  elevated: { key: 'low', color: colors.elevated, background: colors.elevatedSoft },
} as const;

export default function ResultScreen() {
  const { t } = useTranslation();
  const session = useAssessmentStore((state) => state.session);
  const resetSession = useAssessmentStore((state) => state.resetSession);
  const appearanceUri = useAppearanceStore((state) => state.captureUri);
  const appearance = useAppearanceStore((state) => state.result);
  const [reveal] = useState(() => new Animated.Value(0));
  const report = session.finalAssessment;

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!active || reduce) { reveal.setValue(1); return; }
      Animated.spring(reveal, { toValue: 1, speed: 12, bounciness: 8, useNativeDriver: true }).start();
    });
    return () => { active = false; };
  }, [reveal]);

  if (!report) {
    return (
      <Screen scroll={false}>
        <AppHeader back />
        <ErrorState title={t('errors.title')} body={t('errors.body')} action={t('common.home')} onAction={() => router.replace('/')} />
      </Screen>
    );
  }

  const routing = buildCareRouting(session, appearanceUri === session.scan.faceImageUri ? appearance : undefined);
  const level = levelTone[routing.level === 'prompt' ? 'prompt_medical_review' : routing.level === 'follow_up' ? 'follow_up_recommended' : 'no_specific_concern'];
  const vitals = METRIC_ORDER
    .map((id) => session.scan.vitals?.metrics.find((metric) => metric.id === id && metric.value !== undefined))
    .filter((metric): metric is VitalMetric => Boolean(metric));
  const anemia = session.anemia;
  const hemoglobin = anemia.estimatedHemoglobinGdl !== undefined && anemia.signal && anemia.signal !== 'unavailable'
    ? hemoglobinTone[anemia.signal] : undefined;
  const faceResult = appearanceUri === session.scan.faceImageUri ? appearance : undefined;
  const faceChecks = faceResult?.status === 'complete' ? faceResult.checks ?? [] : [];
  const faceProfile = faceResult?.status === 'complete' ? faceResult.featureProfile ?? [] : [];
  const facePending = Boolean(session.scan.faceImageUri) && !faceResult;
  const lifestyle = buildLifestyleProfile(session.lifestyle);
  const home = () => { resetSession(); router.replace('/'); };
  const openHealthApps = () => showHealthAppPicker(t);

  return (
    <Screen>
      <AppHeader settings />
      <Animated.View style={[styles.completeIcon, { opacity: reveal, transform: [{ scale: reveal }] }]}>
        <AppIcon name="check" size={28} color={colors.white} strokeWidth={2.5} />
      </Animated.View>
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>{t('result.eyebrow')}</AppText>
      <AppText variant="h1">{t('result.title')}</AppText>

      <View style={[styles.levelBanner, { backgroundColor: level.background }]}>
        <AppIcon name={level.icon} size={22} color={level.color} />
        <AppText variant="small" color={colors.ink} style={styles.flex}>{t(levelSummaryKey[routing.level])}</AppText>
      </View>

      <CareRecommendation routing={routing} />

      <Section icon="heartPulse" title={t('result.sections.heart')}>
        {vitals.length ? (
          <View style={styles.grid}>
            {vitals.map((metric) => <MetricTile key={metric.id} metric={metric} />)}
          </View>
        ) : (
          <Card style={styles.emptyCard}>
            <AppText variant="small" color={colors.inkMuted}>{t('result.heartMissing')}</AppText>
            <Button label={t('result.scanAgain')} variant="outline" icon="scan" onPress={() => router.push('/scan/vitals')} />
          </Card>
        )}
      </Section>

      <Section icon="droplet" title={t('result.sections.blood')}>
        {hemoglobin && anemia.estimatedHemoglobinGdl !== undefined ? (
          <Card style={styles.bloodCard}>
            <View style={styles.bloodRow}>
              <View>
                <AppText variant="caption" color={colors.inkMuted}>{t('result.hemoglobin')}</AppText>
                <View style={styles.valueRow}>
                  <AppText style={styles.bigValue}>{anemia.estimatedHemoglobinGdl.toFixed(1)}</AppText>
                  <AppText variant="small" color={colors.inkMuted}>g/dL</AppText>
                </View>
              </View>
              <StatusChip label={t(`result.hemoglobinStatus.${hemoglobin.key}`)} color={hemoglobin.color} background={hemoglobin.background} />
            </View>
            {anemia.hemoglobinThresholdGdl !== undefined ? (
              <AppText variant="small" color={colors.inkMuted}>{t('result.hemoglobinReference', { value: anemia.hemoglobinThresholdGdl.toFixed(1) })}</AppText>
            ) : null}
            <AppText variant="small">{t(`result.hemoglobinAdvice.${hemoglobin.key}`)}</AppText>
          </Card>
        ) : (
          <Card style={styles.emptyCard}><AppText variant="small" color={colors.inkMuted}>{t('result.bloodMissing')}</AppText></Card>
        )}
      </Section>

      {faceChecks.length || facePending ? (
        <Section icon="sparkles" title={t('result.sections.face')}>
          {facePending ? <Card style={styles.emptyCard}><AppText variant="small" color={colors.inkMuted}>{t('vitals.faceProfile.loading')}</AppText></Card> : null}
          {faceChecks.length ? <Card style={styles.listCard}>
            {faceChecks.map((check, index) => (
              <View key={check.id} style={styles.checkBlock}>
                {index ? <View style={styles.divider} /> : null}
                <View style={styles.checkRow}>
                  <AppText variant="small" style={styles.flex}>{t(`appearance.modules.${check.id}`)}</AppText>
                  <StatusChip
                    label={t(`result.faceStatus.${check.status}`)}
                    color={check.status === 'noticed' ? colors.caution : check.status === 'not_flagged' ? colors.success : colors.inkMuted}
                    background={check.status === 'noticed' ? colors.cautionSoft : check.status === 'not_flagged' ? colors.successSoft : colors.surfaceMuted}
                  />
                </View>
                {check.status === 'noticed' ? <AppText variant="caption" color={colors.inkMuted}>{t(`appearance.detail.${check.reason}`)}</AppText> : null}
              </View>
            ))}
          </Card> : null}
          <FeatureProfileCard items={faceProfile} />
        </Section>
      ) : null}

      <Section icon="leaf" title={t('result.sections.lifestyle')}>
        <LifestyleFindings profile={lifestyle} compact />
      </Section>

      <Pressable accessibilityRole="button" onPress={openHealthApps} style={({ pressed }) => [styles.careCard, styles.appsCard, pressed && styles.pressed]}>
        <View style={styles.careIcon}><AppIcon name="activity" size={22} color={colors.primary} /></View>
        <View style={styles.flex}>
          <AppText variant="h3">{t('result.healthApps.title')}</AppText>
          <AppText variant="small" color={colors.inkMuted}>{t('result.healthApps.body')}</AppText>
        </View>
        <AppIcon name="chevronForward" size={22} color={colors.primary} />
      </Pressable>

      <View style={styles.actions}>
        <Button label={t('report.share')} onPress={() => router.push('/result/share')} icon="share" />
        <Button label={t('common.home')} onPress={home} variant="outline" />
      </View>
      <NoticeCard title={t('notice.title')} body={t('notice.medical')} />
    </Screen>
  );
}

function Section({ icon, title, children }: { icon: AppIconName; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppIcon name={icon} size={20} color={colors.primary} />
        <AppText variant="h3">{title}</AppText>
      </View>
      {children}
    </View>
  );
}

function MetricTile({ metric }: { metric: VitalMetric }) {
  const { t } = useTranslation();
  const status = metricStatus(metric);
  const tone = status ? statusTone[status] : undefined;
  const range = rangeLabel(metric.id);
  return (
    <View style={styles.tile}>
      <AppText variant="caption" color={colors.inkMuted} numberOfLines={1}>{t(`vitals.metric.${metric.id}`)}</AppText>
      <View style={styles.valueRow}>
        <AppText style={styles.tileValue}>{metric.value}</AppText>
        {metric.unit ? <AppText variant="caption" color={colors.inkMuted}>{metric.unit}</AppText> : null}
      </View>
      {tone && status ? <StatusChip label={t(`result.range.${status}`)} color={tone.color} background={tone.background} /> : null}
      {range ? <AppText variant="caption" color={colors.inkMuted}>{t('result.typicalRange', { range })}</AppText> : null}
      <AppText variant="caption" color={colors.ink} style={styles.explain}>{t(`result.metricInfo.${metric.id}`)}</AppText>
    </View>
  );
}

function StatusChip({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <AppText variant="caption" color={color} style={styles.chipLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  completeIcon: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  eyebrow: { marginTop: spacing.lg, marginBottom: spacing.xs },
  levelBanner: { marginTop: spacing.lg, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md, borderRadius: radius.lg },
  section: { marginTop: spacing.xxl, gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1, flexBasis: '46%', gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs },
  tileValue: { fontSize: 28, lineHeight: 36, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  bigValue: { fontSize: 36, lineHeight: 44, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontWeight: '700' },
  emptyCard: { gap: spacing.md },
  bloodCard: { gap: spacing.sm },
  bloodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  listCard: { gap: spacing.md },
  checkBlock: { gap: spacing.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  careCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  appsCard: { marginTop: spacing.sm, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  explain: { marginTop: spacing.xxs, lineHeight: 17 },
  careIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.86 },
  actions: { marginTop: spacing.xxl, marginBottom: spacing.md, gap: spacing.sm },
});
