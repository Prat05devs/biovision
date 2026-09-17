import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/AppText';
import { AppIcon } from '@/components/ui/AppIcon';
import { Card } from '@/components/ui/Card';
import { colors, radius, spacing } from '@/theme/tokens';
import type { HealthcareFacility } from '@/types/healthcare';

const translateOrValue = (translate: (key: string) => string, value: string) => {
  const translated = translate(value);
  return translated === value ? value : translated;
};

export function FacilityCard({ facility }: { facility: HealthcareFacility }) {
  const { t } = useTranslation();
  const name = translateOrValue(t, facility.name);
  const type = t(`care.types.${facility.facilityType}`);
  const address = translateOrValue(t, facility.address);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${type}. ${address}`}
      onPress={() => router.push({ pathname: '/care/[id]', params: { id: facility.id } })}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.icon}>
            <AppIcon name={facility.facilityType === 'diagnostic_lab' ? 'flask' : 'medicalBag'} size={22} color={colors.primary} />
          </View>
          <View style={styles.copy}>
            <AppText variant="caption" color={colors.primary}>
              {type}
            </AppText>
            <AppText variant="h3" style={styles.name}>{name}</AppText>
          </View>
          <AppIcon name="chevronForward" size={21} color={colors.inkMuted} />
        </View>
        {facility.affiliation ? <AppText variant="small">{facility.affiliation}</AppText> : null}
        {facility.department || facility.qualifications ? (
          <AppText variant="caption" color={colors.inkMuted}>{[facility.department, facility.qualifications].filter(Boolean).join(' · ')}</AppText>
        ) : null}
        <AppText variant="small" color={colors.primary}>{facility.specialties.map(s => translateOrValue(t, s)).join(' · ')}</AppText>
        <AppText variant="small" color={colors.inkMuted}>{address}</AppText>
        <View style={styles.metaRow}>
          {facility.distanceKm !== undefined ? (
            <View style={styles.meta}>
              <AppIcon name="navigation" size={15} color={colors.inkMuted} />
              <AppText variant="caption" color={colors.inkMuted}>{t('care.distance', { distance: facility.distanceKm.toFixed(1) })}</AppText>
            </View>
          ) : null}
          {facility.isGovernment ? (
            <View style={styles.meta}>
              <AppIcon name="building" size={15} color={colors.inkMuted} />
              <AppText variant="caption" color={colors.inkMuted}>{t('care.government')}</AppText>
            </View>
          ) : null}
          {!facility.isVerified ? (
            <View style={styles.demoBadge}>
              <AppText variant="caption" color={colors.caution}>{t('care.unverified')}</AppText>
            </View>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.78 },
  card: { gap: spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  name: { marginTop: spacing.xxs },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  demoBadge: { borderRadius: radius.pill, backgroundColor: colors.cautionSoft, paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
});
