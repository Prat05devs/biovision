import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';
import type { FaceSign } from '@/types/observations';

/**
 * One face sign, offered for the person to confirm or reject on their own
 * capture. Confirming it reveals what traditional and clinical sources
 * associate with the sign, so the reasoning is visible rather than implied.
 */
export function SignCard({
  sign,
  confirmed,
  onToggle,
}: {
  sign: FaceSign;
  confirmed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={[styles.card, confirmed && styles.cardConfirmed]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
        accessibilityLabel={t(sign.labelKey)}
        accessibilityHint={t(sign.promptKey)}
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
      >
        <View style={[styles.box, confirmed && styles.boxChecked]}>
          <AppIcon
            name={confirmed ? 'checkCircle' : 'circle'}
            size={22}
            color={confirmed ? colors.white : colors.inkMuted}
            strokeWidth={confirmed ? 2.5 : 1.8}
          />
        </View>
        <View style={styles.headerText}>
          <AppText variant="h3">{t(sign.labelKey)}</AppText>
          <AppText variant="small" color={colors.inkMuted} style={styles.prompt}>
            {t(sign.promptKey)}
          </AppText>
        </View>
      </Pressable>

      {confirmed ? (
        <View style={styles.details}>
          <Detail label={t('observations.traditionalLabel')} body={t(sign.traditionalKey)} color={colors.primary} />
          <Detail label={t('observations.clinicalLabel')} body={t(sign.clinicalKey)} color={colors.inkMuted} />
        </View>
      ) : null}
    </View>
  );
}

function Detail({ label, body, color }: { label: string; body: string; color: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="caption" color={color} style={styles.detailLabel}>
        {label}
      </AppText>
      <AppText variant="small" color={colors.ink}>
        {body}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cardConfirmed: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, padding: spacing.md, minHeight: 64 },
  pressed: { opacity: 0.78 },
  box: { width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  boxChecked: { backgroundColor: colors.primary },
  headerText: { flex: 1, gap: 2 },
  prompt: { marginTop: 2 },
  details: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detail: { gap: 2 },
  detailLabel: { fontWeight: '800', letterSpacing: 0.6 },
});
