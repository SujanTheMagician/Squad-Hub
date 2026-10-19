import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { AppNotification } from '@/lib/types';

export async function fetchNotifications() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, title, body, post_id, read, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as AppNotification[];
}

export async function markRead(id: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllRead() {
  await supabase.from('notifications').update({ read: true }).eq('read', false);
}

export async function clearNotifications() {
  await supabase.from('notifications').delete().eq('read', true);
}

async function fetchUnreadCount() {
  const { count } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false);
  return count ?? 0;
}

/** Unread count for the bell badge; updates live when a new notification arrives. */
export function useUnreadCount(userId: string | undefined) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    fetchUnreadCount().then(setCount);
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchUnreadCount().then(setCount);
    const subscription = supabase
      .channel(`notifications:${userId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId, refresh]);

  return { count, refresh };
}
