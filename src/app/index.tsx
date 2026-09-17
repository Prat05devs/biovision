import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeatureRow } from '@/components/ui/FeatureRow';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { Screen } from '@/components/ui/Screen';
import { useHealthStore } from '@/store/health.store';
import { TERMS_VERSION, usePreferencesStore } from '@/store/preferences.store';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';

const measures: { icon: AppIconName; key: string }[] = [
  { icon: 'heartPulse', key: 'heart' },
  { icon: 'gauge', key: 'stress' },
  { icon: 'wind', key: 'breathing' },
  { icon: 'droplet', key: 'blood' },
  { icon: 'sparkles', key: 'face' },
  { icon: 'leaf', key: 'lifestyle' },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const hydrated = usePreferencesStore((state) => state.hydrated);
  const acceptedTerms = usePreferencesStore((state) => state.acceptedTermsVersion === TERMS_VERSION);
  const resetSession = useAssessmentStore((state) => state.resetSession);
  const [drift] = useState(() => new Animated.Value(0));
  const [radar] = useState(() => new Animated.Value(0));

  useEffect(() => {
    let mounted = true;
    let driftMotion: Animated.CompositeAnimation | undefined;
    let radarMotion: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduce => {
      if (!mounted || reduce) return;
      driftMotion = Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 3800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      radarMotion = Animated.loop(Animated.timing(radar, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
      driftMotion.start(); radarMotion.start();
    });
    return () => { mounted = false; driftMotion?.stop(); radarMotion?.stop(); };
  }, [drift, radar]);

  const startScan = () => {
    resetSession();
    useHealthStore.getState().reset();
    router.push('/scan');
  };

  if (!hydrated) return <View style={styles.loading} />;
  if (!acceptedTerms) return <Redirect href="/welcome" />;

  return (
    <Screen>
      <AppHeader settings />
      <LinearGradient colors={['#0A756C', '#07544F']} style={styles.hero}>
        <Animated.View style={[styles.heroOrbLarge, { transform: [
          { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -13] }) },
          { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 16] }) },
          { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] }) },
        ] }]} />
        <Animated.View style={[styles.heroOrbSmall, { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -11] }) }] }]} />
        <View style={styles.liveMark} pointerEvents="none">
          <Animated.View style={[styles.radarRing, { opacity: radar.interpolate({ inputRange: [0, .72, 1], outputRange: [.5, .14, 0] }), transform: [{ scale: radar.interpolate({ inputRange: [0, 1], outputRange: [.72, 1.58] }) }] }]} />
          <View style={styles.radarCore}><AppIcon name="scan" color="#E7FFFA" size={20} /></View>
        </View>
        <AppText variant="eyebrow" color="#BCEDE4">
          {t('home.eyebrow')}
        </AppText>
        <AppText variant="display" color={colors.white} style={styles.heroTitle}>
          {t('home.title')}
        </AppText>
        <AppText color="#DDF5F0" style={styles.heroBody}>
          {t('home.description')}
        </AppText>
        <Button
          label={t('home.startScan')}
          onPress={startScan}
          variant="outline"
          icon="scan"
          style={styles.heroButton}
        />
        <View style={styles.timeRow}>
          <AppIcon name="clock" color="#BCEDE4" size={16} />
          <AppText variant="caption" color="#BCEDE4">
            {t('home.time')}
          </AppText>
        </View>
      </LinearGradient>

      <Button label={t('home.withoutCamera')} variant="ghost" style={{ marginTop: spacing.sm }} onPress={() => { resetSession(); router.push('/health-check'); }} />
      <AppText variant="h2" style={styles.sectionTitle}>
        {t('home.checksTitle')}
      </AppText>
      <Card style={styles.stackCard}>
        {measures.map(({ icon, key }, index) => (
          <View key={key} style={styles.measureBlock}>
            {index ? <View style={styles.divider} /> : null}
            <FeatureRow icon={icon} title={t(`home.measures.${key}.title`)} description={t(`home.measures.${key}.body`)} />
          </View>
        ))}
      </Card>

      <AppText variant="h2" style={styles.sectionTitle}>
        {t('home.supportTitle')}
      </AppText>
      <View style={styles.supportGrid}>
        <Card tone="soft" style={styles.supportCard}>
          <AppIcon name="heart" size={27} color={colors.primary} />
          <AppText variant="h3" style={styles.supportTitle}>
            {t('home.wellbeing')}
          </AppText>
          <AppText variant="small" color={colors.inkMuted} style={styles.supportBody}>
            {t('home.wellbeingBody')}
          </AppText>
          <Button
            label={t('navigation.wellbeing')}
            onPress={() => router.push('/wellbeing')}
            variant="ghost"
            icon="arrowForward"
            iconPosition="right"
            style={styles.cardButton}
          />
        </Card>
        <Card style={styles.supportCard}>
          <AppIcon name="mapPin" size={27} color={colors.primary} />
          <AppText variant="h3" style={styles.supportTitle}>
            {t('home.care')}
          </AppText>
          <AppText variant="small" color={colors.inkMuted} style={styles.supportBody}>
            {t('home.careBody')}
          </AppText>
          <Button
            label={t('navigation.care')}
            onPress={() => router.push('/care')}
            variant="ghost"
            icon="arrowForward"
            iconPosition="right"
            style={styles.cardButton}
          />
        </Card>
      </View>

      <NoticeCard title={t('notice.title')} body={t('notice.medical')} />
      <AppText variant="caption" color={colors.inkMuted} style={styles.platform}>
        {t('brand.platform')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background },
  hero: {
    minHeight: 410,
    borderRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: spacing.xxxl,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 260,
    height: 260,
    right: -100,
    top: -85,
    borderRadius: 130,
    borderWidth: 38,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 130,
    height: 130,
    left: -55,
    bottom: -58,
    borderRadius: 65,
    borderWidth: 22,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  liveMark: { position: 'absolute', right: spacing.xl, top: spacing.xl, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  radarRing: { position: 'absolute', width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: 'rgba(213,255,248,0.72)' },
  radarCore: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { marginTop: spacing.md, maxWidth: 320 },
  heroBody: { marginTop: spacing.md, maxWidth: 330 },
  heroButton: { marginTop: spacing.xl, backgroundColor: colors.white },
  measureBlock: { gap: spacing.lg },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  sectionTitle: { marginTop: spacing.xxxl, marginBottom: spacing.md },
  stackCard: { gap: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  supportGrid: { gap: spacing.md },
  supportCard: { minHeight: 210 },
  supportTitle: { marginTop: spacing.md },
  supportBody: { marginTop: spacing.xs },
  cardButton: { alignSelf: 'flex-start', paddingHorizontal: 0, marginTop: 'auto' },
  platform: { textAlign: 'center', marginTop: spacing.xxl },
});
