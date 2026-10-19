import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { EVENT_KIND_STYLE, EventCard } from '@/components/event-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Radius, SquadColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  cancelReminder,
  createEvent,
  deleteEvent,
  fetchUpcomingEvents,
  formatEventTime,
  reminderIds,
  scheduleReminder,
} from '@/lib/events';
import { EVENT_KIND_LABELS, SQUADS, type BatchEvent, type EventKind, type Squad } from '@/lib/types';
import { useSession } from '@/providers/session';

const KIND_OPTIONS = (Object.keys(EVENT_KIND_LABELS) as EventKind[]).map((kind) => ({
  value: kind,
  label: EVENT_KIND_LABELS[kind],
  color: EVENT_KIND_STYLE[kind].color,
  icon: EVENT_KIND_STYLE[kind].icon,
}));

const SQUAD_OPTIONS: { value: Squad | null; label: string; color?: string }[] = [
  { value: null, label: 'Whole batch' },
  ...SQUADS.map((squad) => ({ value: squad, label: `Squad ${squad}`, color: SquadColors[squad] })),
];

function defaultStart() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setHours(10, 0, 0, 0);
  return date;
}

function NewEventForm({ onCreated }: { onCreated: () => void }) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<EventKind>('deadline');
  const [squad, setSquad] = useState<Squad | null>(null);
  const [startsAt, setStartsAt] = useState(defaultStart);
  const [iosPicker, setIosPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  function pick() {
    if (Platform.OS !== 'android') {
      setIosPicker((open) => !open);
      return;
    }
    // Android shows date and time as two native dialogs.
    DateTimePickerAndroid.open({
      value: startsAt,
      mode: 'date',
      minimumDate: new Date(),
      onChange: (event, date) => {
        if (event.type !== 'set' || !date) return;
        DateTimePickerAndroid.open({
          value: date,
          mode: 'time',
          onChange: (timeEvent, time) => {
            if (timeEvent.type === 'set' && time) setStartsAt(time);
          },
        });
      },
    });
  }

  async function save() {
    setSaving(true);
    try {
      await createEvent({ title: title.trim(), description: description.trim(), kind, squad, startsAt });
      setTitle('');
      setDescription('');
      onCreated();
    } catch (e) {
      Alert.alert('Could not add', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Animated.View entering={FadeInDown.duration(350)} style={[styles.form, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ChipGroup options={KIND_OPTIONS} value={kind} onChange={setKind} />
      <TextField value={title} onChangeText={setTitle} placeholder="e.g. Sprint 4 submission" maxLength={140} />
      <TextField value={description} onChangeText={setDescription} placeholder="Details, link, room (optional)" multiline />
      <PressableScale onPress={pick} style={[styles.when, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <Ionicons name="time-outline" size={18} color={theme.primary} />
        <ThemedText type="smallBold" style={styles.flex}>
          {formatEventTime(startsAt.toISOString())}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.primary }}>
          Change
        </ThemedText>
      </PressableScale>
      {iosPicker && (
        <DateTimePicker value={startsAt} mode="datetime" display="inline" minimumDate={new Date()} onChange={(_, date) => date && setStartsAt(date)} />
      )}
      <ChipGroup options={SQUAD_OPTIONS} value={squad} onChange={setSquad} />
      <Button title="Add to calendar" icon="add-circle-outline" onPress={save} loading={saving} disabled={!title.trim()} />
    </Animated.View>
  );
}

export default function EventsScreen() {
  const theme = useTheme();
  const { isModerator } = useSession();
  const [events, setEvents] = useState<BatchEvent[]>([]);
  const [reminders, setReminders] = useState<Set<string>>(() => reminderIds());
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setEvents(await fetchUpcomingEvents().catch(() => []));
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function toggleReminder(event: BatchEvent) {
    try {
      if (reminders.has(event.id)) {
        await cancelReminder(event.id);
      } else {
        await scheduleReminder(event);
      }
      setReminders(reminderIds());
    } catch (e) {
      Alert.alert('Reminder', e instanceof Error ? e.message : 'Could not set the reminder.');
    }
  }

  function confirmDelete(event: BatchEvent) {
    Alert.alert('Remove from calendar?', event.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteEvent(event.id).then(load) },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={theme.primary}
          colors={[theme.primary]}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }>
      <ThemedText themeColor="textSecondary">
        Tap the bell on anything to get a reminder an hour before. Reminders work offline.
      </ThemedText>

      {isModerator && (
        <Button
          title={adding ? 'Close' : 'Add a deadline or event'}
          icon={adding ? 'close' : 'add'}
          variant={adding ? 'secondary' : 'primary'}
          onPress={() => setAdding((open) => !open)}
        />
      )}
      {adding && (
        <NewEventForm
          onCreated={() => {
            setAdding(false);
            load();
          }}
        />
      )}

      {events.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="calendar-outline" size={32} color={theme.primary} />
          </View>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Nothing coming up. Deadlines, exams and hackathons will appear here.
          </ThemedText>
        </View>
      ) : (
        events.map((event, index) => (
          <Animated.View key={event.id} entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(400)} layout={LinearTransition}>
            <EventCard
              event={event}
              reminded={reminders.has(event.id)}
              onToggleReminder={() => toggleReminder(event)}
              onDelete={isModerator ? () => confirmDelete(event) : undefined}
            />
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  center: {
    textAlign: 'center',
  },
  form: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  when: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
