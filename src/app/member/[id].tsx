import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { PostCard } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { MaxContentWidth, Radius, SquadColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPosts, timeAgo } from '@/lib/posts';
import { fetchDirectory, formatBirthday, formatPhone } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { ROLE_LABELS, type DirectoryMember, type FeedPost, type Profile } from '@/lib/types';
import { useSession } from '@/providers/session';

type PublicProfile = Pick<
  Profile,
  'id' | 'email' | 'full_name' | 'squad' | 'role' | 'bio' | 'skills' | 'github' | 'linkedin' | 'leetcode' | 'avatar_url'
>;

export default function MemberScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isAdmin } = useSession();
  const [member, setMember] = useState<PublicProfile | null>(null);
  const [details, setDetails] = useState<DirectoryMember | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [missing, setMissing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (id === session?.user.id) {
        // Your own profile lives on the Me tab, where you can edit it.
        router.replace('/profile');
        return;
      }
      supabase
        .from('profiles')
        .select('id, email, full_name, squad, role, bio, skills, github, linkedin, leetcode, avatar_url')
        .eq('id', id)
        .single()
        .then(({ data }) => (data ? setMember(data as PublicProfile) : setMissing(true)));
      fetchPosts({ authorId: id }).then(setPosts).catch(() => setPosts([]));
      if (isAdmin) {
        fetchDirectory()
          .then((all) => setDetails(all.find((m) => m.id === id) ?? null))
          .catch(() => {});
      }
    }, [id, isAdmin, session?.user.id]),
  );

  if (!member) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        {missing ? <ThemedText themeColor="textSecondary">This member could not be found.</ThemedText> : <ActivityIndicator color={theme.primary} />}
      </View>
    );
  }

  const squadColor = member.squad ? SquadColors[member.squad] : theme.primary;
  const links = [
    member.github && { label: 'GitHub', icon: 'logo-github' as const, url: `https://github.com/${member.github}` },
    member.linkedin && { label: 'LinkedIn', icon: 'logo-linkedin' as const, url: member.linkedin },
    member.leetcode && { label: 'LeetCode', icon: 'code-slash' as const, url: `https://leetcode.com/u/${member.leetcode}` },
  ].filter((link) => !!link);

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: member.full_name.split(' ')[0] }} />
      <Animated.View entering={FadeInDown.duration(400)} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Avatar name={member.full_name} squad={member.squad} uri={member.avatar_url} size={96} />
        <ThemedText type="subtitle" style={styles.textCenter}>
          {member.full_name}
        </ThemedText>
        <View style={styles.badges}>
          <Chip label={ROLE_LABELS[member.role]} color={theme.primary} icon="shield-checkmark" />
          {member.squad && <Chip label={`Squad ${member.squad}`} color={squadColor} icon="people" />}
        </View>
        {member.bio && (
          <ThemedText themeColor="textSecondary" style={styles.textCenter}>
            {member.bio}
          </ThemedText>
        )}
        {member.skills.length > 0 && (
          <View style={styles.badges}>
            {member.skills.map((skill) => (
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
        <Chip label="Send email" icon="mail-outline" onPress={() => Linking.openURL(`mailto:${member.email}`)} />
      </Animated.View>

      {isAdmin && details && (
        <Animated.View
          entering={FadeInDown.delay(80).duration(400)}
          style={[styles.private, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.inline}>
            <Ionicons name="lock-closed" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary">
              ONLY ADMIN & CAMPUS MANAGER SEE THIS
            </ThemedText>
          </View>
          <ThemedText type="small">
            📱 {details.phone ? formatPhone(details.phone) : 'No phone number yet'}
          </ThemedText>
          <ThemedText type="small">🎂 {details.birthday ? formatBirthday(details.birthday) : 'No birthday yet'}</ThemedText>
          <ThemedText type="small">
            🕒 {details.last_seen_at ? `Last active ${timeAgo(details.last_seen_at)}` : 'Not active since this update'}
          </ThemedText>
          {details.phone && (
            <View style={styles.badges}>
              <Chip label="Call" icon="call" color={theme.primary} onPress={() => Linking.openURL(`tel:${details.phone}`)} />
              <Chip
                label="WhatsApp"
                icon="logo-whatsapp"
                color="#25D366"
                onPress={() => Linking.openURL(`https://wa.me/${details.phone!.replace('+', '')}`)}
              />
            </View>
          )}
        </Animated.View>
      )}

      <ThemedText type="heading">Posts ({posts.length})</ThemedText>
      {posts.length === 0 ? (
        <ThemedText themeColor="textSecondary">Nothing shared yet.</ThemedText>
      ) : (
        posts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg + 6,
    borderWidth: 1,
  },
  textCenter: {
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  private: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
