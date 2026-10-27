import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TERMS_VERSION, usePreferencesStore } from '@/store/preferences.store';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing, shadows } from '@/theme/redesign';
import { useResponsiveLayout } from '@/theme/responsive';

const measures: { icon: AppIconName; key: string }[] = [
  { icon: 'heartPulse', key: 'heart' }, { icon: 'gauge', key: 'stress' },
  { icon: 'wind', key: 'breathing' }, { icon: 'droplet', key: 'blood' },
  { icon: 'scan', key: 'face' }, { icon: 'leaf', key: 'lifestyle' },
];
const steps: { icon: AppIconName; key: string }[] = [
  { icon: 'list', key: 'profile' }, { icon: 'scan', key: 'face' },
  { icon: 'eye', key: 'eyes' }, { icon: 'messages', key: 'questions' },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const hydrated = usePreferencesStore(state => state.hydrated);
  const acceptedTerms = usePreferencesStore(state => state.acceptedTermsVersion === TERMS_VERSION);
  const resetSession = useAssessmentStore(state => state.resetSession);
  const [selected, setSelected] = useState('heart');
  const { compact } = useResponsiveLayout();
  if (!hydrated) return <View style={styles.loading} />;
  if (!acceptedTerms) return <Redirect href="/welcome" />;
  return (
    <Screen hero>
      <AppHeader settings language />
      <AppText variant="display" color={colors.white} style={styles.headline}>{t('home.title')}</AppText>
      <View style={styles.scanStack}>
        <View style={styles.stackBack} />
        <LinearGradient colors={['#2F7891', '#2A6C83']} style={styles.scanCard}>
          <AppText variant="eyebrow" color="#E8F3F8">{t('redesign.scanEyebrow')}</AppText>
          <AppText variant="h2" color={colors.white}>{t('redesign.scanSummary')}</AppText>
          <View style={styles.steps}>
            {steps.map(step => <View key={step.key} style={styles.step}>
              <AppIcon name={step.icon} color={colors.white} size={20} strokeWidth={1.6} />
              <AppText variant="caption" color={colors.white} style={styles.stepLabel}>{t(`redesign.steps.${step.key}`)}</AppText>
            </View>)}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('home.startScan')}
            onPress={() => { resetSession(); router.push('/scan'); }} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
            <AppText style={styles.startLabel}>{t('home.startScan')}</AppText>
            <View style={styles.arrow}><AppIcon name="arrowForward" color={colors.white} size={22} /></View>
          </Pressable>
        </LinearGradient>
      </View>
      <AppText variant="h2" style={styles.sectionTitle}>{t('home.checksTitle')}</AppText>
      <View style={styles.grid}>
        {measures.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: selected === item.key }}
          accessibilityLabel={t(`home.measures.${item.key}.title`)} onPress={() => setSelected(item.key)}
          style={({ pressed }) => [styles.tile, compact && styles.singleTile, selected === item.key && styles.selectedTile, pressed && styles.pressed]}>
          <View style={styles.tileIcon}><AppIcon name={item.icon} color={colors.primary} size={21} strokeWidth={1.6} /></View>
          <AppText color={selected === item.key ? colors.white : colors.ink} style={styles.tileLabel}>{t(`home.measures.${item.key}.title`)}</AppText>
        </Pressable>)}
      </View>
      <Card style={styles.explanation}>
        <View style={styles.dot} />
        <AppText variant="small" color={colors.inkMuted} accessibilityLiveRegion="polite" style={styles.flex}>{t(`home.measures.${selected}.body`)}</AppText>
      </Card>
      <AppText variant="h2" style={styles.sectionTitle}>{t('home.supportTitle')}</AppText>
      <View style={styles.support}>
        <SupportRow icon="message" title={t('home.wellbeing')} body={t('home.wellbeingBody')} onPress={() => router.push('/wellbeing')} />
        <SupportRow icon="stethoscope" title={t('home.care')} body={t('home.careBody')} onPress={() => router.push('/care')} />
      </View>
      <Button label={t('home.withoutCamera')} variant="ghost" style={styles.withoutCamera}
        onPress={() => { resetSession(); router.push({ pathname: '/scan/profile', params: { mode: 'questions' } }); }} />
      <AppText variant="caption" color={colors.inkMuted} style={styles.notice}>{t('redesign.homeNotice')}</AppText>
    </Screen>
  );
}
function SupportRow({ icon, title, body, onPress }: { icon: AppIconName; title: string; body: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    style={({ pressed }) => [styles.supportRow, pressed && styles.pressed]}>
    <View style={styles.supportIcon}><AppIcon name={icon} size={21} color={colors.primary} strokeWidth={1.6} /></View>
    <View style={styles.flex}><AppText style={{ fontWeight: '600' }}>{title}</AppText><AppText variant="small" color={colors.inkMuted}>{body}</AppText></View>
    <View style={styles.smallArrow}><AppIcon name="arrowForward" size={18} color={colors.white} /></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  headline: { marginTop: 22, maxWidth: 340 },
  scanStack: { marginTop: 30 },
  stackBack: { position: 'absolute', left: 18, right: 18, top: -10, height: 40, borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.34)', backgroundColor: 'rgba(255,255,255,0.16)' },
  scanCard: { borderRadius: radius.xl, padding: spacing.lg, gap: 14, ...shadows.card },
  steps: { flexDirection: 'row', gap: 8 },
  step: { flex: 1, alignItems: 'center', gap: 7, paddingVertical: 12, paddingHorizontal: 3, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.12)' },
  stepLabel: { textAlign: 'center' },
  startButton: { minHeight: 58, borderRadius: 999, backgroundColor: colors.white, paddingLeft: 22, paddingRight: 7, paddingVertical: 7, gap: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startLabel: { fontWeight: '600', flex: 1 },
  arrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { marginTop: 30, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexBasis: '46%', flexGrow: 1, minHeight: 124, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'space-between', gap: 8, ...shadows.card },
  selectedTile: { backgroundColor: colors.primary, borderColor: colors.primary },
  tileIcon: { alignSelf: 'flex-end', width: 42, height: 42, borderRadius: 21, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontWeight: '500', flexShrink: 1 },
  singleTile: { flexBasis: '100%', minHeight: 92, flexDirection: 'row-reverse', alignItems: 'center' },
  explanation: { marginTop: 12, flexDirection: 'row', gap: 12, borderRadius: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  support: { gap: 12 },
  supportRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 24, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  supportIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  smallArrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  withoutCamera: { marginTop: 12 },
  notice: { textAlign: 'center', marginHorizontal: 4 }, pressed: { opacity: 0.75 },
});
