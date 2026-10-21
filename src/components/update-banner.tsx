import Ionicons from '@expo/vector-icons/Ionicons';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const CHECK_EVERY_MS = 30 * 60 * 1000;
let lastCheck = 0;

/** Downloads a new update in the background (on launch and when the app comes back), then offers a one-tap restart. */
export function UpdateBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (!Updates.isEnabled) return;
    const check = async () => {
      if (Date.now() - lastCheck < CHECK_EVERY_MS) return;
      lastCheck = Date.now();
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) await Updates.fetchUpdateAsync();
      } catch {
        // Offline or the update server is unreachable; try again next time.
      }
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  if (!isUpdatePending) return null;

  return (
    <Animated.View entering={SlideInUp.springify().damping(18)} style={[styles.wrapper, { top: insets.top + Spacing.two }]}>
      <PressableScale
        onPress={() => Updates.reloadAsync()}
        accessibilityLabel="Restart to update Squad Hub"
        style={[styles.banner, { backgroundColor: theme.text, shadowColor: theme.shadow }]}>
        <Ionicons name="sparkles" size={18} color={theme.background} />
        <ThemedText type="smallBold" style={[styles.text, { color: theme.background }]}>
          A new version of Squad Hub is ready
        </ThemedText>
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          Restart
        </ThemedText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  text: {
    flex: 1,
  },
});
