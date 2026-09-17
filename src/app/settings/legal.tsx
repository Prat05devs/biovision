import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppHeader } from '@/components/ui/AppHeader';
import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/theme/tokens';

const documents = ['privacy', 'terms', 'medical', 'howItWorks', 'acknowledgements'] as const;
type LegalDoc = (typeof documents)[number];

/** Privacy policy, terms, medical information, how it works and acknowledgements, from the translation files. */
export default function LegalScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ doc?: string }>();
  const doc: LegalDoc = documents.includes(params.doc as LegalDoc) ? (params.doc as LegalDoc) : 'privacy';
  const sections = t(`legal.${doc}.sections`, { returnObjects: true }) as { heading: string; body: string }[];

  return (
    <Screen>
      <AppHeader back title={t(`legal.${doc}.title`)} />
      <AppText variant="h1" style={styles.title}>{t(`legal.${doc}.title`)}</AppText>
      <AppText variant="caption" color={colors.inkMuted} style={styles.updated}>{t('legal.updated')}</AppText>
      {Array.isArray(sections) ? sections.map((section) => (
        <View key={section.heading} style={styles.section}>
          <AppText variant="h3">{section.heading}</AppText>
          <AppText color={colors.inkMuted} style={styles.body}>{section.body}</AppText>
        </View>
      )) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: spacing.xl },
  updated: { marginTop: spacing.xs },
  section: { marginTop: spacing.xl },
  body: { marginTop: spacing.xs },
});
