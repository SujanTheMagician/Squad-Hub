import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { router, useFocusEffect } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { MaxContentWidth, Radius, SquadChartColors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/posts';
import { fetchDirectory } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { POST_TYPE_LABELS, type PostType, type Squad } from '@/lib/types';

const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

type AppError = { id: string; message: string; fatal: boolean; app_version: string | null; platform: string | null; created_at: string };

type Extras = {
  joined: number;
  withPhoto: number;
  withPhone: number;
  withBirthday: number;
  storageBytes: number;
  errors: AppError[];
};

async function loadExtras(): Promise<Extras> {
  const [members, storage, errors] = await Promise.all([
    fetchDirectory(),
    supabase.rpc('storage_usage'),
    supabase.from('app_errors').select('id, message, fatal, app_version, platform, created_at').order('created_at', { ascending: false }).limit(10),
  ]);
  const joined = members.filter((m) => m.joined);
  const buckets = (storage.data ?? {}) as Record<string, number>;
  return {
    joined: joined.length,
    withPhoto: joined.filter((m) => m.avatar_url).length,
    withPhone: joined.filter((m) => m.phone).length,
    withBirthday: joined.filter((m) => m.birthday).length,
    storageBytes: Object.values(buckets).reduce((sum, bytes) => sum + Number(bytes), 0),
    errors: (errors.data ?? []) as AppError[],
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

type Analytics = {
  members: { squad: Squad; invited: number; joined: number }[] | null;
  posts_by_type: Partial<Record<PostType, number>>;
  posts_by_squad: { squad: Squad; posts: number }[] | null;
  daily: { day: string; posts: number; messages: number }[];
  active_7d: number;
  totals: { posts: number; comments: number; messages: number; votes: number };
  top_contributors: { full_name: string; squad: Squad | null; posts: number; comments: number }[];
};

function Card({ title, subtitle, children, delay = 0 }: { title: string; subtitle?: string; children: React.ReactNode; delay?: number }) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(450)}
      style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View>
        <ThemedText type="heading">{title}</ThemedText>
        {subtitle && (
          <ThemedText type="caption" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {children}
    </Animated.View>
  );
}

function Stat({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Ionicons name={icon} size={18} color={theme.textSecondary} />
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {label.toUpperCase()}
      </ThemedText>
    </View>
  );
}

/** A horizontal bar that grows in from zero; the value is always printed beside it. */
function Bar({ fraction, color, delay }: { fraction: number; color: string; delay: number }) {
  const theme = useTheme();
  const width = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  useFocusEffect(
    useCallback(() => {
      width.set(withDelay(delay, withTiming(Math.max(fraction, 0.015), { duration: 700 })));
    }, [width, fraction, delay]),
  );

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, style]} />
    </View>
  );
}

function BarRow({ label, value, max, color, delay, valueLabel }: { label: string; value: number; max: number; color: string; delay: number; valueLabel?: string }) {
  return (
    <View style={styles.barRow}>
      <ThemedText type="small" style={styles.barLabel} numberOfLines={1}>
        {label}
      </ThemedText>
      <View style={styles.flex}>
        <Bar fraction={max ? value / max : 0} color={color} delay={delay} />
      </View>
      <ThemedText type="smallBold" style={styles.barValue}>
        {valueLabel ?? value}
      </ThemedText>
    </View>
  );
}

