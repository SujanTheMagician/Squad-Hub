import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing, TypeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { countdown, formatEventTime } from '@/lib/events';
import { EVENT_KIND_LABELS, type BatchEvent, type EventKind } from '@/lib/types';

export const EVENT_KIND_STYLE: Record<EventKind, { icon: ComponentProps<typeof Ionicons>['name']; color: string }> = {
  deadline: { icon: 'alarm', color: TypeColors.project },
  exam: { icon: 'school', color: TypeColors.note },
  hackathon: { icon: 'code-slash', color: '#8B5CF6' },
  class: { icon: 'easel', color: TypeColors.resource },
  event: { icon: 'calendar', color: TypeColors.idea },
};

export function EventCard({ event, reminded, onToggleReminder, onDelete }: {
  event: BatchEvent;
  reminded?: boolean;
  onToggleReminder?: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const style = EVENT_KIND_STYLE[event.kind];
  const day = new Date(event.starts_at);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.dateBlock, { backgroundColor: `${style.color}1F` }]}>
        <ThemedText type="caption" style={{ color: style.color }}>
          {day.toLocaleDateString([], { month: 'short' }).toUpperCase()}
        </ThemedText>
        <ThemedText type="subtitle" style={[styles.dateNumber, { color: style.color }]}>
          {day.getDate()}
        </ThemedText>
      </View>
      <View style={styles.flex}>
        <View style={styles.row}>
          <Ionicons name={style.icon} size={13} color={style.color} />
          <ThemedText type="caption" style={{ color: style.color }}>
            {EVENT_KIND_LABELS[event.kind].toUpperCase()}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            · {event.squad ? `SQUAD ${event.squad}` : 'WHOLE BATCH'}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" numberOfLines={2}>
          {event.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatEventTime(event.starts_at)} · {countdown(event.starts_at)}
        </ThemedText>
        {!!event.description && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
            {event.description}
          </ThemedText>
        )}
      </View>
      <View style={styles.actions}>
        {onToggleReminder && (
          <PressableScale onPress={onToggleReminder} scaleTo={0.85} accessibilityLabel={reminded ? 'Cancel reminder' : 'Remind me'} style={styles.iconButton}>
            <Ionicons name={reminded ? 'notifications' : 'notifications-outline'} size={20} color={reminded ? theme.primary : theme.textSecondary} />
          </PressableScale>
        )}
        {onDelete && (
          <PressableScale onPress={onDelete} scaleTo={0.85} accessibilityLabel="Delete" style={styles.iconButton}>
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
          </PressableScale>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  dateBlock: {
    width: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
  dateNumber: {
    lineHeight: 30,
  },
  actions: {
    gap: Spacing.two,
    alignItems: 'center',
  },
  iconButton: {
    padding: Spacing.one,
  },
});
