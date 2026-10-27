import { router } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeatureRow } from '@/components/ui/FeatureRow';
import { Screen } from '@/components/ui/Screen';
import { usePreferencesStore } from '@/store/preferences.store';
import { colors, spacing } from '@/theme/redesign';

const faceScan = require('../../assets/images/welcome/face-scan.jpg');
// Cropped portrait (820x1140); the meshed face spans roughly 14-72% of its height.
const PHOTO_ASPECT = 820 / 1140;
// Matches Screen's maximum content width.
const MAX_WIDTH = 680;

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const acceptTerms = usePreferencesStore(state => state.acceptTerms);
  const [agreed, setAgreed] = useState(false);
  const { width, height } = useWindowDimensions();
  // Full-bleed photo behind the header; the copy rises out of its faded lower edge.
  const photoWidth = Math.min(width, MAX_WIDTH);
  const photoHeight = Math.min(photoWidth / PHOTO_ASPECT, height * 0.66);
  return <Screen hero>
    <View style={[styles.photo, { height: photoHeight }]} pointerEvents="none"
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Explicit size: with only absolute insets the Image kept its intrinsic 820pt width. */}
      <Image source={faceScan} resizeMode="cover" style={styles.photoImage} />
      {/* Top fade into the hero teal keeps the white header legible; bottom fade into mist. */}
      <LinearGradient colors={['#2B6C86', 'rgba(43,108,134,0.55)', 'rgba(43,108,134,0)']} locations={[0, 0.1, 0.24]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(229,235,240,0)', 'rgba(229,235,240,0.7)', colors.background]} locations={[0.6, 0.8, 1]} style={StyleSheet.absoluteFill} />
    </View>
    <AppHeader language />
    <View style={{ height: photoHeight * 0.68 - 56 }} />
    <View style={styles.eyebrow}><AppText variant="eyebrow" color={colors.primaryDark}>{t('brand.eyebrow')}</AppText></View>
    <AppText variant="display" style={styles.title}>{t('brand.platform')}</AppText>
    <Card style={styles.card}>
      <FeatureRow icon="stethoscope" title={t('welcome.points.doctor.title')} description={t('welcome.description')} />
      <FeatureRow icon="shieldCheck" title={t('welcome.points.private.title')} description={t('notice.privacy')} />
      <Pressable accessibilityRole="checkbox" accessibilityLabel={t('welcome.agree')} accessibilityState={{ checked: agreed }}
        onPress={() => setAgreed(value => !value)} style={styles.agree}>
        <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <AppIcon name="check" size={16} color={colors.white} /> : null}</View>
        <AppText variant="small" style={styles.flex}>{t('welcome.agree')}</AppText>
      </Pressable>
      <Button label={t('welcome.continue')} variant="secondary" disabled={!agreed} icon="arrowForward" iconPosition="right"
        onPress={() => { acceptTerms(); router.replace('/'); }} />
    </Card>
    <View style={styles.links}>
      <Button label={t('settings.privacy')} variant="ghost" onPress={() => router.push({ pathname: '/settings/legal', params: { doc: 'privacy' } })} />
      <Button label={t('settings.terms')} variant="ghost" onPress={() => router.push({ pathname: '/settings/legal', params: { doc: 'terms' } })} />
    </View>
  </Screen>;
}
const styles = StyleSheet.create({
  photo: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  eyebrow: { alignSelf: 'flex-start', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.white },
  title: { marginTop: 12 }, card: { marginTop: 24, gap: 18, padding: 18, borderRadius: 30 },
  agree: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: colors.inkMuted, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary }, flex: { flex: 1 },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: 8 },
});
