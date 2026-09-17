import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { deployment } from '@/config/deployment';
import { buildHealthReport, reportToHtml, reportToText, type ReportTone } from '@/services/results/reportDocument';
import { useAppearanceStore } from '@/store/appearance.store';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

const tone: Record<ReportTone, { fg: string; bg: string }> = {
  good: { fg: colors.success, bg: colors.successSoft },
  watch: { fg: colors.caution, bg: colors.cautionSoft },
  alert: { fg: colors.elevated, bg: colors.elevatedSoft },
  neutral: { fg: colors.inkMuted, bg: colors.surfaceMuted },
};

export default function ShareScreen() {
  const { t, i18n } = useTranslation();
  const session = useAssessmentStore((state) => state.session);
  const appearanceUri = useAppearanceStore((state) => state.captureUri);
  const appearance = useAppearanceStore((state) => state.result);
  const [busy, setBusy] = useState<'pdf' | 'text'>();
  const [failed, setFailed] = useState(false);
  const report = useMemo(
    () => buildHealthReport(session, appearanceUri === session.scan.faceImageUri ? appearance : undefined, t, i18n.language),
    [appearance, appearanceUri, i18n.language, session, t],
  );

  if (!report) {
    return (
      <Screen scroll={false}>
        <AppHeader back />
        <ErrorState title={t('errors.title')} body={t('errors.body')} action={t('common.home')} onAction={() => router.replace('/')} />
      </Screen>
    );
  }

  const sharePdf = async () => {
    setBusy('pdf'); setFailed(false);
    try {
      const { uri } = await Print.printToFileAsync({ html: reportToHtml(report, deployment.brandName), width: 595, height: 842 });
      // A readable file name shows up in WhatsApp, Mail and Files.
      const stamp = new Date(session.startedAt).toISOString().slice(0, 10);
      const named = `${FileSystem.cacheDirectory}${deployment.brandName}-Health-Report-${stamp}.pdf`;
      await FileSystem.deleteAsync(named, { idempotent: true });
      await FileSystem.moveAsync({ from: uri, to: named });
      await Sharing.shareAsync(named, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('share.pdfButton') });
    } catch {
      setFailed(true);
    } finally {
      setBusy(undefined);
    }
  };

  const shareText = async () => {
    setBusy('text');
    try {
      await Share.share({ message: reportToText(report, deployment.brandName) });
    } finally {
      setBusy(undefined);
    }
  };

  const summaryTone = tone[report.summaryTone];

  return (
    <Screen
      footer={
        <View style={styles.actions}>
          <Button label={t('share.pdfButton')} onPress={() => void sharePdf()} icon="fileText" loading={busy === 'pdf'} disabled={busy !== undefined} />
          <Button label={t('share.textButton')} onPress={() => void shareText()} icon="share" variant="outline" loading={busy === 'text'} disabled={busy !== undefined} />
        </View>
      }
    >
      <AppHeader back title={t('share.title')} />
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>{t('share.eyebrow')}</AppText>
      <AppText variant="h1">{t('share.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>{t('share.description')}</AppText>

      <Card style={styles.paper}>
        <View style={styles.paperHeader}>
          <View style={styles.brand}>
            <View style={styles.brandMark}><View style={styles.brandDot} /></View>
            <AppText variant="h3">{deployment.brandName}</AppText>
          </View>
          <View style={styles.meta}>
            <AppText variant="caption" color={colors.inkMuted}>{report.generatedAt}</AppText>
            {report.person ? <AppText variant="caption" color={colors.inkMuted}>{report.person}</AppText> : null}
          </View>
        </View>
        <AppText variant="h2" style={styles.paperTitle}>{report.title}</AppText>
        <View style={[styles.summary, { backgroundColor: summaryTone.bg }]}>
          <AppText variant="small" color={summaryTone.fg}>{report.summary}</AppText>
        </View>

        {report.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <AppText variant="eyebrow" color={colors.primary}>{section.title}</AppText>
            {section.rows.map((row) => (
              <View key={`${section.title}-${row.label}`} style={styles.row}>
                <View style={styles.rowText}>
                  <AppText variant="small" style={styles.bold}>{row.label}</AppText>
                  {row.detail ? <AppText variant="caption" color={colors.inkMuted}>{row.detail}</AppText> : null}
                </View>
                <View style={styles.rowValue}>
                  {row.value ? <AppText variant="small" style={styles.value}>{row.value}</AppText> : null}
                  {row.status ? (
                    <View style={[styles.chip, { backgroundColor: tone[row.tone].bg }]}>
                      <AppText variant="caption" color={tone[row.tone].fg} style={styles.bold}>{row.status}</AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.nextSteps}>
          {report.nextSteps.map((step) => (
            <View key={step.label} style={styles.step}>
              <AppText variant="caption" color={colors.inkMuted}>{step.label}</AppText>
              <AppText variant="small" style={styles.bold}>{step.value}</AppText>
            </View>
          ))}
        </View>
        <AppText variant="caption" color={colors.inkMuted}>{report.footer}</AppText>
      </Card>
      {failed ? <AppText variant="small" color={colors.elevated} style={styles.description}>{t('share.pdfFailed')}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  paper: { marginTop: spacing.xl, marginBottom: spacing.lg, gap: spacing.md },
  paperHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.primary },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  brandMark: { width: 26, height: 26, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.white },
  meta: { alignItems: 'flex-end', flexShrink: 1 },
  paperTitle: { marginTop: spacing.xs },
  summary: { padding: spacing.md, borderRadius: radius.md },
  section: { gap: spacing.xs, marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowText: { flex: 1, gap: 2 },
  bold: { fontWeight: '700' },
  rowValue: { alignItems: 'flex-end', gap: 4, maxWidth: '45%' },
  value: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  chip: { paddingHorizontal: spacing.xs, paddingVertical: 2, borderRadius: radius.pill },
  nextSteps: { gap: spacing.sm, marginTop: spacing.sm },
  step: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: 2 },
  actions: { gap: spacing.xs },
});
