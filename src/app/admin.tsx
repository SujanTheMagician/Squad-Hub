import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { SQUADS, type Role, type Squad } from '@/lib/types';
import { useSession } from '@/providers/session';

type Report = {
  id: string;
  reason: string;
  created_at: string;
  post_id: string | null;
  comment_id: string | null;
  post: { title: string } | null;
  comment: { body: string; post_id: string } | null;
  reporter: { full_name: string } | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </View>
  );
}

function AnnouncementForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  async function post() {
    setSaving(true);
    const { error } = await supabase.from('announcements').insert({ title: title.trim(), body: body.trim() });
    setSaving(false);
    if (error) {
      Alert.alert('Could not post', error.message);
      return;
    }
    setTitle('');
    setBody('');
    Alert.alert('Posted', 'It now shows at the top of everyone’s feed.');
  }

  return (
    <Section title="Post an announcement">
      <TextField value={title} onChangeText={setTitle} placeholder="Title" />
      <TextField value={body} onChangeText={setBody} placeholder="Details (optional)" multiline />
      <Button title="Announce" onPress={post} loading={saving} disabled={!title.trim()} />
    </Section>
  );
}

const SQUAD_OPTIONS: { value: Squad | null; label: string }[] = [
  { value: null, label: 'No squad' },
  ...SQUADS.map((squad) => ({ value: squad, label: `Squad ${squad}` })),
];

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'student', label: 'Student' },
  { value: 'squad_lead', label: 'Squad lead' },
  { value: 'campus_manager', label: 'Campus Manager' },
  { value: 'admin', label: 'Admin' },
];

function AllowlistForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [squad, setSquad] = useState<Squad | null>(91);
  const [role, setRole] = useState<Role>('student');
  const [count, setCount] = useState<number | null>(null);

  const loadCount = useCallback(async () => {
    const { count: total } = await supabase.from('allowed_emails').select('*', { count: 'exact', head: true });
    setCount(total);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCount();
    }, [loadCount]),
  );

  async function add() {
    const { error } = await supabase
      .from('allowed_emails')
      .insert({ email: email.trim().toLowerCase(), full_name: fullName.trim(), squad, role });
    if (error) {
      Alert.alert('Could not add', error.message);
      return;
    }
    setEmail('');
    setFullName('');
    loadCount();
  }

  return (
    <Section title={`Members allowed to sign in${count === null ? '' : ` (${count})`}`}>
      <TextField value={fullName} onChangeText={setFullName} placeholder="Full name" />
      <TextField value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />
      <ChipGroup options={SQUAD_OPTIONS} value={squad} onChange={setSquad} />
      <ChipGroup options={ROLE_OPTIONS} value={role} onChange={setRole} />
      <Button title="Add member" onPress={add} disabled={!email.includes('@') || !fullName.trim()} />
    </Section>
  );
}

function Reports() {
  const [reports, setReports] = useState<Report[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('id, reason, created_at, post_id, comment_id, post:posts(title), comment:comments(body, post_id), reporter:profiles(full_name)')
      .eq('resolved', false)
      .order('created_at', { ascending: false });
    setReports((data ?? []) as unknown as Report[]);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function resolve(id: string) {
    await supabase.from('reports').update({ resolved: true }).eq('id', id);
    load();
  }

  return (
    <Section title={`Open reports (${reports.length})`}>
      {reports.length === 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          Nothing to review.
        </ThemedText>
      )}
      {reports.map((report) => {
        const postId = report.post_id ?? report.comment?.post_id;
        return (
          <View key={report.id} style={styles.report}>
            <ThemedText type="small">
              {report.post ? `Post: ${report.post.title}` : `Comment: ${report.comment?.body ?? '(deleted)'}`}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {report.reason} · by {report.reporter?.full_name ?? 'member'} · {timeAgo(report.created_at)}
            </ThemedText>
            <View style={styles.row}>
              {postId && (
                <Button
                  title="View"
                  variant="secondary"
                  style={styles.flex}
                  onPress={() => router.push({ pathname: '/post/[id]', params: { id: postId } })}
                />
              )}
              <Button title="Mark resolved" style={styles.flex} onPress={() => resolve(report.id)} />
            </View>
          </View>
        );
      })}
    </Section>
  );
}

export default function AdminScreen() {
  const { isAdmin } = useSession();

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isAdmin && <Button title="Open batch analytics" icon="stats-chart" variant="secondary" onPress={() => router.push('/analytics')} />}
        {isAdmin && <AnnouncementForm />}
        <Reports />
        {isAdmin && <AllowlistForm />}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  report: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
