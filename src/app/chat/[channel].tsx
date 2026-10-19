import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandGradient, FontFamily, MaxContentWidth, Radius, SquadColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CHANNEL_LABELS, deleteMessage, markChannelRead, sendMessage, useChannelMessages } from '@/lib/chat';
import { ROLE_LABELS, type ChatChannel, type Message } from '@/lib/types';
import { useSession } from '@/providers/session';

function time(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function Bubble({ message, mine, showAuthor, onLongPress }: { message: Message; mine: boolean; showAuthor: boolean; onLongPress: () => void }) {
  const theme = useTheme();
  const squad = message.author?.squad ?? null;
  const nameColor = squad ? SquadColors[squad] : theme.primary;
  const role = message.author?.role;

  if (mine) {
    return (
      <Animated.View entering={FadeInUp.duration(250)} style={styles.mineRow}>
        <Pressable onLongPress={onLongPress} style={styles.mineWrap}>
          <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.mineBubble]}>
            <ThemedText type="small" style={styles.mineText}>
              {message.body}
            </ThemedText>
            <ThemedText type="caption" style={styles.mineTime}>
              {time(message.created_at)}
            </ThemedText>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.duration(250)} style={styles.theirRow}>
      <View style={styles.avatarSlot}>
        {showAuthor && <Avatar name={message.author?.full_name ?? 'Member'} squad={squad} size={30} />}
      </View>
      <Pressable
        onLongPress={onLongPress}
        style={[styles.bubble, styles.theirBubble, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        {showAuthor && (
          <ThemedText type="caption" style={{ color: nameColor }}>
            {message.author?.full_name ?? 'Member'}
            {role === 'admin' || role === 'campus_manager' ? ` · ${ROLE_LABELS[role]}` : squad ? ` · S${squad}` : ''}
          </ThemedText>
        )}
        <ThemedText type="small">{message.body}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" style={styles.theirTime}>
          {time(message.created_at)}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export default function ChatRoomScreen() {
  const theme = useTheme();
  const { channel } = useLocalSearchParams<{ channel: ChatChannel }>();
  const { session, isModerator } = useSession();
  const { messages, loading } = useChannelMessages(channel);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  // Everything visible here counts as read.
  useEffect(() => {
    markChannelRead(channel);
  }, [channel, messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setDraft('');
    try {
      await sendMessage(channel, body);
    } catch (e) {
      setDraft(body);
      Alert.alert('Not sent', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  }

  function options(message: Message) {
    const canDelete = message.author_id === session?.user.id || isModerator;
    if (!canDelete) return;
    Alert.alert('Delete message?', message.body, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(message.id) },
    ]);
  }

  const accent = channel === 'batch' ? theme.primary : SquadColors[Number(channel) as 91 | 92 | 93];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <PressableScale onPress={() => router.back()} style={styles.back} accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </PressableScale>
          <View style={[styles.headerDot, { backgroundColor: accent }]} />
          <View style={styles.flex}>
            <ThemedText type="heading">{CHANNEL_LABELS[channel]}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {channel === 'batch' ? 'SQUADS 91 · 92 · 93' : `SQUAD ${channel} ONLY`}
            </ThemedText>
          </View>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {loading ? (
            <ActivityIndicator color={theme.primary} style={styles.flex} />
          ) : (
            <FlatList
              inverted
              data={messages}
              keyExtractor={(message) => message.id}
              contentContainerStyle={styles.list}
              renderItem={({ item, index }) => {
                // Inverted list: the visually previous message is the next item.
                const previous = messages[index + 1];
                const showAuthor = !previous || previous.author_id !== item.author_id;
                return (
                  <Bubble
                    message={item}
                    mine={item.author_id === session?.user.id}
                    showAuthor={showAuthor}
                    onLongPress={() => options(item)}
                  />
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="chatbubbles-outline" size={40} color={theme.textSecondary} />
                  <ThemedText themeColor="textSecondary">No messages yet. Say hi!</ThemedText>
                </View>
              }
            />
          )}

          <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Message"
              placeholderTextColor={theme.textSecondary}
              multiline
              maxLength={2000}
              style={[styles.input, { backgroundColor: theme.backgroundElement, borderColor: theme.border, color: theme.text }]}
            />
            <PressableScale onPress={send} disabled={!draft.trim() || sending} scaleTo={0.88} style={!draft.trim() && styles.dim}>
              <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.send}>
                <Ionicons name="send" size={18} color="#FFFFFF" />
              </LinearGradient>
            </PressableScale>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    padding: Spacing.one,
  },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.one,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    // The list is inverted, so flip the empty state back upright.
    transform: [{ scaleY: -1 }],
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    gap: 2,
  },
  mineRow: {
    alignItems: 'flex-end',
    marginTop: Spacing.one,
  },
  mineWrap: {
    maxWidth: '78%',
  },
  mineBubble: {
    maxWidth: '100%',
    borderBottomRightRadius: Spacing.one,
  },
  mineText: {
    color: '#FFFFFF',
  },
  mineTime: {
    color: '#FFFFFFB3',
    alignSelf: 'flex-end',
    fontSize: 10,
  },
  theirRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  avatarSlot: {
    width: 30,
  },
  theirBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: Spacing.one,
  },
  theirTime: {
    alignSelf: 'flex-end',
    fontSize: 10,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 15,
    fontFamily: FontFamily.medium,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    opacity: 0.5,
  },
});
