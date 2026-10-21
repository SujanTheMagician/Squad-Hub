import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { SquadPill } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { ChipGroup } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SquadSelector } from '@/components/ui/squad-selector';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo, type SquadFilter } from '@/lib/posts';
import { directoryCsv, fetchDirectory, formatBirthday, formatPhone } from '@/lib/profile';
import { ROLE_LABELS, type DirectoryMember } from '@/lib/types';
import { useSession } from '@/providers/session';

type JoinFilter = 'all' | 'joined' | 'pending';

function MemberRow({ member, showPrivate, index }: { member: DirectoryMember; showPrivate: boolean; index: number }) {
  const theme = useTheme();
  const details = [
    member.phone && formatPhone(member.phone),
    member.birthday && `🎂 ${formatBirthday(member.birthday)}`,
  ].filter(Boolean);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 30).duration(350)}>
      <PressableScale
        disabled={!member.id}
        onPress={() => member.id && router.push({ pathname: '/member/[id]', params: { id: member.id } })}
        style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, !member.joined && styles.pending]}>
        <Avatar name={member.full_name} squad={member.squad} uri={member.avatar_url} size={44} />
        <View style={styles.flex}>
          <View style={styles.inline}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.shrink}>
              {member.full_name}
            </ThemedText>
            <SquadPill squad={member.squad} />
          </View>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {member.role === 'student' ? member.email : `${ROLE_LABELS[member.role]} · ${member.email}`}
          </ThemedText>
          {showPrivate && details.length > 0 && (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {details.join('  ·  ')}
            </ThemedText>
          )}
          {showPrivate && (
            <ThemedText type="caption" style={{ color: member.joined ? theme.textSecondary : theme.danger }}>
              {!member.joined
                ? 'NOT SIGNED IN YET'
                : member.last_seen_at
                  ? `ACTIVE ${timeAgo(member.last_seen_at).toUpperCase()}`
                  : 'JOINED'}
            </ThemedText>
          )}
        </View>
        {showPrivate && member.phone ? (
          <PressableScale
            onPress={() => Linking.openURL(`tel:${member.phone}`)}
            hitSlop={8}
            style={[styles.call, { backgroundColor: theme.primarySoft }]}
            accessibilityLabel={`Call ${member.full_name}`}>
            <Ionicons name="call" size={16} color={theme.primary} />
          </PressableScale>
        ) : (
          member.id && <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        )}
      </PressableScale>
    </Animated.View>
  );
}

export default function StudentsScreen() {
  const theme = useTheme();
  const { isAdmin } = useSession();
  const [members, setMembers] = useState<DirectoryMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [squad, setSquad] = useState<SquadFilter>('all');
  const [joinFilter, setJoinFilter] = useState<JoinFilter>('all');

  const load = useCallback(async () => {
    try {
      setMembers(await fetchDirectory());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the students list');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (members ?? []).filter(
      (m) =>
        (squad === 'all' || m.squad === squad) &&
        (joinFilter === 'all' || (joinFilter === 'joined') === m.joined) &&
        (!term ||
          m.full_name.toLowerCase().includes(term) ||
          m.email.includes(term) ||
          m.skills.some((skill) => skill.toLowerCase().includes(term)) ||
          (m.phone ?? '').includes(term.replace(/\s/g, ''))),
    );
  }, [members, search, squad, joinFilter]);

  const joinedCount = members?.filter((m) => m.joined).length ?? 0;

  async function exportList() {
    await Share.share({ title: 'Squad Hub students', message: directoryCsv(visible) });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {isAdmin && (
        <Stack.Screen
          options={{
            headerRight: () => (
              <PressableScale onPress={exportList} hitSlop={8} accessibilityLabel="Export as CSV">
                <Ionicons name="share-outline" size={22} color={theme.primary} />
              </PressableScale>
            ),
          }}
        />
      )}
      <FlatList
        data={visible}
        keyExtractor={(m) => m.id ?? m.email}
        renderItem={({ item, index }) => <MemberRow member={item} showPrivate={isAdmin} index={index} />}
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
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText themeColor="textSecondary">
              {members === null
                ? 'Loading…'
                : isAdmin
                  ? `${joinedCount} of ${members.length} people have signed in. Phone numbers and birthdays are only visible to you and the Campus Manager.`
                  : `${members.length} members of Squads 91, 92 and 93.`}
            </ThemedText>
            <TextField icon="search" value={search} onChangeText={setSearch} placeholder="Search by name, email or skill" autoCapitalize="none" />
            <SquadSelector value={squad} onChange={setSquad} />
            {isAdmin && (
              <ChipGroup
                options={[
                  { value: 'all' as JoinFilter, label: 'Everyone' },
                  { value: 'joined' as JoinFilter, label: 'Signed in', icon: 'checkmark-circle-outline' },
                  { value: 'pending' as JoinFilter, label: 'Not yet', icon: 'time-outline' },
                ]}
                value={joinFilter}
                onChange={setJoinFilter}
              />
            )}
            {members !== null && (
              <ThemedText type="caption" themeColor="textSecondary">
                SHOWING {visible.length}
              </ThemedText>
            )}
          </View>
        }
        ListEmptyComponent={
          members === null && !error ? (
            <ActivityIndicator color={theme.primary} style={styles.empty} />
          ) : (
            <ThemedText themeColor="textSecondary" style={[styles.empty, styles.center]}>
              {error ?? 'Nobody matches that search.'}
            </ThemedText>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  pending: {
    opacity: 0.7,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  shrink: {
    flexShrink: 1,
  },
  call: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    marginTop: Spacing.five,
  },
  center: {
    textAlign: 'center',
  },
});
