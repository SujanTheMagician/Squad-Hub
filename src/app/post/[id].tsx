import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { GitHubCard } from '@/components/github-card';
import { SquadPill, TYPE_ICONS } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Radius, Spacing, TypeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  acceptAnswer,
  addComment,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPost,
  getFileUrl,
  reportContent,
  setBookmark,
  setPinned,
  setVote,
  sharePost,
  timeAgo,
} from '@/lib/posts';
import { POST_TYPE_LABELS, type Comment, type FeedPost } from '@/lib/types';
import { useSession } from '@/providers/session';

/** Heart that pops when liked. */
function LikeButton({ voted, count, onPress }: { voted: boolean; count: number; onPress: () => void }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <PressableScale
      style={[styles.like, { backgroundColor: voted ? theme.primarySoft : theme.backgroundSelected }]}
      onPress={() => {
        if (!voted) {
          scale.set(withSequence(withSpring(1.4, { damping: 6, stiffness: 400 }), withSpring(1)));
        }
        onPress();
      }}>
      <Animated.View style={style}>
        <Ionicons name={voted ? 'heart' : 'heart-outline'} size={22} color={voted ? theme.primary : theme.text} />
      </Animated.View>
      <ThemedText type="smallBold" style={{ color: voted ? theme.primary : theme.text }}>
        {count}
      </ThemedText>
    </PressableScale>
  );
}

function askReport(onReport: (reason: string) => void) {
  Alert.alert('Report this?', 'Your Campus Manager will review it.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Spam or off-topic', onPress: () => onReport('spam') },
    { text: 'Inappropriate', onPress: () => onReport('inappropriate') },
  ]);
}

