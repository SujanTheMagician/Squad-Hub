import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, SquadColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { SquadFilter } from '@/lib/posts';

const OPTIONS: { value: SquadFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 91, label: '91' },
  { value: 92, label: '92' },
  { value: 93, label: '93' },
];

/** Full-width segmented control with a sliding highlight. Equal-width segments keep every number visible. */
export function SquadSelector({ value, onChange }: { value: SquadFilter; onChange: (value: SquadFilter) => void }) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const segment = width / OPTIONS.length;
  const index = OPTIONS.findIndex((option) => option.value === value);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segment - Spacing.one * 2,
    transform: [{ translateX: withSpring(index * segment, { damping: 18, stiffness: 180 }) }],
  }));

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      {width > 0 && (
        <Animated.View
          style={[styles.indicator, { backgroundColor: theme.backgroundElement, shadowColor: theme.shadow }, indicatorStyle]}
        />
      )}
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        const dot = option.value === 'all' ? theme.primary : SquadColors[option.value];
        return (
          <PressableScale key={option.value} style={styles.segment} onPress={() => onChange(option.value)} scaleTo={0.94}>
            <View style={[styles.dot, { backgroundColor: dot, opacity: selected ? 1 : 0.5 }]} />
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              style={{ color: selected ? theme.text : theme.textSecondary }}>
              {option.label}
            </ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: Spacing.one,
  },
  indicator: {
    position: 'absolute',
    top: Spacing.one,
    bottom: Spacing.one,
    left: Spacing.one,
    borderRadius: Radius.sm + 2,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two + Spacing.half,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
