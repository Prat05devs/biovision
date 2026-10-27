import { deployment } from '@/config/deployment';
import { useCameraPermissions } from 'expo-camera';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { startQuestionsWithoutCamera } from '@/services/local/withoutCamera';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/redesign';

export default function CameraPermissionScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [requesting, setRequesting] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const researchConsent = useAssessmentStore((state) => state.session.scan.researchConsent);
  const setResearchConsent = useAssessmentStore((state) => state.setResearchConsent);

  const request = async () => {
    if (requesting) return;
    setRequesting(true); setPermissionError(false);
    try {
      if (permission?.granted) { router.replace('/scan/vitals' as Href); return; }
      const result = await requestPermission();
      if (result.granted) router.replace('/scan/vitals' as Href);
    } catch { setPermissionError(true); }
    finally { setRequesting(false); }
  };

  // The profile was filled in just before this screen, so the camera-free questions can start now.
  const profile = useAssessmentStore((state) => state.session.profile);
  const withoutCamera = async () => {
    if (!profile) { router.replace({ pathname: '/scan/profile', params: { mode: 'questions' } }); return; }
    setPermissionError(false);
    try {
      await startQuestionsWithoutCamera(profile);
      router.replace('/questions');
    } catch { setPermissionError(true); }
  };

  const permanentlyDenied = permission && !permission.granted && !permission.canAskAgain;

  return (
    <Screen
      footer={
        permanentlyDenied && Platform.OS !== 'web' ? (
          <Button label={t('common.openSettings')} onPress={() => { void Linking.openSettings().catch(() => setPermissionError(true)); }} icon="settings" />
        ) : (
          <Button
            label={permission?.granted ? t('common.continue') : t('permissions.allow')}
            onPress={() => void request()}
            loading={requesting}
            icon="camera"
          />
        )
      }
    >
      <AppHeader back title={t('navigation.scan')} />
      <View style={styles.iconWrap}>
        <AppIcon name="camera" size={32} color={colors.primary} />
      </View>
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>
        {t('permissions.step')}
      </AppText>
      <AppText variant="h1">{permanentlyDenied ? t('permissions.deniedTitle') : t('permissions.title')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>
        {permanentlyDenied ? t('permissions.deniedBody') : t('permissions.description')}
      </AppText>
      <Card tone="soft" style={styles.card}>
        <AppIcon name="shieldCheck" size={25} color={colors.primary} />
        <View style={styles.copy}>
          <AppText variant="h3">{t('permissions.privateTitle')}</AppText>
          <AppText variant="small" color={colors.inkMuted} style={styles.cardBody}>
            {t('permissions.privateBody')}
          </AppText>
        </View>
      </Card>
      {deployment.researchCollectionAvailable ? (
      <View style={[styles.researchCard, researchConsent && styles.researchCardSelected]}>
        <View style={styles.copy}>
          <AppText variant="h3">{t('permissions.researchTitle')}</AppText>
          <AppText variant="small" color={colors.inkMuted} style={styles.cardBody}>{t('permissions.researchBody')}</AppText>
          <AppText accessibilityLiveRegion="polite" variant="caption" color={colors.primary} style={styles.consentStatus}>{t(researchConsent ? 'permissions.researchSelected' : 'permissions.researchNotSelected')}</AppText>
        </View>
        <Switch accessibilityLabel={t('permissions.researchTitle')} value={researchConsent}
          onValueChange={setResearchConsent} trackColor={{ false: colors.border, true: colors.primary }} />
      </View>
      ) : null}
      {permissionError ? <AppText accessibilityRole="alert" color={colors.urgent}>{t('health.error')}</AppText> : null}
      <Button label={t('home.withoutCamera')} variant="ghost" onPress={() => void withoutCamera()} style={{ marginTop: spacing.md }} />

    </Screen>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginTop: spacing.xxl,
  },
  eyebrow: { marginTop: spacing.xl, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.xxl },
  copy: { flex: 1 },
  cardBody: { marginTop: spacing.xxs },
  researchCard: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  researchCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  consentStatus: { marginTop: spacing.sm, fontWeight: '700' },
  pressed: { opacity: 0.86 },
});