/** 14-day columns, posts and messages side by side; tap a day to read its numbers. */
function DailyChart({ days }: { days: Analytics['daily'] }) {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const series = { posts: theme.primary, messages: SquadChartColors[scheme][92] };
  const [selected, setSelected] = useState(days.length - 1);
  const max = Math.max(1, ...days.flatMap((d) => [d.posts, d.messages]));
  const day = days[selected];
  const label = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short' });

  return (
    <View style={styles.dailyWrap}>
      <View style={styles.legend}>
        {(['posts', 'messages'] as const).map((key) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: series[key] }]} />
            <ThemedText type="caption" themeColor="textSecondary">
              {key === 'posts' ? 'POSTS' : 'CHAT MESSAGES'}
            </ThemedText>
          </View>
        ))}
      </View>
      <View style={[styles.readout, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">{day ? label(day.day) : ''}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {day ? `${day.posts} posts · ${day.messages} messages` : ''}
        </ThemedText>
      </View>
      <View style={[styles.columns, { borderBottomColor: theme.border }]}>
        {days.map((d, i) => (
          <Pressable key={d.day} onPress={() => setSelected(i)} style={[styles.column, i === selected && { backgroundColor: theme.backgroundSelected }]}>
            <View style={styles.pair}>
              <View style={[styles.col, { height: `${(d.posts / max) * 100}%`, backgroundColor: series.posts, opacity: i === selected ? 1 : 0.75 }]} />
              <View style={[styles.col, { height: `${(d.messages / max) * 100}%`, backgroundColor: series.messages, opacity: i === selected ? 1 : 0.75 }]} />
            </View>
          </Pressable>
        ))}
      </View>
      <View style={styles.axis}>
        <ThemedText type="caption" themeColor="textSecondary">
          {days[0] ? label(days[0].day) : ''}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          TODAY
        </ThemedText>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const theme = useTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const squadColor = (squad: Squad) => SquadChartColors[scheme][squad];
  const [data, setData] = useState<Analytics | null>(null);
  const [extras, setExtras] = useState<Extras | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    loadExtras().then(setExtras).catch(() => setExtras(null));
    const { data: result, error: rpcError } = await supabase.rpc('batch_analytics');
    setRefreshing(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setError(null);
    setData(result as Analytics);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {error ? <ThemedText themeColor="textSecondary">{error}</ThemedText> : <ActivityIndicator color={theme.primary} />}
      </View>
    );
  }

  const members = data.members ?? [];
  const invited = members.reduce((sum, m) => sum + m.invited, 0);
  const joined = members.reduce((sum, m) => sum + m.joined, 0);
  const types = (Object.keys(POST_TYPE_LABELS) as PostType[]).map((type) => ({ type, count: data.posts_by_type[type] ?? 0 }));
  const maxType = Math.max(0, ...types.map((t) => t.count));
  const squads = data.posts_by_squad ?? [];
  const maxSquad = Math.max(0, ...squads.map((s) => s.posts));

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
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
      <Animated.View entering={FadeInDown.duration(400)} style={styles.stats}>
        <Stat icon="people-outline" label="Joined" value={`${joined}/${invited}`} />
        <Stat icon="flash-outline" label="Active 7 days" value={String(data.active_7d)} />
        <Stat icon="albums-outline" label="Posts" value={String(data.totals.posts)} />
        <Stat icon="chatbubbles-outline" label="Messages" value={String(data.totals.messages)} />
      </Animated.View>

      <PressableScale
        onPress={() => router.push('/students')}
        style={[styles.studentsButton, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
        <Ionicons name="people" size={20} color={theme.primary} />
        <View style={styles.flex}>
          <ThemedText type="smallBold">All students</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            NAMES, PHONES, BIRTHDAYS, WHO HASN&apos;T JOINED · EXPORT CSV
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.primary} />
      </PressableScale>

      <Card title="Members signed in" subtitle="JOINED OUT OF INVITED, BY SQUAD" delay={80}>
        {members.map((m, i) => (
          <BarRow
            key={m.squad}
            label={`Squad ${m.squad}`}
            value={m.joined}
            max={m.invited}
            color={squadColor(m.squad)}
            delay={i * 100}
            valueLabel={`${m.joined}/${m.invited}`}
          />
        ))}
      </Card>

      <Card title="Activity, last 14 days" subtitle="TAP A DAY TO SEE ITS NUMBERS" delay={160}>
        <DailyChart days={data.daily} />
      </Card>

      <Card title="Posts by type" delay={240}>
        {types.map((t, i) => (
          <BarRow key={t.type} label={POST_TYPE_LABELS[t.type]} value={t.count} max={maxType} color={theme.primary} delay={i * 80} />
        ))}
      </Card>

      <Card title="Posts by squad" subtitle="BY THE AUTHOR'S SQUAD" delay={320}>
        {squads.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No posts yet.
          </ThemedText>
        ) : (
          squads.map((s, i) => (
            <BarRow key={s.squad} label={`Squad ${s.squad}`} value={s.posts} max={maxSquad} color={squadColor(s.squad)} delay={i * 100} />
          ))
        )}
      </Card>

      <Card title="Top contributors" subtitle="POSTS, THEN COMMENTS" delay={400}>
        {data.top_contributors.map((person, i) => (
          <View key={`${person.full_name}-${i}`} style={styles.person}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.rank}>
              {i + 1}
            </ThemedText>
            <Avatar name={person.full_name} squad={person.squad} size={32} />
            <ThemedText type="smallBold" style={styles.flex} numberOfLines={1}>
              {person.full_name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {person.posts} posts · {person.comments} comments
            </ThemedText>
          </View>
        ))}
      </Card>

      {extras && (
        <>
          <Card title="Profile details" subtitle="OUT OF MEMBERS WHO HAVE SIGNED IN" delay={480}>
            <BarRow label="Photo" value={extras.withPhoto} max={extras.joined} color={theme.primary} delay={0} valueLabel={`${extras.withPhoto}/${extras.joined}`} />
            <BarRow label="Phone" value={extras.withPhone} max={extras.joined} color={theme.primary} delay={80} valueLabel={`${extras.withPhone}/${extras.joined}`} />
            <BarRow label="Birthday" value={extras.withBirthday} max={extras.joined} color={theme.primary} delay={160} valueLabel={`${extras.withBirthday}/${extras.joined}`} />
          </Card>

          <Card title="Storage" subtitle="FREE PLAN: 1 GB" delay={560}>
            <BarRow
              label="Used"
              value={extras.storageBytes}
              max={STORAGE_LIMIT_BYTES}
              color={extras.storageBytes > STORAGE_LIMIT_BYTES * 0.8 ? theme.danger : theme.primary}
              delay={0}
              valueLabel={formatBytes(extras.storageBytes)}
            />
          </Card>

          <Card title="App errors" subtitle={extras.errors.length ? 'LATEST 10 · LONG-PRESS TO CLEAR ALL' : 'NONE REPORTED'} delay={640}>
            {extras.errors.map((e) => (
              <Pressable
                key={e.id}
                onLongPress={() =>
                  Alert.alert('Clear all app errors?', 'Do this after you have fixed them.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        await supabase.from('app_errors').delete().lte('created_at', new Date().toISOString());
                        load();
                      },
                    },
                  ])
                }
                style={styles.errorRow}>
                <ThemedText type="small" numberOfLines={2} style={e.fatal && { color: theme.danger }}>
                  {e.fatal ? 'CRASH: ' : ''}
                  {e.message}
                </ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {timeAgo(e.created_at)} · v{e.app_version ?? '?'} · {e.platform ?? 'unknown'}
                </ThemedText>
              </Pressable>
            ))}
          </Card>
        </>
      )}

      <ThemedText type="caption" themeColor="textSecondary" style={styles.footnote}>
        {data.totals.comments} COMMENTS · {data.totals.votes} LIKES IN TOTAL
      </ThemedText>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  flex: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  stat: {
    flexBasis: '47%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  barLabel: {
    width: 84,
  },
  barValue: {
    minWidth: 44,
    textAlign: 'right',
  },
  track: {
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  dailyWrap: {
    gap: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  readout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.sm,
  },
  columns: {
    height: 120,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
  },
  column: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
    gap: 2,
  },
  col: {
    flex: 1,
    minHeight: 2,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rank: {
    width: 16,
  },
  studentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  errorRow: {
    gap: 2,
  },
  footnote: {
    textAlign: 'center',
  },
});
