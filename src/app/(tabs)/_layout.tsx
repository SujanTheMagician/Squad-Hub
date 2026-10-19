import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: Record<string, { title: string; icon: IconName; activeIcon: IconName }> = {
  index: { title: 'Home', icon: 'home-outline', activeIcon: 'home' },
  notes: { title: 'Notes', icon: 'book-outline', activeIcon: 'book' },
  projects: { title: 'Projects', icon: 'rocket-outline', activeIcon: 'rocket' },
  ideas: { title: 'Ideas', icon: 'bulb-outline', activeIcon: 'bulb' },
  chat: { title: 'Chat', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles' },
  profile: { title: 'Me', icon: 'person-outline', activeIcon: 'person' },
};

/** Floating tab bar: every tab shows its label; the active one gets a sliding pill behind its icon. */
function FloatingTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border, shadowColor: theme.shadow }]}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;

          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.title}
              scaleTo={0.9}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  navigateToTab(route.key);
                }
              }}
              style={styles.item}>
              <View style={styles.pillSlot}>
                {focused && (
                  <Animated.View entering={ZoomIn.springify().damping(16)} style={[styles.pill, { backgroundColor: theme.primarySoft }]} />
                )}
                <Ionicons
                  name={focused ? tab.activeIcon : tab.icon}
                  size={21}
                  color={focused ? theme.primary : theme.textSecondary}
                />
              </View>
              <ThemedText
                type="caption"
                numberOfLines={1}
                style={[styles.label, { color: focused ? theme.primary : theme.textSecondary }]}>
                {tab.title}
              </ThemedText>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="ideas" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 520,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  pillSlot: {
    width: 52,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.pill,
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.2,
  },
});
