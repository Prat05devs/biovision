import type { TFunction } from 'i18next';

import { buildCareRouting, levelSummaryKey } from '@/services/care/routing';
import { buildLifestyleProfile } from '@/services/lifestyle/lifestyleProfile';
import type { AppearanceResult } from '@/services/vision/appearance.types';
import type { AssessmentSession } from '@/types/assessment';
import type { VitalMetric } from '@/types/vitals';

import { METRIC_ORDER, metricStatus, rangeLabel } from './metricRanges';

export type ReportTone = 'good' | 'watch' | 'alert' | 'neutral';

export type ReportRow = {
  label: string;
  value: string;
  status?: string;
  tone: ReportTone;
  detail?: string;
};

export type ReportSection = { title: string; rows: ReportRow[] };

export type HealthReportDocument = {
  title: string;
  generatedAt: string;
  person: string;
  summary: string;
  summaryTone: ReportTone;
  sections: ReportSection[];
  nextSteps: { label: string; value: string }[];
  footer: string;
};

const levelTone = { no_specific_concern: 'good', follow_up_recommended: 'watch', prompt_medical_review: 'alert' } as const;

/** One structured report used for the on-screen preview, the PDF and the plain-text share. */
export function buildHealthReport(
  session: AssessmentSession,
  appearance: AppearanceResult | undefined,
  t: TFunction,
  locale: string,
): HealthReportDocument | undefined {
  const report = session.finalAssessment;
  if (!report) return undefined;
  const sections: ReportSection[] = [];
  const routing = buildCareRouting(session, appearance);

  const metrics = METRIC_ORDER
    .map((id) => session.scan.vitals?.metrics.find((metric) => metric.id === id && metric.value !== undefined))
    .filter((metric): metric is VitalMetric => Boolean(metric));
  if (metrics.length) {
    sections.push({
      title: t('result.sections.heart'),
      rows: metrics.map((metric) => {
        const status = metricStatus(metric);
        const range = rangeLabel(metric.id);
        return {
          label: t(`vitals.metric.${metric.id}`),
          value: `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`,
          status: status ? t(`result.range.${status}`) : undefined,
          tone: status === 'normal' ? 'good' : status ? 'watch' : 'neutral',
          detail: [range ? t('result.typicalRange', { range }) : undefined, t(`result.metricInfo.${metric.id}`)].filter(Boolean).join(' · '),
        };
      }),
    });
  }

  const { estimatedHemoglobinGdl: hemoglobin, signal, hemoglobinThresholdGdl } = session.anemia;
  if (hemoglobin !== undefined && signal && signal !== 'unavailable') {
    const key = signal === 'low' ? 'normal' : signal === 'moderate' ? 'borderline' : 'low';
    sections.push({
      title: t('result.sections.blood'),
      rows: [{
        label: t('result.hemoglobin'),
        value: `${hemoglobin.toFixed(1)} g/dL`,
        status: t(`result.hemoglobinStatus.${key}`),
        tone: key === 'normal' ? 'good' : key === 'borderline' ? 'watch' : 'alert',
        detail: [
          hemoglobinThresholdGdl !== undefined ? t('result.hemoglobinReference', { value: hemoglobinThresholdGdl.toFixed(1) }) : undefined,
          t(`result.hemoglobinAdvice.${key}`),
        ].filter(Boolean).join(' '),
      }],
    });
  }

  if (appearance?.status === 'complete') {
    const rows: ReportRow[] = (appearance.checks ?? []).map((check) => ({
      label: t(`appearance.modules.${check.id}`),
      value: '',
      status: t(`result.faceStatus.${check.status}`),
      tone: check.status === 'noticed' ? 'watch' : check.status === 'not_flagged' ? 'good' : 'neutral',
      detail: check.status === 'noticed' ? t(`appearance.detail.${check.reason}`) : undefined,
    }));
    for (const item of appearance.featureProfile ?? []) {
      rows.push({
        label: t(`vitals.faceProfile.metric.${item.id}`, { defaultValue: item.label }),
        value: `${item.score}/10`,
        status: t(`vitals.faceProfile.value.${item.valueText}`, { defaultValue: item.valueText }),
        tone: 'neutral',
      });
    }
    if (rows.length) sections.push({ title: t('result.sections.face'), rows });
  }

  const lifestyle = buildLifestyleProfile(session.lifestyle);
  if (lifestyle.findings.length) {
    sections.push({
      title: t('result.sections.lifestyle'),
      rows: lifestyle.findings.map((finding) => ({
        label: t(finding.titleKey),
        value: finding.value ?? '',
        status: finding.valueKey ? t(finding.valueKey) : undefined,
        tone: finding.status === 'attention' ? 'watch' : finding.status === 'ok' ? 'good' : 'neutral',
      })),
    });
  }

  const profile = session.profile;
  const person = profile
    ? [
        t('share.age', { age: profile.ageYears }),
        t(`profile.${profile.sex}`),
        ...(profile.pregnant ? [t('share.pregnant')] : []),
      ].join(' · ')
    : '';

  return {
    title: t('result.title'),
    generatedAt: new Date(session.startedAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    person,
    summary: `${t(levelSummaryKey[routing.level])} ${routing.reasons.map((reason) => t(`care.reasons.${reason.key}`, reason.values)).join(' ')}`.trim(),
    summaryTone: levelTone[routing.level === 'prompt' ? 'prompt_medical_review' : routing.level === 'follow_up' ? 'follow_up_recommended' : 'no_specific_concern'],
    sections,
    nextSteps: [
      { label: t('result.care.recommended'), value: `${t(`specialties.${routing.primary}`)} · ${t(`result.care.timing.${routing.level}`)}` },
      ...(routing.also ? [{ label: t('result.care.alsoLabel'), value: t(`specialties.${routing.also}`) }] : []),
      ...(routing.tests.length ? [{ label: t('result.care.tests'), value: routing.tests.map((test) => t(`care.tests.${test}`)).join(', ') }] : []),
    ],
    footer: t('share.pdfFooter'),
  };
}

const toneColor: Record<ReportTone, { fg: string; bg: string }> = {
  good: { fg: '#287A54', bg: '#E2F4E9' },
  watch: { fg: '#9C6500', bg: '#FFF1D4' },
  alert: { fg: '#9D3F31', bg: '#FCE7E3' },
  neutral: { fg: '#577073', bg: '#EAF3F1' },
};

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A4 print-ready HTML for expo-print. */
export function reportToHtml(document: HealthReportDocument, brandName: string): string {
  const chip = (text: string | undefined, tone: ReportTone) => text
    ? `<span class="chip" style="color:${toneColor[tone].fg};background:${toneColor[tone].bg}"><i style="background:${toneColor[tone].fg}"></i>${escape(text)}</span>`
    : '';
  const sections = document.sections.map((section) => `
    <section>
      <h2>${escape(section.title)}</h2>
      <table>
        ${section.rows.map((row) => `
          <tr>
            <td class="label">${escape(row.label)}${row.detail ? `<div class="detail">${escape(row.detail)}</div>` : ''}</td>
            <td class="value">${escape(row.value)}</td>
            <td class="status">${chip(row.status, row.tone)}</td>
          </tr>`).join('')}
      </table>
    </section>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8" />
  <style>
    @page { margin: 28px 32px; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', 'Noto Sans Devanagari', Arial, sans-serif; color: #102A2E; margin: 0; font-size: 12px; }
    header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 14px; border-bottom: 2px solid #087E72; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo { width: 30px; height: 30px; border-radius: 9px; background: #087E72; display: flex; align-items: center; justify-content: center; }
    .logo span { width: 12px; height: 12px; border-radius: 6px; background: #fff; display: block; }
    .brand b { font-size: 18px; letter-spacing: -0.3px; }
    .meta { text-align: right; color: #577073; line-height: 1.5; }
    h1 { font-size: 24px; margin: 20px 0 6px; letter-spacing: -0.5px; }
    .summary { margin: 12px 0 6px; padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 1.45; }
    section { margin-top: 20px; page-break-inside: avoid; }
    h2 { font-size: 14px; margin: 0 0 8px; color: #087E72; text-transform: uppercase; letter-spacing: 0.8px; }
    table { width: 100%; border-collapse: collapse; }
    tr { border-top: 1px solid #D8E4E2; }
    td { padding: 9px 4px; vertical-align: top; }
    .label { font-weight: 600; width: 55%; }
    .detail { font-weight: 400; color: #577073; margin-top: 3px; line-height: 1.4; font-size: 10.5px; }
    .value { font-weight: 700; font-size: 14px; white-space: nowrap; width: 18%; }
    .status { text-align: right; width: 27%; }
    .chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; font-weight: 700; font-size: 10.5px; white-space: nowrap; }
    .chip i { width: 6px; height: 6px; border-radius: 3px; display: inline-block; }
    .next { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 12px; page-break-inside: avoid; }
    .next div { flex: 1 1 30%; border: 1px solid #D8E4E2; border-radius: 12px; padding: 12px 14px; }
    .next small { color: #577073; display: block; margin-bottom: 4px; }
    .next b { font-size: 14px; }
    footer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #D8E4E2; color: #577073; font-size: 10px; line-height: 1.5; }
  </style></head><body>
    <header>
      <div class="brand"><div class="logo"><span></span></div><b>${escape(brandName)}</b></div>
      <div class="meta">${escape(document.generatedAt)}${document.person ? `<br/>${escape(document.person)}` : ''}</div>
    </header>
    <h1>${escape(document.title)}</h1>
    <div class="summary" style="color:${toneColor[document.summaryTone].fg};background:${toneColor[document.summaryTone].bg}">${escape(document.summary)}</div>
    ${sections}
    <div class="next">${document.nextSteps.map((step) => `<div><small>${escape(step.label)}</small><b>${escape(step.value)}</b></div>`).join('')}</div>
    <footer>${escape(document.footer)}</footer>
  </body></html>`;
}

/** Plain-text version for messaging apps. */
export function reportToText(document: HealthReportDocument, brandName: string): string {
  const lines = [`${brandName} · ${document.title}`, document.generatedAt, document.person, '', document.summary];
  for (const section of document.sections) {
    lines.push('', section.title.toUpperCase());
    for (const row of section.rows) {
      lines.push(`• ${row.label}: ${[row.value, row.status].filter(Boolean).join(' — ')}`);
    }
  }
  lines.push('', ...document.nextSteps.map((step) => `${step.label}: ${step.value}`));
  return lines.filter((line, index) => line !== '' || lines[index - 1] !== '').join('\n');
}
