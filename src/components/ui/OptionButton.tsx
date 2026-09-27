import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/tokens';

export function OptionButton({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.selected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        <AppIcon name={selected ? 'checkCircle' : 'circle'} size={20} color={selected ? colors.white : colors.inkMuted} strokeWidth={selected ? 2.5 : 1.8} />
      </View>
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.78 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: colors.primary },
  label: { flex: 1, fontWeight: '500' },
});
