import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

// Show notifications as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Asks for permission, gets this device's Expo push token and saves it for the signed-in member.
 * Silently does nothing on emulators, when permission is denied, or before FCM is configured.
 */
export async function registerForPush() {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      // Android 13+ only shows the permission prompt once a channel exists.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Squad Hub',
        // eslint-disable-next-line import/namespace -- re-exported through a nested `export *`; tsc resolves it.
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 150, 200],
        lightColor: '#E3262E',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    const status = existing.granted ? existing.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    // One row per device, so members signed in on two phones get alerts on both.
    const { error } = await supabase.rpc('register_push_token', { new_token: token });
    if (error) throw error;
    deviceToken = token;
  } catch (error) {
    console.log('[push] registration skipped:', error instanceof Error ? error.message : error);
  }
}

let deviceToken: string | null = null;

/** Stops alerts to this phone; call before signing out so the next person doesn't get them. */
export async function unregisterForPush() {
  if (!deviceToken) return;
  await supabase.rpc('unregister_push_token', { old_token: deviceToken });
  deviceToken = null;
}

/** Opens the screen a tapped notification points at (its data.url). */
export function usePushNavigation(enabled: boolean) {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!enabled || !lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }
    const url = lastResponse.notification.request.content.data?.url;
    if (typeof url === 'string') {
      router.push(url as Href);
    }
  }, [enabled, lastResponse]);
}
