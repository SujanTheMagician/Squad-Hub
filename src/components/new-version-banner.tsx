import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Install page for the Squad Hub 1.4 APK (EAS internal distribution). */
const DOWNLOAD_URL = 'https://expo.dev/accounts/bigil/projects/squad-hub/builds/17047d06-6779-4444-9d29-2a4f2bb63c83';

/**
 * Shown on 1.3 installs only: 1.4 adds native code (photos, push), so it can't arrive over the air.
 * Tapping opens the download page; the cross hides it until the app is next opened.
 */
export function NewVersionBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <Animated.View entering={SlideInUp.springify().damping(18)} style={[styles.wrapper, { top: insets.top + Spacing.two }]}>
      <View style={[styles.banner, { backgroundColor: theme.text, shadowColor: theme.shadow }]}>
        <PressableScale onPress={() => Linking.openURL(DOWNLOAD_URL)} style={styles.main} accessibilityLabel="Download Squad Hub 1.4">
          <Ionicons name="cloud-download" size={20} color={theme.primary} />
          <View style={styles.text}>
            <ThemedText type="smallBold" style={{ color: theme.background }}>
              Squad Hub 1.4 is out
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.background, opacity: 0.8 }}>
              Photos, students list, doubts, leaderboard and notifications. Tap to download.
            </ThemedText>
          </View>
        </PressableScale>
        <PressableScale onPress={() => setHidden(true)} hitSlop={10} accessibilityLabel="Hide for now">
          <Ionicons name="close" size={18} color={theme.background} />
        </PressableScale>
      </View>
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
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
  },
  text: {
    flex: 1,
  },
});
