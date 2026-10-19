import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

export default function EditProfileScreen() {
  const { profile, refreshProfile } = useSession();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [skills, setSkills] = useState(profile?.skills.join(', ') ?? '');
  const [github, setGithub] = useState(profile?.github ?? '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin ?? '');
  const [leetcode, setLeetcode] = useState(profile?.leetcode ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        skills: skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        github: github.trim().replace(/^@/, '') || null,
        linkedin: linkedin.trim() || null,
        leetcode: leetcode.trim() || null,
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    await refreshProfile();
    router.back();
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TextField label="Name" value={fullName} onChangeText={setFullName} />
        <TextField label="Bio" value={bio} onChangeText={setBio} multiline placeholder="What are you learning or building?" />
        <TextField label="Skills (comma separated)" value={skills} onChangeText={setSkills} placeholder="React, Node, Figma" />
        <TextField label="GitHub username" value={github} onChangeText={setGithub} autoCapitalize="none" />
        <TextField label="LinkedIn profile URL" value={linkedin} onChangeText={setLinkedin} autoCapitalize="none" keyboardType="url" />
        <TextField label="LeetCode username" value={leetcode} onChangeText={setLeetcode} autoCapitalize="none" />
        <Button title="Save" onPress={save} loading={saving} disabled={!fullName.trim()} />
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
});
