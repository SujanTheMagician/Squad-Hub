import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { EventCard } from '@/components/event-card';
import { PostCard, SquadPill } from '@/components/post-card';
import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchPosts } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import type { BatchEvent, FeedPost, Squad } from '@/lib/types';

type Person = { id: string; full_name: string; squad: Squad | null; avatar_url: string | null; skills: string[] };
type Results = { people: Person[]; posts: FeedPost[]; events: BatchEvent[] };

async function searchEverything(term: string): Promise<Results> {
  const safe = term.replace(/[%,()]/g, ' ');
  const [people, posts, events] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, squad, avatar_url, skills')
      .or(`full_name.ilike.%${safe}%,bio.ilike.%${safe}%`)
      .order('full_name')
      .limit(10),
    fetchPosts({ search: term }),
    supabase
      .from('events')
      .select('id, title, description, kind, squad, starts_at')
      .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
      .order('starts_at', { ascending: false })
      .limit(5),
  ]);
  return {
    people: (people.data ?? []) as Person[],
    posts: posts.slice(0, 20),
    events: (events.data ?? []) as BatchEvent[],
  };
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText type="caption" themeColor="textSecondary">
        {title} ({count})
      </ThemedText>
      {children}
    </View>
  );
}

/** One search box for people, posts and events. Searches as you type, after a short pause. */
export default function SearchScreen() {
  const theme = useTheme();
  const [term, setTerm] = useState('');
  const [found, setFound] = useState<{ query: string; results: Results } | null>(null);
  const query = term.trim();

  useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      searchEverything(query)
        .catch(() => ({ people: [], posts: [], events: [] }))
        .then((results) => !cancelled && setFound({ query, results }));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Results only count while they match what's in the box.
  const results = query.length >= 2 && found?.query === query ? found.results : null;
  const loading = query.length >= 2 && !results;

  const total = results ? results.people.length + results.posts.length + results.events.length : 0;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TextField
        icon="search"
        value={term}
        onChangeText={setTerm}
        placeholder="People, notes, projects, doubts, events"
        autoFocus
        returnKeyType="search"
      />
      {loading && <ActivityIndicator color={theme.primary} />}
      {!loading && results && total === 0 && (
        <ThemedText themeColor="textSecondary" style={styles.textCenter}>
          Nothing found for “{term.trim()}”.
        </ThemedText>
      )}
      {!results && !loading && (
        <ThemedText themeColor="textSecondary" style={styles.textCenter}>
          Try a name, a subject like “DBMS”, or a skill like “React”.
        </ThemedText>
      )}
      {results && (
        <>
          <Section title="PEOPLE" count={results.people.length}>
            {results.people.map((person) => (
              <PressableScale
                key={person.id}
                onPress={() => router.push({ pathname: '/member/[id]', params: { id: person.id } })}
                style={[styles.person, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
                <Avatar name={person.full_name} squad={person.squad} uri={person.avatar_url} size={36} />
                <View style={styles.flex}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {person.full_name}
                  </ThemedText>
                  {person.skills.length > 0 && (
                    <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                      {person.skills.join(' · ')}
                    </ThemedText>
                  )}
                </View>
                <SquadPill squad={person.squad} />
              </PressableScale>
            ))}
          </Section>
          <Section title="POSTS" count={results.posts.length}>
            {results.posts.map((post, index) => (
              <PostCard key={post.id} post={post} index={index} />
            ))}
          </Section>
          <Section title="EVENTS" count={results.events.length}>
            {results.events.map((event) => (
              <PressableScale key={event.id} onPress={() => router.push('/events')}>
                <EventCard event={event} />
              </PressableScale>
            ))}
          </Section>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  textCenter: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - Spacing.one,
    padding: Spacing.three - Spacing.one,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  flex: {
    flex: 1,
  },
});
