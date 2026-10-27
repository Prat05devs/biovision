import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppIcon } from '@/components/ui/AppIcon';
import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme/redesign';

export function OptionButton({
  label,
  selected,
  onPress,
  style,
  multiple = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  multiple?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
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
      <AppText variant="body" color={selected ? colors.white : colors.ink} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    minWidth: 0,
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
  selected: { borderColor: colors.primary, backgroundColor: colors.primary },
  pressed: { opacity: 0.78 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: colors.primary },
  label: { flex: 1, minWidth: 0, fontWeight: '500' },
});