export default function PostScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, isModerator } = useSession();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextPost, nextComments] = await Promise.all([fetchPost(id), fetchComments(id)]);
      setPost(nextPost);
      setComments(nextComments);
    } catch {
      Alert.alert('Post not found', 'It may have been deleted.');
      router.back();
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!post) {
    return (
      <ThemedView style={styles.loading}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  const isAuthor = post.author_id === session?.user.id;
  const isDoubt = post.type === 'doubt';
  // The accepted answer goes to the top.
  const orderedComments = post.accepted_comment_id
    ? [...comments].sort((a, b) => Number(b.id === post.accepted_comment_id) - Number(a.id === post.accepted_comment_id))
    : comments;

  async function toggleAccepted(commentId: string) {
    if (!post) return;
    const next = post.accepted_comment_id === commentId ? null : commentId;
    setPost({ ...post, accepted_comment_id: next });
    await acceptAnswer(post.id, next).catch((e) => {
      Alert.alert('Could not update', e instanceof Error ? e.message : '');
      load();
    });
  }

  async function toggleVote() {
    if (!post) return;
    const voted = !post.voted;
    setPost({ ...post, voted, vote_count: post.vote_count + (voted ? 1 : -1) });
    await setVote(post.id, voted).catch(load);
  }

  async function toggleBookmark() {
    if (!post) return;
    setPost({ ...post, bookmarked: !post.bookmarked });
    await setBookmark(post.id, !post.bookmarked).catch(load);
  }

  async function openFile() {
    if (!post?.file_path) return;
    try {
      await openBrowserAsync(await getFileUrl(post.file_path));
    } catch (e) {
      Alert.alert('Could not open file', e instanceof Error ? e.message : '');
    }
  }

  async function sendComment() {
    setSending(true);
    try {
      await addComment(post!.id, draft.trim());
      setDraft('');
      setComments(await fetchComments(post!.id));
    } catch (e) {
      Alert.alert('Could not comment', e instanceof Error ? e.message : '');
    } finally {
      setSending(false);
    }
  }

  function confirmDelete() {
    Alert.alert('Delete this post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deletePost(post!);
          router.back();
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: POST_TYPE_LABELS[post.type] }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}>
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.duration(400)} style={styles.authorRow}>
            <PressableScale onPress={() => router.push({ pathname: '/member/[id]', params: { id: post.author_id } })}>
              <Avatar name={post.author_name} squad={post.author_squad} uri={post.author_avatar} size={44} />
            </PressableScale>
            <View style={styles.flex}>
              <View style={styles.inline}>
                <ThemedText type="smallBold">{post.author_name}</ThemedText>
                <SquadPill squad={post.author_squad} />
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {timeAgo(post.created_at)}
                {post.squad ? ` · for Squad ${post.squad}` : ' · for all squads'}
              </ThemedText>
            </View>
          </Animated.View>
          <View style={styles.inline}>
            <Chip label={POST_TYPE_LABELS[post.type]} icon={TYPE_ICONS[post.type]} color={TypeColors[post.type]} />
            {post.subject && <Chip label={post.subject} />}
          </View>
          <ThemedText type="subtitle" style={styles.title}>
            {post.title}
          </ThemedText>
          {!!post.body && <ThemedText>{post.body}</ThemedText>}

          {post.tags.length > 0 && (
            <View style={styles.tags}>
              {post.tags.map((tag) => (
                <Chip key={tag} label={`#${tag}`} />
              ))}
            </View>
          )}

          {post.github_url && <GitHubCard url={post.github_url} />}
          {post.link_url && (
            <Button title={post.type === 'project' ? 'Open live demo' : 'Open link'} icon="open-outline" variant="secondary" onPress={() => openBrowserAsync(post.link_url!)} />
          )}
          {post.file_path && (
            <Button title={`Open ${post.file_name ?? 'file'}`} icon="document-attach-outline" variant="secondary" onPress={openFile} />
          )}

          <View style={[styles.actions, { borderColor: theme.border }]}>
            <LikeButton voted={post.voted} count={post.vote_count} onPress={toggleVote} />
            <Pressable style={styles.action} onPress={toggleBookmark}>
              <Ionicons name={post.bookmarked ? 'bookmark' : 'bookmark-outline'} size={22} color={theme.primary} />
              <ThemedText type="small">{post.bookmarked ? 'Saved' : 'Save'}</ThemedText>
            </Pressable>
            <Pressable style={styles.action} onPress={() => sharePost(post)} accessibilityLabel="Share">
              <Ionicons name="share-social-outline" size={21} color={theme.primary} />
              <ThemedText type="small">Share</ThemedText>
            </Pressable>
            {isModerator && (
              <Pressable
                style={styles.action}
                onPress={async () => {
                  await setPinned(post.id, !post.pinned);
                  load();
                }}>
                <Ionicons name={post.pinned ? 'pin' : 'pin-outline'} size={22} color={theme.primary} />
                <ThemedText type="small">{post.pinned ? 'Unpin' : 'Pin'}</ThemedText>
              </Pressable>
            )}
            {!isAuthor && (
              <Pressable
                style={styles.action}
                onPress={() => askReport((reason) => reportContent({ postId: post.id }, reason).then(() => Alert.alert('Reported', 'Thanks for flagging it.')))}>
                <Ionicons name="flag-outline" size={20} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary">
                  Report
                </ThemedText>
              </Pressable>
            )}
            {(isAuthor || isModerator) && (
              <Pressable style={styles.action} onPress={confirmDelete}>
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
              </Pressable>
            )}
          </View>

          <ThemedText type="heading">
            {post.type === 'idea'
              ? 'Discussion · say "I want to build this!" to join'
              : isDoubt
                ? `Answers (${comments.length})`
                : `Comments (${comments.length})`}
          </ThemedText>
          {isDoubt && isAuthor && comments.length > 0 && !post.accepted_comment_id && (
            <ThemedText type="small" themeColor="textSecondary">
              Got your answer? Tap “Accept answer” on the one that solved it. They get 15 leaderboard points.
            </ThemedText>
          )}
          {orderedComments.map((comment) => (
            <Pressable
              key={comment.id}
              onLongPress={() => {
                const canDelete = comment.author_id === session?.user.id || isModerator;
                Alert.alert('Comment', undefined, [
                  { text: 'Cancel', style: 'cancel' },
                  canDelete
                    ? { text: 'Delete', style: 'destructive', onPress: () => deleteComment(comment.id).then(load) }
                    : { text: 'Report', onPress: () => askReport((reason) => reportContent({ commentId: comment.id }, reason)) },
                ]);
              }}
              style={styles.commentRow}>
              <Avatar name={comment.author?.full_name ?? 'Member'} squad={comment.author?.squad ?? null} uri={comment.author?.avatar_url} size={32} />
              <View
                style={[
                  styles.comment,
                  { backgroundColor: theme.backgroundElement, borderColor: comment.id === post.accepted_comment_id ? '#10B981' : theme.border },
                ]}>
              {comment.id === post.accepted_comment_id && (
                <View style={styles.action}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <ThemedText type="caption" style={styles.accepted}>
                    ACCEPTED ANSWER
                  </ThemedText>
                </View>
              )}
              <ThemedText type="smallBold">
                {comment.author?.full_name ?? 'Member'}
                <ThemedText type="small" themeColor="textSecondary">
                  {comment.author?.squad ? ` · Squad ${comment.author.squad}` : ''} · {timeAgo(comment.created_at)}
                </ThemedText>
              </ThemedText>
              <ThemedText type="small">{comment.body}</ThemedText>
              {isDoubt && isAuthor && comment.author_id !== session?.user.id && (
                <Pressable onPress={() => toggleAccepted(comment.id)} style={styles.action} hitSlop={6}>
                  <Ionicons
                    name={comment.id === post.accepted_comment_id ? 'close-circle-outline' : 'checkmark-circle-outline'}
                    size={16}
                    color={comment.id === post.accepted_comment_id ? theme.textSecondary : '#10B981'}
                  />
                  <ThemedText type="caption" style={{ color: comment.id === post.accepted_comment_id ? theme.textSecondary : '#10B981' }}>
                    {comment.id === post.accepted_comment_id ? 'UNDO ACCEPT' : 'ACCEPT ANSWER'}
                  </ThemedText>
                </Pressable>
              )}
              </View>
            </Pressable>
          ))}

          <TextField
            value={draft}
            onChangeText={setDraft}
            placeholder={isDoubt ? 'Write an answer' : 'Write a comment'}
            multiline
            style={styles.commentInput}
          />
          <Button title={isDoubt ? 'Answer' : 'Comment'} onPress={sendComment} loading={sending} disabled={!draft.trim()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  flex: {
    flex: 1,
  },
  inline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  like: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  comment: {
    flex: 1,
    padding: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    borderTopLeftRadius: Spacing.one,
    borderWidth: 1,
    gap: Spacing.one,
  },
  commentInput: {
    minHeight: 64,
  },
  accepted: {
    color: '#10B981',
  },
});
