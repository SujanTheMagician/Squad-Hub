import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Switch, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { TextField } from '@/components/ui/text-field';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchPrivateProfile,
  formatBirthday,
  formatPhone,
  normalizePhone,
  pickAndUploadAvatar,
  removeAvatar,
  toIsoDate,
} from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

const DEFAULT_BIRTHDAY = new Date(2005, 0, 1);

function PhotoPicker() {
  const theme = useTheme();
  const { profile, refreshProfile } = useSession();
  const [busy, setBusy] = useState(false);

  if (!profile) return null;

  async function change(source: 'library' | 'camera' | 'remove') {
    if (!profile) return;
    setBusy(true);
    try {
      if (source === 'remove') {
        await removeAvatar(profile.id);
      } else if (!(await pickAndUploadAvatar(profile.id, source))) {
        return;
      }
      await refreshProfile();
    } catch (e) {
      Alert.alert('Could not update photo', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function choose() {
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose from gallery', onPress: () => change('library') },
      { text: 'Take a photo', onPress: () => change('camera') },
      ...(profile?.avatar_url ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => change('remove') }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  return (
    <PressableScale onPress={choose} disabled={busy} style={styles.photo} accessibilityLabel="Change profile photo">
      <View>
        <Avatar name={profile.full_name} squad={profile.squad} uri={profile.avatar_url} size={96} />
        <View style={[styles.photoBadge, { backgroundColor: theme.primary, borderColor: theme.background }]}>
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="camera" size={16} color="#FFFFFF" />}
        </View>
      </View>
      <ThemedText type="smallBold" style={{ color: theme.primary }}>
        {profile.avatar_url ? 'Change photo' : 'Add a photo'}
      </ThemedText>
    </PressableScale>
  );
}

function BirthdayField({ value, onChange }: { value: Date | null; onChange: (date: Date | null) => void }) {
  const theme = useTheme();
  const [showIosPicker, setShowIosPicker] = useState(false);

  function open() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? DEFAULT_BIRTHDAY,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date);
        },
      });
    } else {
      setShowIosPicker((shown) => !shown);
    }
  }

  return (
    <View style={styles.field}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
        BIRTHDAY
      </ThemedText>
      <PressableScale onPress={open} style={[styles.dateBox, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Ionicons name="gift-outline" size={18} color={theme.textSecondary} />
        <ThemedText style={styles.flex} themeColor={value ? 'text' : 'textSecondary'}>
          {value ? formatBirthday(toIsoDate(value)) : 'Pick your birthday'}
        </ThemedText>
        {value && (
          <PressableScale onPress={() => onChange(null)} hitSlop={8} accessibilityLabel="Clear birthday">
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </PressableScale>
        )}
      </PressableScale>
      {showIosPicker && (
        <DateTimePicker
          value={value ?? DEFAULT_BIRTHDAY}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          onChange={(_, date) => date && onChange(date)}
        />
      )}
    </View>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={styles.flex}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {hint}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.primary, false: theme.backgroundSelected }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

/**
 * Name, photo, phone, birthday, bio, skills, links and alert settings.
 * `compact` keeps it to the essentials for the first-sign-in welcome screen.
 */
export function ProfileForm({ compact, submitLabel = 'Save', onSaved }: { compact?: boolean; submitLabel?: string; onSaved: () => void }) {
  const theme = useTheme();
  const { profile, refreshProfile } = useSession();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [skills, setSkills] = useState(profile?.skills.join(', ') ?? '');
  const [github, setGithub] = useState(profile?.github ?? '');
  const [linkedin, setLinkedin] = useState(profile?.linkedin ?? '');
  const [leetcode, setLeetcode] = useState(profile?.leetcode ?? '');
  const [notifyPosts, setNotifyPosts] = useState(profile?.notify_posts ?? true);
  const [notifyChat, setNotifyChat] = useState(profile?.notify_chat ?? true);
  const [celebrate, setCelebrate] = useState(profile?.celebrate_birthday ?? true);
  const [loadingPrivate, setLoadingPrivate] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPrivateProfile()
      .then((details) => {
        if (details.phone) setPhone(formatPhone(details.phone));
        if (details.birthday) {
          const [year, month, day] = details.birthday.split('-').map(Number);
          setBirthday(new Date(year, month - 1, day));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrivate(false));
  }, []);

  const phoneValue = phone.trim() ? normalizePhone(phone) : null;
  const phoneInvalid = !!phone.trim() && !phoneValue;

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phoneValue,
        birthday: birthday ? toIsoDate(birthday) : null,
        bio: bio.trim() || null,
        celebrate_birthday: celebrate,
        onboarded_at: profile.onboarded_at ?? new Date().toISOString(),
        ...(compact
          ? {}
          : {
              skills: skills
                .split(',')
                .map((skill) => skill.trim())
                .filter(Boolean),
              github: github.trim().replace(/^@/, '') || null,
              linkedin: linkedin.trim() || null,
              leetcode: leetcode.trim() || null,
              notify_posts: notifyPosts,
              notify_chat: notifyChat,
            }),
      })
      .eq('id', profile.id);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    await refreshProfile();
    onSaved();
  }

  if (loadingPrivate) {
    return <ActivityIndicator color={theme.primary} style={styles.loading} />;
  }

  return (
    <View style={styles.form}>
      <PhotoPicker />
      <TextField label="Name" value={fullName} onChangeText={setFullName} maxLength={60} />
      <View style={styles.field}>
        <TextField
          label="Mobile number"
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="98765 43210"
          maxLength={16}
        />
        <ThemedText type="caption" style={[styles.hint, { color: phoneInvalid ? theme.danger : theme.textSecondary }]}>
          {phoneInvalid ? 'Enter a 10-digit Indian mobile number.' : 'Only the Admin and Campus Manager can see this.'}
        </ThemedText>
      </View>
      <View style={styles.field}>
        <BirthdayField value={birthday} onChange={setBirthday} />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.hint}>
          Only the Admin and Campus Manager can see the full date.
        </ThemedText>
      </View>
      <Toggle
        label="Let the batch wish me"
        hint="On your birthday, everyone gets a reminder to wish you (the year stays hidden)."
        value={celebrate}
        onChange={setCelebrate}
      />
      <TextField label="Bio" value={bio} onChangeText={setBio} multiline placeholder="What are you learning or building?" />

      {!compact && (
        <>
          <TextField label="Skills (comma separated)" value={skills} onChangeText={setSkills} placeholder="React, Node, Figma" />
          <TextField label="GitHub username" value={github} onChangeText={setGithub} autoCapitalize="none" />
          <TextField label="LinkedIn profile URL" value={linkedin} onChangeText={setLinkedin} autoCapitalize="none" keyboardType="url" />
          <TextField label="LeetCode username" value={leetcode} onChangeText={setLeetcode} autoCapitalize="none" />

          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="caption" themeColor="textSecondary">
              PHONE ALERTS
            </ThemedText>
            <Toggle label="New posts" hint="Notes, projects, ideas and doubts" value={notifyPosts} onChange={setNotifyPosts} />
            <Toggle label="Chat messages" hint="Batch and squad rooms" value={notifyChat} onChange={setNotifyChat} />
            <ThemedText type="caption" themeColor="textSecondary">
              Announcements, events, replies and app updates always come through.
            </ThemedText>
          </View>
        </>
      )}

      <Button title={submitLabel} onPress={save} loading={saving} disabled={!fullName.trim() || phoneInvalid} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.three,
  },
  loading: {
    marginTop: Spacing.five,
  },
  flex: {
    flex: 1,
  },
  photo: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  photoBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: {
    gap: Spacing.one,
  },
  label: {
    marginLeft: Spacing.one,
  },
  hint: {
    marginLeft: Spacing.one,
  },
  dateBox: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
