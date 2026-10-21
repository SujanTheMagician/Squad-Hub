import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, SquadColors, Spacing, TypeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/posts';
import { POST_TYPE_LABELS, type FeedPost, type PostType, type Squad } from '@/lib/types';

export const TYPE_ICONS: Record<PostType, ComponentProps<typeof Ionicons>['name']> = {
  note: 'document-text',
  project: 'rocket',
  idea: 'bulb',
  resource: 'link',
  doubt: 'help-circle',
};

export function SquadPill({ squad }: { squad: Squad | null }) {
  const color = squad ? SquadColors[squad] : null;
  const theme = useTheme();
  return (
    <View style={[styles.squadPill, { backgroundColor: color ? `${color}22` : theme.primarySoft }]}>
      <ThemedText type="caption" style={{ color: color ?? theme.primary }}>
        {squad ? `S${squad}` : 'CM'}
      </ThemedText>
    </View>
  );
}

export function PostCard({ post, index = 0 }: { post: FeedPost; index?: number }) {
  const theme = useTheme();
  const typeColor = TypeColors[post.type];

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(450).springify()}>
      <PressableScale
        onPress={() => router.push({ pathname: '/post/[id]', params: { id: post.id } })}
        style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={styles.header}>
          <Avatar name={post.author_name} squad={post.author_squad} uri={post.author_avatar} size={36} />
          <View style={styles.flex}>
            <View style={styles.row}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.shrink}>
                {post.author_name}
              </ThemedText>
              <SquadPill squad={post.author_squad} />
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {timeAgo(post.created_at)}
              {post.squad ? ` · for Squad ${post.squad}` : ''}
            </ThemedText>
          </View>
          {post.pinned && <Ionicons name="pin" size={16} color={theme.primary} />}
        </View>

        <View style={styles.row}>
          <View style={[styles.typeBadge, { backgroundColor: `${typeColor}1F` }]}>
            <Ionicons name={TYPE_ICONS[post.type]} size={12} color={typeColor} />
            <ThemedText type="caption" style={{ color: typeColor }}>
              {POST_TYPE_LABELS[post.type].toUpperCase()}
            </ThemedText>
          </View>
          {post.type === 'doubt' && (
            <View style={[styles.typeBadge, { backgroundColor: post.accepted_comment_id ? '#10B9811F' : theme.backgroundSelected }]}>
              <Ionicons
                name={post.accepted_comment_id ? 'checkmark-circle' : 'time-outline'}
                size={12}
                color={post.accepted_comment_id ? '#10B981' : theme.textSecondary}
              />
              <ThemedText type="caption" style={{ color: post.accepted_comment_id ? '#10B981' : theme.textSecondary }}>
                {post.accepted_comment_id ? 'SOLVED' : 'OPEN'}
              </ThemedText>
            </View>
          )}
          {post.subject && (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.shrink}>
              {post.subject}
            </ThemedText>
          )}
        </View>

        <ThemedText type="heading" numberOfLines={2}>
          {post.title}
        </ThemedText>
        {!!post.body && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {post.body}
          </ThemedText>
        )}

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={styles.stat}>
            <Ionicons name={post.voted ? 'heart' : 'heart-outline'} size={17} color={post.voted ? theme.primary : theme.textSecondary} />
            <ThemedText type="smallBold" themeColor="textSecondary">
              {post.vote_count}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.textSecondary} />
            <ThemedText type="smallBold" themeColor="textSecondary">
              {post.comment_count}
            </ThemedText>
          </View>
          <View style={styles.flex} />
          {post.github_url && <Ionicons name="logo-github" size={16} color={theme.textSecondary} />}
          {post.file_path && <Ionicons name="document-attach-outline" size={16} color={theme.textSecondary} />}
          {post.link_url && <Ionicons name="open-outline" size={16} color={theme.textSecondary} />}
          {post.bookmarked && <Ionicons name="bookmark" size={16} color={theme.primary} />}
        </View>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.two,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  squadPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.pill,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two + Spacing.one,
    marginTop: Spacing.one,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
