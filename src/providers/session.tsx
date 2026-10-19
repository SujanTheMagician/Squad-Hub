import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useState, type PropsWithChildren } from 'react';

import { registerForPush } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

// push_token is not readable by members, so list the columns explicitly.
const PROFILE_COLUMNS = 'id, email, full_name, squad, role, bio, skills, github, linkedin, leetcode';

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).single();
    setProfile(data as Profile | null);
    if (data) {
      // Fire and forget: push needs FCM set up, and the app works fine without it.
      registerForPush(userId);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      // Supabase warns against awaiting other Supabase calls inside this callback.
      setTimeout(() => loadProfile(nextSession?.user.id), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const value: SessionContextValue = {
    session,
    profile,
    isLoading,
    // Admin and Campus Manager have the same powers.
    isAdmin: profile?.role === 'admin' || profile?.role === 'campus_manager',
    isModerator: profile?.role === 'admin' || profile?.role === 'campus_manager' || profile?.role === 'squad_lead',
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}
