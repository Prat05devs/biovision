import * as Linking from 'expo-linking';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { wellbeingService } from '@/services';
import { useAssessmentStore } from '@/store/assessment.store';
import { colors, radius, spacing } from '@/theme/tokens';
import type { SupportResource } from '@/types/wellbeing';

/**
 * Crisis support. Reachable from every wellbeing screen and from an endorsed
 * risk item, so help is never gated behind completing a questionnaire.
 */
export default function WellbeingSupportScreen() {
  const { t } = useTranslation();
  const stored = useAssessmentStore((state) => state.wellbeing.screen);
  const query = useQuery({
    queryKey: ['wellbeing-screen'],
    queryFn: () => wellbeingService.getScreen(),
    initialData: stored,
    staleTime: 5 * 60 * 1000,
  });

  const emergencyNumber = query.data?.emergencyNumber;
  const resources = query.data?.supportResources.filter((resource) => resource.verified) ?? [];

  const call = (phone: string) => {
    void Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
  };

  return (
    <Screen backgroundColor="#FFF8F7">
      <AppHeader back language title={t('wellbeing.supportTitle')} />
      <View style={styles.icon}>
        <AppIcon name="heartPulse" size={36} color={colors.urgent} />
      </View>
      <AppText variant="eyebrow" color={colors.urgent} style={styles.eyebrow}>
        {t('wellbeing.supportEyebrow')}
      </AppText>
      <AppText variant="h1">{t('wellbeing.supportTitle')}</AppText>
      <AppText color={colors.inkMuted} style={styles.description}>
        {t('wellbeing.supportDescription')}
      </AppText>

      {emergencyNumber ? (
        <Card tone="urgent" style={styles.emergencyCard}>
          <AppText variant="h3" color={colors.urgent}>
            {t('wellbeing.crisis.emergencyTitle')}
          </AppText>
          <AppText variant="small" color={colors.ink}>
            {t('wellbeing.crisis.emergencyBody')}
          </AppText>
          <Button
            label={t('wellbeing.crisis.callNumber', { number: emergencyNumber })}
            onPress={() => call(emergencyNumber)}
            variant="urgent"
            icon="phone"
          />
        </Card>
      ) : null}

      {query.isLoading && !query.data ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.urgent} />
          <AppText variant="small" color={colors.inkMuted}>
            {t('common.loading')}
          </AppText>
        </View>
      ) : null}

      {resources.length ? (
        <View style={styles.list}>
          {resources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} onCall={call} />
          ))}
        </View>
      ) : !query.isLoading ? (
        <Card tone="caution" style={styles.emptyCard}>
          <AppText variant="h3">{t('wellbeing.noVerifiedContact')}</AppText>
          <AppText variant="small" color={colors.inkMuted}>
            {t('wellbeing.crisis.noDirectory')}
          </AppText>
        </Card>
      ) : null}

      <Button
        label={t('wellbeing.nearby')}
        onPress={() => router.push('/care')}
        variant="outline"
        icon="mapPin"
        style={styles.nearby}
      />
    </Screen>
  );
}

function ResourceCard({
  resource,
  onCall,
}: {
  resource: SupportResource;
  onCall: (phone: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Card style={styles.resource}>
      <AppText variant="h3">{t(resource.nameKey)}</AppText>
      <AppText variant="small" color={colors.inkMuted}>
        {t(resource.descriptionKey)}
      </AppText>
      <View style={styles.metaRow}>
        <AppText variant="caption" color={colors.inkMuted}>
          {resource.operator}
        </AppText>
        <AppText variant="caption" color={colors.primary}>
          {t('wellbeing.verifiedOn', { date: resource.verifiedOn })}
        </AppText>
      </View>
      {resource.phone ? (
        <Button
          label={t('wellbeing.crisis.callNumber', { number: resource.phone })}
          onPress={() => onCall(resource.phone!)}
          icon="phone"
        />
      ) : null}
      {resource.alternatePhone ? (
        <Button
          label={t('wellbeing.crisis.callNumber', { number: resource.alternatePhone })}
          onPress={() => onCall(resource.alternatePhone!)}
          variant="outline"
          icon="phone"
        />
      ) : null}
      {resource.website ? (
        <Button
          label={t('common.learnMore')}
          onPress={() => void Linking.openURL(resource.website!)}
          variant="ghost"
          icon="externalLink"
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  icon: { width: 72, height: 72, borderRadius: radius.xl, backgroundColor: colors.urgentSoft, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  eyebrow: { marginTop: spacing.lg, marginBottom: spacing.xs },
  description: { marginTop: spacing.sm },
  emergencyCard: { marginTop: spacing.xl, gap: spacing.sm },
  loader: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },
  list: { marginTop: spacing.lg, gap: spacing.md },
  resource: { gap: spacing.sm },
  metaRow: { gap: 2, marginBottom: spacing.xs },
  emptyCard: { marginTop: spacing.lg, gap: spacing.sm },
  nearby: { marginTop: spacing.xl },
});
