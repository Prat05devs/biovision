import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { AppIcon } from './AppIcon';
import { colors } from '@/theme/redesign';

export function ScanSteps({ current }: { current: 0 | 1 | 2 | 3 }) {
  const { t } = useTranslation();
  return <View style={styles.row}>
    {['profile', 'face', 'eyes', 'questions'].map((key, index) => <View key={key} style={styles.step}>
      <View style={[styles.line, index <= current && styles.activeLine]} />
      <View style={styles.label}>
        {index < current ? <AppIcon name="check" size={12} color={colors.primaryDark} /> : null}
        <AppText variant="caption" color={index <= current ? colors.primaryDark : colors.inkMuted} style={styles.text}>{t(`redesign.steps.${key}`)}</AppText>
      </View>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 12 },
  step: { flex: 1, gap: 8 }, line: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.65)' },
  activeLine: { backgroundColor: colors.primary }, label: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  text: { flexShrink: 1, fontSize: 11 },
});
