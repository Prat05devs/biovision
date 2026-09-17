import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { NoticeCard } from '@/components/ui/NoticeCard';
import { Screen } from '@/components/ui/Screen';
import { healthcareService } from '@/services';
import { colors, radius, spacing } from '@/theme/tokens';

export default function FacilityDetailScreen() {
  const { t } = useTranslation();
  const [linkError, setLinkError] = useState(false);
  const open = async (url: string) => { setLinkError(false); try { await Linking.openURL(url); } catch { setLinkError(true); } };
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['facilities'], queryFn: () => healthcareService.listFacilities() });
  const facility = query.data?.find((item) => item.id === id);
  const localize = (value: string) => {
    const translated = t(value);
    return translated === value ? value : translated;
  };

  if (query.isLoading) return <Screen scroll={false}><AppHeader back /><View style={styles.loading}><AppText>{t('common.loading')}</AppText></View></Screen>;
  if (!facility) {
    return (
      <Screen scroll={false}>
        <AppHeader back />
        <ErrorState title={t('care.missing')} body={t('care.description')} action={t('common.back')} onAction={() => router.back()} />
      </Screen>
    );
  }

  const directionsUrl = facility.directionsUrl ?? (
    facility.latitude !== undefined && facility.longitude !== undefined
      ? `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`
      : undefined
  );

  return (
    <Screen>
      <AppHeader back title={t('care.detailTitle')} />
      <View style={styles.heroIcon}><AppIcon name="medicalBag" size={34} color={colors.primary} /></View>
      <AppText variant="eyebrow" color={colors.primary} style={styles.eyebrow}>{t(`care.types.${facility.facilityType}`)}</AppText>
      <AppText variant="h1">{localize(facility.name)}</AppText>
      {facility.affiliation ? <AppText style={styles.address}>{facility.affiliation}</AppText> : null}
      {facility.department || facility.qualifications ? (
        <AppText variant="small" color={colors.inkMuted} style={styles.address}>{[facility.department, facility.qualifications].filter(Boolean).join(' · ')}</AppText>
      ) : null}
      <AppText color={colors.inkMuted} style={styles.address}>{localize(facility.address)}</AppText>
      {facility.affiliation ? <NoticeCard title={t('care.detailTitle')} body={t('care.providerNote')} /> : null}
      <Card style={styles.card}>
        <AppText variant="h3">{t('care.specialties')}</AppText>
        {facility.specialties.map((specialty) => (
          <View key={specialty} style={styles.specialty}>
            <AppIcon name="checkCircleOutline" size={20} color={colors.primary} />
            <AppText variant="small">{localize(specialty)}</AppText>
          </View>
        ))}
      </Card>
      {!facility.isVerified ? <NoticeCard title={t('care.verification')} body={t('care.notVerified')} /> : null}
      <Button
        label={t('common.directions')}
        onPress={() => directionsUrl && void open(directionsUrl)}
        disabled={!directionsUrl}
        icon="navigation"
        style={styles.button}
      />
      {facility.phone ? <Button label={t('care.call', { phone: facility.phone })} onPress={() => void open(`tel:${facility.phone!.replace(/[^0-9+]/g, '')}`)} variant="outline" icon="phone" style={styles.button} /> : null}
      {facility.sourceUrl ? <Button label={t('care.source')} onPress={() => void open(facility.sourceUrl!)} variant="outline" style={styles.button} /> : null}
      {facility.verifiedAt ? <AppText variant="caption" color={colors.inkMuted} style={styles.address}>{t('care.checked', { date: facility.verifiedAt })}</AppText> : null}
      {linkError ? <AppText accessibilityRole="alert" color={colors.urgent}>{t('health.error')}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroIcon: { width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  eyebrow: { marginTop: spacing.lg, marginBottom: spacing.xs },
  address: { marginTop: spacing.sm },
  card: { marginTop: spacing.xl, marginBottom: spacing.md, gap: spacing.md },
  specialty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  button: { marginTop: spacing.xl },
});
