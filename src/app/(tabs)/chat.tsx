import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandGradient, MaxContentWidth, Radius, SquadColors, Spacing, TabBarSpace } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CHANNEL_LABELS, channelsFor, fetchLatestMessages, fetchUnreadCounts } from '@/lib/chat';
import { timeAgo } from '@/lib/posts';
import type { ChatChannel, Message } from '@/lib/types';
import { useSession } from '@/providers/session';

function RoomIcon({ channel }: { channel: ChatChannel }) {
  if (channel === 'batch') {
    return (
      <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roomIcon}>
        <Ionicons name="people" size={24} color="#FFFFFF" />
      </LinearGradient>
    );
  }
  const color = SquadColors[Number(channel) as 91 | 92 | 93];
  return (
    <View style={[styles.roomIcon, { backgroundColor: `${color}22` }]}>
      <ThemedText type="heading" style={{ color }}>
        {channel}
      </ThemedText>
    </View>
  );
}

export default function ChatRoomsScreen() {
  const theme = useTheme();
  const { profile, isAdmin } = useSession();
  const [latest, setLatest] = useState<Map<ChatChannel, Message>>(new Map());
  const [unread, setUnread] = useState<Map<ChatChannel, number>>(new Map());
  const squad = profile?.squad ?? null;
  const profileId = profile?.id;
  const channels = channelsFor(squad, isAdmin);

  useFocusEffect(
    useCallback(() => {
      fetchLatestMessages().then(setLatest).catch(() => undefined);
      if (profileId) {
        fetchUnreadCounts(channelsFor(squad, isAdmin), profileId).then(setUnread).catch(() => undefined);
      }
    }, [squad, isAdmin, profileId]),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <ThemedText type="subtitle">Chat</ThemedText>
            <ThemedText themeColor="textSecondary">
              {isAdmin ? 'You can see every room as an admin.' : 'Talk with the whole batch or just your squad.'}
            </ThemedText>
          </Animated.View>

          {channels.map((channel, index) => {
            const last = latest.get(channel);
            const count = unread.get(channel) ?? 0;
            return (
              <Animated.View key={channel} entering={FadeInDown.delay(80 * (index + 1)).duration(450).springify()}>
                <PressableScale
                  onPress={() => router.push({ pathname: '/chat/[channel]', params: { channel } })}
                  style={[styles.room, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                  <RoomIcon channel={channel} />
                  <View style={styles.flex}>
                    <View style={styles.roomTop}>
                      <ThemedText type="heading" style={styles.flex}>
                        {CHANNEL_LABELS[channel]}
                      </ThemedText>
                      {last && (
                        <ThemedText type="caption" themeColor="textSecondary">
                          {timeAgo(last.created_at)}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {last
                        ? `${last.author?.full_name.split(' ')[0] ?? 'Someone'}: ${last.body}`
                        : channel === 'batch'
                          ? 'Everyone in Squads 91, 92 and 93'
                          : `Only Squad ${channel} members`}
                    </ThemedText>
                  </View>
                  {count > 0 ? (
                    <View style={[styles.unread, { backgroundColor: theme.primary }]}>
                      <ThemedText type="caption" style={styles.unreadText}>
                        {count > 99 ? '99+' : count}
                      </ThemedText>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
                  )}
                </PressableScale>
              </Animated.View>
            );
          })}
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
  room: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  roomIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unread: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
  },
  roomTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
