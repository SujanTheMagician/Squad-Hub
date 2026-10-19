import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';

import { BrandLogo } from '@/components/brand';
import { EventCard } from '@/components/event-card';
import { PostList } from '@/components/post-list';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandGradient, FontFamily, Radius, SquadColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchUpcomingEvents } from '@/lib/events';
import { useUnreadCount } from '@/lib/notifications';
import { fetchAnnouncements, timeAgo } from '@/lib/posts';
import type { Announcement, BatchEvent } from '@/lib/types';
import { useSession } from '@/providers/session';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Hero() {
  const { profile } = useSession();
  const { count: unread } = useUnreadCount(profile?.id);
  const firstName = profile?.full_name.split(' ')[0] ?? 'there';

  return (
    <Animated.View entering={FadeInDown.duration(500).springify()}>
      <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={[styles.heroCircle, styles.heroCircleLarge]} />
        <View style={[styles.heroCircle, styles.heroCircleSmall]} />
        <View style={styles.heroTop}>
          <BrandLogo size={36} />
          <ThemedText type="smallBold" style={styles.heroBrand}>
            Squad Hub
          </ThemedText>
          <View style={styles.flex} />
          <PressableScale onPress={() => router.push('/about')} style={styles.heroIcon} accessibilityLabel="About Squad Hub">
            <Ionicons name="information-circle-outline" size={22} color="#FFFFFF" />
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/notifications')}
            style={styles.heroIcon}
            accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
            <Ionicons name={unread ? 'notifications' : 'notifications-outline'} size={21} color="#FFFFFF" />
            {unread > 0 && (
              <Animated.View entering={ZoomIn.springify()} style={styles.badge}>
                <ThemedText style={styles.badgeText}>{unread > 99 ? '99+' : unread}</ThemedText>
              </Animated.View>
            )}
          </PressableScale>
        </View>
        <ThemedText style={styles.heroGreeting}>{greeting()},</ThemedText>
        <ThemedText type="subtitle" style={styles.heroName}>
          {firstName}
        </ThemedText>
        <View style={styles.squadRow}>
          {([91, 92, 93] as const).map((squad) => (
            <View key={squad} style={styles.squadTag}>
              <View style={[styles.squadDot, { backgroundColor: SquadColors[squad] }]} />
              <ThemedText type="caption" style={styles.squadTagText}>
                SQUAD {squad}
              </ThemedText>
            </View>
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function Upcoming() {
  const theme = useTheme();
  const [events, setEvents] = useState<BatchEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchUpcomingEvents(2).then(setEvents).catch(() => setEvents([]));
    }, []),
  );

  return (
    <View style={styles.section}>
      <PressableScale onPress={() => router.push('/events')} style={styles.sectionTitle}>
        <Ionicons name="calendar" size={16} color={theme.primary} />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
          COMING UP
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.primary }}>
          SEE ALL
        </ThemedText>
        <Ionicons name="chevron-forward" size={14} color={theme.primary} />
      </PressableScale>
      {events.length === 0 ? (
        <PressableScale
          onPress={() => router.push('/events')}
          style={[styles.noEvents, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            No deadlines yet. Tap to open the calendar.
          </ThemedText>
        </PressableScale>
      ) : (
        events.map((event) => (
          <PressableScale key={event.id} onPress={() => router.push('/events')}>
            <EventCard event={event} />
          </PressableScale>
        ))
      )}
    </View>
  );
}

function Announcements() {
  const theme = useTheme();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchAnnouncements(5).then(setAnnouncements).catch(() => setAnnouncements([]));
    }, []),
  );

  if (announcements.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionTitle}>
        <Ionicons name="megaphone" size={16} color={theme.primary} />
        <ThemedText type="caption" themeColor="textSecondary">
          FROM YOUR CAMPUS MANAGER
        </ThemedText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={292}
        decelerationRate="fast"
        contentContainerStyle={styles.carousel}>
        {announcements.map((announcement, index) => (
          <Animated.View
            key={announcement.id}
            entering={FadeInRight.delay(index * 80).duration(400)}
            style={[styles.announcement, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.announcementBar, { backgroundColor: theme.primary }]} />
            <ThemedText type="smallBold" numberOfLines={2}>
              {announcement.title}
            </ThemedText>
            {!!announcement.body && (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
                {announcement.body}
              </ThemedText>
            )}
            <ThemedText type="caption" themeColor="textSecondary" style={styles.announcementTime}>
              {timeAgo(announcement.created_at)}
            </ThemedText>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <PostList
      title="Home"
      newPostType="note"
      emptyIcon="sparkles-outline"
      emptyText="Nothing shared yet. Tap + to post the first note, project or idea."
      hero={<Hero />}
      header={
        <>
          <Upcoming />
          <Announcements />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  hero: {
    borderRadius: Radius.lg + 6,
    padding: Spacing.four,
    gap: Spacing.one,
    overflow: 'hidden',
  },
  heroCircle: {
    position: 'absolute',
    backgroundColor: '#FFFFFF18',
    borderRadius: 999,
  },
  heroCircleLarge: {
    width: 220,
    height: 220,
    right: -70,
    top: -80,
  },
  heroCircleSmall: {
    width: 120,
    height: 120,
    right: 40,
    bottom: -60,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  heroBrand: {
    color: '#FFFFFF',
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#E3262E',
    fontSize: 11,
    lineHeight: 14,
    fontFamily: FontFamily.extrabold,
  },
  heroGreeting: {
    color: '#FFFFFFD9',
  },
  heroName: {
    color: '#FFFFFF',
  },
  squadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
  squadTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    backgroundColor: '#FFFFFF26',
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  squadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  squadTagText: {
    color: '#FFFFFF',
  },
  section: {
    gap: Spacing.two,
  },
  noEvents: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: Spacing.three,
    alignItems: 'center',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  carousel: {
    gap: Spacing.two + Spacing.one,
    paddingRight: Spacing.three,
  },
  announcement: {
    width: 280,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    paddingLeft: Spacing.three + Spacing.two,
    gap: Spacing.one,
    overflow: 'hidden',
  },
  announcementBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  announcementTime: {
    marginTop: Spacing.one,
  },
});
