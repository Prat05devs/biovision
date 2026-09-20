import { regionName } from '@/config/deployment';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FacilityCard } from '@/components/care/FacilityCard';
import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { healthcareService } from '@/services';
import { colors, radius, spacing } from '@/theme/tokens';
import { fontFamily } from '@/theme/fonts';

export default function CareListScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ specialty?: string }>();
  const [specialty, setSpecialty] = useState(params.specialty ? `specialties.${params.specialty}` : 'all');
  const [search, setSearch] = useState('');
  const [governmentOnly, setGovernmentOnly] = useState(false);
  const query = useQuery({ queryKey: ['facilities'], queryFn: () => healthcareService.listFacilities(), staleTime: Infinity });
  const specialties = [...new Set((query.data ?? []).flatMap(f => f.specialties))];
  const visible = (query.data ?? []).filter(f =>
    (specialty === 'all' || f.specialties.includes(specialty)) && (!governmentOnly || f.isGovernment) &&
    [f.name, f.address, f.affiliation ?? '', ...f.specialties.map(s => `${s} ${t(s)}`)].join(' ').toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <Screen>
    <AppHeader back language title={t('navigation.care')} />
    <AppText variant="eyebrow" color={colors.primary} style={styles.top}>{t('care.eyebrow')}</AppText>
    <AppText variant="h1">{t('care.title', { city: regionName(i18n.language) })}</AppText>
    <AppText color={colors.inkMuted} style={styles.space}>{t('care.description')}</AppText>
    <Card tone="soft" style={styles.top}><AppText variant="small" color={colors.inkMuted}>{t('care.directoryNote', { city: regionName(i18n.language), count: query.data?.length ?? 0 })}</AppText></Card>
    <TextInput value={search} onChangeText={setSearch} placeholder={t('care.search')} accessibilityLabel={t('care.search')} placeholderTextColor={colors.inkMuted} style={styles.search} returnKeyType="search" autoCorrect={false} clearButtonMode="while-editing" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {['all', ...specialties].map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === specialty }} style={[styles.filter, specialty === item && styles.active]} onPress={() => setSpecialty(item)}>
        <AppText variant="small" color={specialty === item ? colors.white : colors.ink}>{item === 'all' ? t('care.allSpecialties') : t(item)}</AppText>
      </Pressable>)}
    </ScrollView>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: governmentOnly }} onPress={() => { setGovernmentOnly(v => !v); setSpecialty('all'); }} style={styles.filter}><AppText>{governmentOnly ? '☑' : '☐'} {t('care.government')}</AppText></Pressable>
    <View style={styles.toolbar}><AppText variant="small">{t('care.count', { count: visible.length })}</AppText><Button label={t('care.map')} variant="ghost" icon="map" onPress={() => router.push('/care/map')} /></View>
    {query.isLoading ? <ActivityIndicator color={colors.primary} /> : query.isError ? <ErrorState title={t('errors.title')} body={t('errors.body')} action={t('common.retry')} onAction={() => void query.refetch()} /> : visible.length ? <View style={styles.list}>{visible.map(f => <FacilityCard key={f.id} facility={f} />)}</View> : <AppText color={colors.inkMuted} style={styles.top}>{t('care.empty')}</AppText>}
  </Screen>;
}
const styles = StyleSheet.create({
  top: { marginTop: spacing.xl }, space: { marginTop: spacing.sm },
  search: { minHeight: 54, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surface, color: colors.ink, fontSize: 16, fontFamily: fontFamily(400), marginTop: spacing.xl },
  filters: { gap: spacing.xs, paddingVertical: spacing.md }, filter: { minHeight: 48, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  active: { backgroundColor: colors.primary, borderColor: colors.primary }, toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }, list: { gap: spacing.md },
});
