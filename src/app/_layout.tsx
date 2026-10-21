import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { UpdateBanner } from '@/components/update-banner';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { installErrorReporting, reportError } from '@/lib/errors';
import { usePushNavigation } from '@/lib/push';
import { SessionProvider, useSession } from '@/providers/session';

SplashScreen.preventAutoHideAsync();
installErrorReporting();

/** Shown instead of a crashed screen; the error is logged for the Admin. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <View style={[styles.error, { backgroundColor: colors.background }]}>
      <ThemedText type="subtitle">Something went wrong</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.center}>
        The Admin has been told about it. Try again, and if it keeps happening, restart the app.
      </ThemedText>
      <Button title="Try again" icon="refresh" onPress={retry} />
    </View>
  );
}

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, profile, isLoading, isAdmin, isModerator } = useSession();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const ready = fontsLoaded && !isLoading;
  // New members (and existing ones, once after this update) add their photo and details first.
  const needsWelcome = !!profile && !profile.onboarded_at;
  usePushNavigation(ready && !!session && !needsWelcome);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontFamily: FontFamily.bold, fontSize: 17 },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}>
        <Stack.Protected guard={!!session && !needsWelcome}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ title: '' }} />
          <Stack.Screen
            name="new-post"
            options={{ title: 'Share with the batch', presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="edit-profile" options={{ title: 'Edit profile' }} />
          <Stack.Screen name="about" options={{ title: 'About Squad Hub' }} />
          <Stack.Screen name="chat/[channel]" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="events" options={{ title: 'Deadlines & events' }} />
          <Stack.Screen name="students" options={{ title: 'Students' }} />
          <Stack.Screen name="member/[id]" options={{ title: '' }} />
          <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
          <Stack.Screen name="search" options={{ title: 'Search' }} />
          <Stack.Screen name="privacy" options={{ title: 'Privacy & account' }} />
          <Stack.Protected guard={isModerator}>
            <Stack.Screen name="admin" options={{ title: isAdmin ? 'Admin tools' : 'Moderation' }} />
          </Stack.Protected>
          <Stack.Protected guard={isAdmin}>
            <Stack.Screen name="analytics" options={{ title: 'Batch analytics' }} />
          </Stack.Protected>
        </Stack.Protected>

        <Stack.Protected guard={!!session && needsWelcome}>
          <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
      {session && <UpdateBanner />}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const base = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, primary: colors.primary, background: colors.background, card: colors.background },
      }}>
      <SessionProvider>
        {/* If a font fails to load, carry on with the system font rather than hanging on the splash. */}
        <RootNavigator fontsLoaded={fontsLoaded || !!fontError} />
      </SessionProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  center: {
    textAlign: 'center',
  },
});
