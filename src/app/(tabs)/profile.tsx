import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { PostCard } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandGradient, MaxContentWidth, Radius, SquadColors, Spacing, TabBarSpace } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPosts } from '@/lib/posts';
import { ROLE_LABELS, type FeedPost } from '@/lib/types';
import { useSession } from '@/providers/session';

type ListKind = 'mine' | 'saved';

function MenuRow({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <PressableScale onPress={onPress} style={[styles.menuRow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={[styles.menuIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <ThemedText type="smallBold" style={styles.flex}>
        {label}
      </ThemedText>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </PressableScale>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { profile, isModerator, isAdmin, signOut } = useSession();
  const [list, setList] = useState<ListKind>('mine');
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      fetchPosts(list === 'mine' ? { authorId: profile.id } : { bookmarkedOnly: true })
        .then(setPosts)
        .catch(() => setPosts([]));
    }, [list, profile]),
  );

  if (!profile) {
    return null;
  }

  const squadColor = profile.squad ? SquadColors[profile.squad] : theme.primary;
  const links = [
    profile.github && { label: 'GitHub', icon: 'logo-github' as const, url: `https://github.com/${profile.github}` },
    profile.linkedin && { label: 'LinkedIn', icon: 'logo-linkedin' as const, url: profile.linkedin },
    profile.leetcode && { label: 'LeetCode', icon: 'code-slash' as const, url: `https://leetcode.com/u/${profile.leetcode}` },
  ].filter((link) => !!link);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500).springify()} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} />
            <View style={styles.avatarRing}>
              <PressableScale
                onPress={() => router.push('/edit-profile')}
                accessibilityLabel="Edit profile photo"
                style={[styles.avatarBorder, { backgroundColor: theme.backgroundElement }]}>
                <Avatar name={profile.full_name} squad={profile.squad} uri={profile.avatar_url} size={84} />
              </PressableScale>
            </View>
            <View style={styles.identity}>
              <ThemedText type="subtitle" style={styles.center}>
                {profile.full_name}
              </ThemedText>
              <View style={styles.badges}>
                <Chip label={ROLE_LABELS[profile.role]} color={theme.primary} icon="shield-checkmark" />
                {profile.squad && <Chip label={`Squad ${profile.squad}`} color={squadColor} icon="people" />}
              </View>
              {profile.bio && (
                <ThemedText themeColor="textSecondary" style={styles.center}>
                  {profile.bio}
                </ThemedText>
              )}
              {profile.skills.length > 0 && (
                <View style={styles.badges}>
                  {profile.skills.map((skill) => (
                    <Chip key={skill} label={skill} />
                  ))}
                </View>
              )}
              {links.length > 0 && (
                <View style={styles.badges}>
                  {links.map((link) => (
                    <Chip key={link.label} label={link.label} icon={link.icon} onPress={() => openBrowserAsync(link.url)} />
                  ))}
                </View>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.menu}>
            <MenuRow icon="create-outline" label="Edit profile" onPress={() => router.push('/edit-profile')} />
            <MenuRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
            <MenuRow icon="calendar-outline" label="Deadlines & events" onPress={() => router.push('/events')} />
            <MenuRow icon="people-outline" label={isAdmin ? 'Students list' : 'Batch members'} onPress={() => router.push('/students')} />
            <MenuRow icon="trophy-outline" label="Leaderboard" onPress={() => router.push('/leaderboard')} />
            {isAdmin && <MenuRow icon="stats-chart-outline" label="Batch analytics" onPress={() => router.push('/analytics')} />}
            {isModerator && (
              <MenuRow icon="shield-outline" label={isAdmin ? 'Admin tools' : 'Moderation'} onPress={() => router.push('/admin')} />
            )}
            <MenuRow icon="lock-closed-outline" label="Privacy & account" onPress={() => router.push('/privacy')} />
            <MenuRow icon="information-circle-outline" label="About Squad Hub" onPress={() => router.push('/about')} />
          </Animated.View>

          <ChipGroup
            options={[
              { value: 'mine' as ListKind, label: 'My posts', icon: 'albums-outline' },
              { value: 'saved' as ListKind, label: 'Saved', icon: 'bookmark-outline' },
            ]}
            value={list}
            onChange={setList}
          />
          {posts.length === 0 ? (
            <ThemedText themeColor="textSecondary">
              {list === 'mine' ? "You haven't posted yet." : 'Tap Save on any post to keep it here.'}
            </ThemedText>
          ) : (
            posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)
          )}

          <Button title="Sign out" icon="log-out-outline" variant="ghost" onPress={signOut} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: TabBarSpace + Spacing.four,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.lg + 6,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: Spacing.four,
  },
  cover: {
    height: 110,
  },
  avatarRing: {
    alignItems: 'center',
    marginTop: -48,
  },
  avatarBorder: {
    padding: 5,
    borderRadius: 50,
  },
  identity: {
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.two,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  menu: {
    gap: Spacing.two,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
