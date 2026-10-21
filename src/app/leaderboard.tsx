import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ChipGroup } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { MaxContentWidth, Radius, SquadColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchLeaderboard, type Leaderboard, type LeaderboardPerson } from '@/lib/profile';
import { useSession } from '@/providers/session';

type Period = 'week' | 'month' | 'all';
const PERIOD_DAYS: Record<Period, number | null> = { week: 7, month: 30, all: null };
const MEDALS = ['🥇', '🥈', '🥉'];

function PersonRow({ person, rank, mine }: { person: LeaderboardPerson; rank: number; mine: boolean }) {
  const theme = useTheme();
  const parts = [
    person.posts && `${person.posts} posts`,
    person.answers && `${person.answers} answers`,
    person.likes && `${person.likes} likes`,
    person.comments && `${person.comments} comments`,
  ].filter(Boolean);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(rank, 10) * 40).duration(350)}>
      <PressableScale
        onPress={() => router.push({ pathname: '/member/[id]', params: { id: person.id } })}
        style={[
          styles.row,
          { backgroundColor: mine ? theme.primarySoft : theme.backgroundElement, borderColor: mine ? theme.primary : theme.border },
        ]}>
        <ThemedText type="heading" style={styles.rank}>
          {MEDALS[rank - 1] ?? rank}
        </ThemedText>
        <Avatar name={person.full_name} squad={person.squad} uri={person.avatar_url} size={40} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {person.full_name}
            {person.squad ? <ThemedText type="small" themeColor="textSecondary">{`  ·  S${person.squad}`}</ThemedText> : null}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {parts.join(' · ')}
          </ThemedText>
        </View>
        <View style={styles.points}>
          <ThemedText type="heading" style={{ color: theme.primary }}>
            {person.points}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            PTS
          </ThemedText>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

export default function LeaderboardScreen() {
  const theme = useTheme();
  const { profile } = useSession();
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await fetchLeaderboard(PERIOD_DAYS[period]));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the leaderboard');
    } finally {
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      setData(null);
      load();
    }, [load]),
  );

  const maxSquad = Math.max(1, ...(data?.squads ?? []).map((s) => s.points));

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
      <ChipGroup
        options={[
          { value: 'week' as Period, label: 'This week' },
          { value: 'month' as Period, label: 'This month' },
          { value: 'all' as Period, label: 'All time' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <ThemedText type="caption" themeColor="textSecondary">
        POST 10 · ACCEPTED ANSWER 15 · LIKE RECEIVED 3 · COMMENT 1
      </ThemedText>

      {!data ? (
        error ? (
          <ThemedText themeColor="textSecondary">{error}</ThemedText>
        ) : (
          <ActivityIndicator color={theme.primary} style={styles.loading} />
        )
      ) : (
        <>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="heading">Squad battle</ThemedText>
            {data.squads.map((s) => (
              <View key={s.squad} style={styles.squadRow}>
                <ThemedText type="smallBold" style={styles.squadLabel}>
                  Squad {s.squad}
                </ThemedText>
                <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
                  <View style={[styles.fill, { width: `${Math.max(2, (s.points / maxSquad) * 100)}%`, backgroundColor: SquadColors[s.squad] }]} />
                </View>
                <ThemedText type="smallBold" style={styles.squadValue}>
                  {s.points}
                </ThemedText>
              </View>
            ))}
          </View>

          {data.people.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.textCenter}>
              No points yet for this period. Share a note or answer a doubt to get on the board!
            </ThemedText>
          ) : (
            data.people.map((person, i) => <PersonRow key={person.id} person={person} rank={i + 1} mine={person.id === profile?.id} />)
          )}
        </>
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
  loading: {
    marginTop: Spacing.five,
  },
  flex: {
    flex: 1,
  },
  textCenter: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    padding: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  rank: {
    width: 28,
    textAlign: 'center',
  },
  points: {
    alignItems: 'flex-end',
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  squadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  squadLabel: {
    width: 76,
  },
  squadValue: {
    minWidth: 44,
    textAlign: 'right',
  },
  track: {
    flex: 1,
    height: 12,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
