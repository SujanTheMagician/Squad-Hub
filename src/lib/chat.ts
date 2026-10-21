import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { ChatChannel, Message, Squad } from '@/lib/types';

const MESSAGE_SELECT = 'id, channel, author_id, body, created_at, author:profiles(full_name, squad, role, avatar_url)';

export const CHANNEL_LABELS: Record<ChatChannel, string> = {
  batch: 'Whole batch',
  '91': 'Squad 91',
  '92': 'Squad 92',
  '93': 'Squad 93',
};

/** Rooms a member can open: the batch room, their own squad, and every squad for admins. */
export function channelsFor(squad: Squad | null, isAdmin: boolean): ChatChannel[] {
  if (isAdmin) return ['batch', '91', '92', '93'];
  return squad ? ['batch', String(squad) as ChatChannel] : ['batch'];
}

export async function sendMessage(channel: ChatChannel, body: string) {
  const { error } = await supabase.from('messages').insert({ channel, body });
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchLatestMessages() {
  // Newest message per room, for the room list previews.
  const { data } = await supabase.from('messages').select(MESSAGE_SELECT).order('created_at', { ascending: false }).limit(200);
  const latest = new Map<ChatChannel, Message>();
  for (const message of (data ?? []) as unknown as Message[]) {
    if (!latest.has(message.channel)) latest.set(message.channel, message);
  }
  return latest;
}

async function fetchMessages(channel: ChatChannel) {
  const { data } = await supabase
    .from('messages')
    .select(MESSAGE_SELECT)
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(150);
  return (data ?? []) as unknown as Message[];
}

/** Messages in a room, newest first, kept live with Supabase Realtime. */
export function useChannelMessages(channel: ChatChannel) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages(channel).then((initial) => {
      setMessages(initial);
      setLoading(false);
    });
    const subscription = supabase
      .channel(`messages:${channel}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel=eq.${channel}` },
        async (payload) => {
          // The realtime row has no author join, so fetch the full message.
          const { data } = await supabase.from('messages').select(MESSAGE_SELECT).eq('id', payload.new.id).single();
          if (data) {
            const message = data as unknown as Message;
            setMessages((current) => (current.some((m) => m.id === message.id) ? current : [message, ...current]));
          }
        },
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((current) => current.filter((m) => m.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channel]);

  return { messages, loading };
}

// Last time this phone opened each room, so the room list can show unread counts.
const lastReadKey = (channel: ChatChannel) => `squadhub.chat.lastRead.${channel}`;

export function markChannelRead(channel: ChatChannel) {
  localStorage.setItem(lastReadKey(channel), new Date().toISOString());
}

function lastRead(channel: ChatChannel) {
  const stored = localStorage.getItem(lastReadKey(channel));
  if (stored) return stored;
  // First run: don't count the whole history as unread.
  markChannelRead(channel);
  return new Date().toISOString();
}

export async function fetchUnreadCounts(channels: ChatChannel[], myId: string) {
  const counts = await Promise.all(
    channels.map(async (channel) => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel', channel)
        .neq('author_id', myId)
        .gt('created_at', lastRead(channel));
      return [channel, count ?? 0] as const;
    }),
  );
  return new Map<ChatChannel, number>(counts);
}
