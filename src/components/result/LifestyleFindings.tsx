import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import type { LifestyleFinding, LifestyleProfile } from '@/types/lifestyle';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * Renders the Phase 0 lifestyle profile.
 *
 * Every row is a self-reported value compared with a published reference range,
 * shown with its source. Nothing here is a diagnosis, and nothing is inferred
 * from the photograph.
 */
export function LifestyleFindings({
  profile,
  compact = false,
}: {
  profile: LifestyleProfile;
  compact?: boolean;
}) {
  const { t } = useTranslation();

  if (profile.findings.length === 0) {
    return (
      <Card tone="soft" style={styles.card}>
        <AppText variant="small" color={colors.inkMuted}>
          {t('lifestyle.empty')}
        </AppText>
      </Card>
    );
  }

  const attention = profile.findings.filter((finding) => finding.status === 'attention');

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <AppText variant="h3">{t('lifestyle.sectionTitle')}</AppText>
        <AppText variant="caption" color={colors.inkMuted}>
          {t('lifestyle.answeredOf', {
            answered: profile.answeredCount,
            total: profile.totalCount,
          })}
        </AppText>
      </View>
      <AppText variant="small" color={colors.inkMuted}>
        {attention.length > 0
          ? t('lifestyle.summaryAttention', { count: attention.length })
          : t('lifestyle.summaryAllOk')}
      </AppText>

      {profile.findings.map((finding) => (
        <FindingRow key={finding.id} finding={finding} compact={compact} />
      ))}

      <AppText variant="caption" color={colors.inkMuted} style={styles.disclaimer}>
        {t('lifestyle.disclaimer')}
      </AppText>
    </Card>
  );
}

function FindingRow({ finding, compact }: { finding: LifestyleFinding; compact: boolean }) {
  const { t } = useTranslation();
  const attention = finding.status === 'attention';

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, attention ? styles.iconAttention : styles.iconOk]}>
        <AppIcon
          name={attention ? 'alertTriangle' : 'checkCircle'}
          size={16}
          color={attention ? colors.caution : colors.success}
        />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowHeader}>
          <AppText variant="small" style={styles.rowTitle}>
            {t(finding.titleKey)}
          </AppText>
          {finding.value ? (
            <AppText variant="small" style={styles.rowValue}>
              {finding.value}
            </AppText>
          ) : null}
        </View>
        {finding.valueKey ? (
          <AppText variant="caption" color={attention ? colors.caution : colors.success}>
            {t(finding.valueKey)}
          </AppText>
        ) : null}
        {!compact ? (
          <>
            <AppText variant="small" color={colors.inkMuted} style={styles.guidance}>
              {t(finding.guidanceKey)}
            </AppText>
            <AppText variant="caption" color={colors.inkMuted}>
              {t(finding.sourceKey)}
            </AppText>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  iconWrap: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  iconOk: { backgroundColor: colors.successSoft },
  iconAttention: { backgroundColor: colors.cautionSoft },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { fontWeight: '700' },
  rowValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  guidance: { marginTop: spacing.xxs },
  disclaimer: { marginTop: spacing.xs },
});
