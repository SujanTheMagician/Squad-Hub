import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ChipGroup } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { TYPE_ICONS } from '@/components/post-card';
import { PressableScale } from '@/components/ui/pressable-scale';
import { MaxContentWidth, Radius, SquadColors, Spacing, TypeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { uploadFile } from '@/lib/posts';
import { supabase } from '@/lib/supabase';
import { POST_TYPE_LABELS, SQUADS, type PostType, type Squad } from '@/lib/types';
import { useSession } from '@/providers/session';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

// Doubts can be read here but are posted from 1.4.
const POST_TYPES = (Object.keys(POST_TYPE_LABELS) as PostType[]).filter((type) => type !== 'doubt');

/** 2x2 grid of post types; the selected one fills with its colour. */
function TypePicker({ value, onChange }: { value: PostType; onChange: (type: PostType) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.typeGrid}>
      {POST_TYPES.map((type) => {
        const selected = type === value;
        const color = TypeColors[type];
        return (
          <PressableScale
            key={type}
            onPress={() => onChange(type)}
            style={[
              styles.typeCard,
              selected
                ? { backgroundColor: color, borderColor: color }
                : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <Ionicons name={TYPE_ICONS[type]} size={22} color={selected ? '#FFFFFF' : color} />
            <ThemedText type="smallBold" style={{ color: selected ? '#FFFFFF' : theme.text }}>
              {POST_TYPE_LABELS[type]}
            </ThemedText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const SQUAD_OPTIONS: { value: Squad | null; label: string; color?: string }[] = [
  { value: null, label: 'All squads' },
  ...SQUADS.map((squad) => ({ value: squad, label: `Squad ${squad}`, color: SquadColors[squad] })),
];

const BODY_PLACEHOLDER: Record<PostType, string> = {
  note: 'What do these notes cover?',
  project: 'What does it do, what did you use, what did you learn?',
  idea: 'What is the idea, and who would you need to build it?',
  resource: 'Why is this useful?',
  doubt: 'What are you stuck on?',
};

export default function NewPostScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const params = useLocalSearchParams<{ type?: PostType }>();
  const [type, setType] = useState<PostType>(params.type ?? 'note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [squad, setSquad] = useState<Squad | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_FILE_BYTES) {
      Alert.alert('File too large', 'Files must be under 10 MB. Upload bigger files to Google Drive and paste the link instead.');
      return;
    }
    setFile(asset);
  }

  async function submit() {
    if (!session) return;
    setSaving(true);
    try {
      const filePath = file
        ? await uploadFile(session.user.id, { uri: file.uri, name: file.name, mimeType: file.mimeType })
        : null;
      const { error } = await supabase.from('posts').insert({
        type,
        title: title.trim(),
        body: body.trim(),
        subject: subject.trim() || null,
        tags: tags
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
        squad,
        link_url: linkUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        file_path: filePath,
        file_name: file?.name ?? null,
      });
      if (error) throw error;
      router.back();
    } catch (e) {
      Alert.alert('Could not post', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const canAttach = type === 'note' || type === 'resource' || type === 'project';

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TypePicker value={type} onChange={setType} />
        <TextField label="Title" value={title} onChangeText={setTitle} maxLength={140} placeholder="Give it a clear title" />
        {(type === 'note' || type === 'resource') && (
          <TextField label="Subject or module (optional)" value={subject} onChangeText={setSubject} placeholder="e.g. DSA, React, DBMS" />
        )}
        <TextField label="Description" value={body} onChangeText={setBody} multiline placeholder={BODY_PLACEHOLDER[type]} />
        {type === 'project' && (
          <TextField
            label="GitHub repository"
            value={githubUrl}
            onChangeText={setGithubUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://github.com/you/project"
          />
        )}
        <TextField
          label={type === 'project' ? 'Live demo link (optional)' : 'Link (optional): Drive, article, video'}
          value={linkUrl}
          onChangeText={setLinkUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://"
        />
        <TextField
          label="Tags (comma separated, optional)"
          value={tags}
          onChangeText={setTags}
          autoCapitalize="none"
          placeholder={type === 'project' ? 'react, supabase, ai' : 'exam, cheatsheet'}
        />

        {canAttach && (
          <PressableScale
            onPress={pickFile}
            style={[styles.attach, { borderColor: file ? theme.primary : theme.border, backgroundColor: theme.backgroundElement }]}>
            <Ionicons name={file ? 'document-attach' : 'cloud-upload-outline'} size={20} color={theme.primary} />
            <ThemedText type="small" style={styles.flex} numberOfLines={1}>
              {file ? file.name : type === 'project' ? 'Attach a screenshot (optional)' : 'Attach a PDF or image (max 10 MB)'}
            </ThemedText>
            {file && (
              <Pressable onPress={() => setFile(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </Pressable>
            )}
          </PressableScale>
        )}

        <View style={styles.section}>
          <ThemedText type="caption" themeColor="textSecondary">
            WHO IS THIS FOR?
          </ThemedText>
          <ChipGroup options={SQUAD_OPTIONS} value={squad} onChange={setSquad} />
        </View>

        <Button title="Share with the batch" icon="paper-plane" onPress={submit} loading={saving} disabled={!title.trim()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  typeCard: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
