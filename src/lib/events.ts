import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase';
import type { BatchEvent, EventKind, Squad } from '@/lib/types';

const REMINDERS_KEY = 'squadhub.reminders';
const REMIND_BEFORE_MS = 60 * 60 * 1000;

export async function fetchUpcomingEvents(limit = 50) {
  // Keep things that started in the last 6 hours visible (e.g. an exam in progress).
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, kind, squad, starts_at')
    .gte('starts_at', since)
    .order('starts_at')
    .limit(limit);
  if (error) throw error;
  return data as BatchEvent[];
}

export async function createEvent(event: { title: string; description: string; kind: EventKind; squad: Squad | null; startsAt: Date }) {
  const { error } = await supabase.from('events').insert({
    title: event.title,
    description: event.description,
    kind: event.kind,
    squad: event.squad,
    starts_at: event.startsAt.toISOString(),
  });
  if (error) throw error;
}

export async function deleteEvent(id: string) {
  await cancelReminder(id);
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

// Reminders are local notifications on this phone, so they work even without push (FCM) set up.
function readReminders(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(REMINDERS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeReminders(reminders: Record<string, string>) {
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
}

export function reminderIds() {
  return new Set(Object.keys(readReminders()));
}

/** Schedules a reminder an hour before (or at the start, if that's under an hour away). */
export async function scheduleReminder(event: BatchEvent) {
  const start = new Date(event.starts_at).getTime();
  if (start <= Date.now()) throw new Error('This has already started.');

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted && !(await Notifications.requestPermissionsAsync()).granted) {
    throw new Error('Allow notifications for Squad Hub in your phone settings to get reminders.');
  }

  const at = Math.max(start - REMIND_BEFORE_MS, Date.now() + 5_000);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: event.title,
      body: start - at >= REMIND_BEFORE_MS - 1000 ? 'Starts in 1 hour' : 'Starting soon',
      data: { url: '/events' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: 'default' },
  });
  writeReminders({ ...readReminders(), [event.id]: id });
}

export async function cancelReminder(eventId: string) {
  const reminders = readReminders();
  const id = reminders[eventId];
  if (!id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
  delete reminders[eventId];
  writeReminders(reminders);
}

export function formatEventTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "in 3 days", "in 5h", "today", "started". */
export function countdown(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Started';
  const hours = ms / 3_600_000;
  if (hours < 1) return `In ${Math.max(1, Math.round(ms / 60_000))} min`;
  if (hours < 24) return `In ${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Tomorrow' : `In ${days} days`;
}
