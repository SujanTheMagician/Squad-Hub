import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { NewVersionBanner } from '@/components/new-version-banner';
import { Colors, FontFamily } from '@/constants/theme';
import { usePushNavigation } from '@/lib/push';
import { SessionProvider, useSession } from '@/providers/session';

SplashScreen.preventAutoHideAsync();

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { session, isLoading, isAdmin, isModerator } = useSession();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];
  const ready = fontsLoaded && !isLoading;
  usePushNavigation(ready && !!session);

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
      <Stack.Protected guard={!!session}>
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
        <Stack.Protected guard={isModerator}>
          <Stack.Screen name="admin" options={{ title: isAdmin ? 'Admin tools' : 'Moderation' }} />
        </Stack.Protected>
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name="analytics" options={{ title: 'Batch analytics' }} />
        </Stack.Protected>
      </Stack.Protected>

      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false, animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
    <NewVersionBanner />
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
