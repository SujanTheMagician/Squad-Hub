import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

let lastReport = 0;

/** Saves an error to the app_errors table so the Admin / CM can see it in Analytics. Never throws. */
export async function reportError(error: unknown, fatal = false) {
  // Don't flood the table if something fails in a loop.
  if (Date.now() - lastReport < 5000) return;
  lastReport = Date.now();
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    const err = error instanceof Error ? error : new Error(String(error));
    await supabase.from('app_errors').insert({
      message: err.message.slice(0, 2000) || 'Unknown error',
      stack: err.stack?.slice(0, 8000) ?? null,
      fatal,
      app_version: Constants.expoConfig?.version ?? null,
      platform: `${Platform.OS} ${Platform.Version}`,
    });
  } catch {
    // Reporting is best effort.
  }
}

let installed = false;

/** Reports uncaught JavaScript errors, then lets React Native handle them as usual. */
export function installErrorReporting() {
  if (installed || typeof ErrorUtils === 'undefined') return;
  installed = true;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, !!isFatal);
    previous(error, isFatal);
  });
}
