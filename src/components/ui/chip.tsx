import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  /** Accent colour for the selected state and the tint of an unselected chip. */
  color?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
};

export function Chip({ label, selected, color, icon, onPress }: ChipProps) {
  const theme = useTheme();
  const accent = color ?? theme.primary;
  const foreground = selected ? '#FFFFFF' : color ?? theme.text;

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: accent, borderColor: accent }
          : { backgroundColor: color ? `${color}1F` : theme.backgroundSelected, borderColor: 'transparent' },
      ]}>
      {icon && <Ionicons name={icon} size={14} color={foreground} />}
      <ThemedText type="smallBold" style={[styles.label, { color: foreground }]}>
        {label}
      </ThemedText>
    </PressableScale>
  );
}

type ChipGroupProps<T> = {
  options: { value: T; label: string; color?: string; icon?: ComponentProps<typeof Ionicons>['name'] }[];
  value: T;
  onChange: (value: T) => void;
};

/** Chips wrap onto new lines instead of scrolling sideways, so labels are never cut off. */
export function ChipGroup<T>({ options, value, onChange }: ChipGroupProps<T>) {
  return (
    <View style={styles.group}>
      {options.map((option) => (
        <Chip
          key={String(option.value)}
          label={option.label}
          color={option.color}
          icon={option.icon}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
