import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect } from 'expo-router';
import type { ComponentProps } from 'react';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { MaxContentWidth, Radius, Spacing, TypeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { clearNotifications, fetchNotifications, markAllRead, markRead } from '@/lib/notifications';
import { timeAgo } from '@/lib/posts';
import type { AppNotification } from '@/lib/types';

const KIND_ICON: Record<AppNotification['kind'], { icon: ComponentProps<typeof Ionicons>['name']; color: string }> = {
  post: { icon: 'sparkles', color: TypeColors.resource },
  announcement: { icon: 'megaphone', color: TypeColors.project },
  comment: { icon: 'chatbubble-ellipses', color: TypeColors.note },
  event: { icon: 'calendar', color: TypeColors.idea },
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setItems(await fetchNotifications().catch(() => []));
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function open(item: AppNotification) {
    if (!item.read) {
      setItems((current) => current?.map((n) => (n.id === item.id ? { ...n, read: true } : n)) ?? null);
      markRead(item.id);
    }
    if (item.post_id) {
      router.push({ pathname: '/post/[id]', params: { id: item.post_id } });
    } else if (item.kind === 'event') {
      router.push('/events');
    } else if (item.kind === 'announcement') {
      router.navigate('/');
    }
  }

  const unread = items?.filter((n) => !n.read).length ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <PressableScale
              onPress={async () => {
                await (unread ? markAllRead() : clearNotifications());
                load();
              }}
              style={styles.headerButton}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {unread ? 'Mark all read' : 'Clear read'}
              </ThemedText>
            </PressableScale>
          ),
        }}
      />
      {items === null ? (
        <ActivityIndicator color={theme.primary} style={styles.loading} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
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
          renderItem={({ item, index }) => {
            const kind = KIND_ICON[item.kind];
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40).duration(350)}>
                <PressableScale
                  onPress={() => open(item)}
                  style={[
                    styles.item,
                    { backgroundColor: item.read ? theme.background : theme.backgroundElement, borderColor: theme.border },
                  ]}>
                  <View style={[styles.icon, { backgroundColor: `${kind.color}1F` }]}>
                    <Ionicons name={kind.icon} size={18} color={kind.color} />
                  </View>
                  <View style={styles.flex}>
                    <ThemedText type={item.read ? 'small' : 'smallBold'} numberOfLines={2}>
                      {item.title}
                    </ThemedText>
                    {!!item.body && (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {item.body}
                      </ThemedText>
                    )}
                    <ThemedText type="caption" themeColor="textSecondary">
                      {timeAgo(item.created_at)}
                    </ThemedText>
                  </View>
                  {!item.read && <View style={[styles.dot, { backgroundColor: theme.primary }]} />}
                </PressableScale>
              </Animated.View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="notifications-outline" size={32} color={theme.primary} />
              </View>
              <ThemedText themeColor="textSecondary" style={styles.centerText}>
                You&apos;re all caught up. New notes, projects, events, announcements and replies will show up here.
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    marginTop: Spacing.six,
  },
  list: {
    padding: Spacing.three,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  headerButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.one,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
