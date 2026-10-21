import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteMyAccount } from '@/lib/profile';
import { useSession } from '@/providers/session';

const CONTACT_EMAIL = 'sujan.anandh.s93@kalvium.community';

const SECTIONS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string }[] = [
  {
    icon: 'person-circle-outline',
    title: 'What we store',
    text: 'Your Kalvium email, name, squad and role (from the batch list), plus anything you add: photo, bio, skills, profile links, mobile number and birthday. We also store what you post, comment and send in chat, and when you last opened the app.',
  },
  {
    icon: 'eye-outline',
    title: 'Who can see it',
    text: 'Only signed-in members of Squads 91, 92 and 93 can open the app. Your name, photo, squad, bio, skills and links are visible to them. Your mobile number, full birthday and last-active time are visible only to you, the Admin and the Campus Manager. Squad chats are visible only to that squad (and the Admin / CM).',
  },
  {
    icon: 'notifications-outline',
    title: 'Notifications',
    text: 'If you allow notifications, we save a push token for each phone you sign in on. Signing out removes it. You can mute post and chat alerts in Edit profile.',
  },
  {
    icon: 'bug-outline',
    title: 'Error reports',
    text: 'When the app hits an error, it saves the error message, app version and phone type so the Admin can fix it. No messages or files are included.',
  },
  {
    icon: 'server-outline',
    title: 'Where it lives',
    text: 'Data is stored in Supabase (Postgres database and file storage). Push notifications go through Expo and Google Firebase. Nothing is sold or shared with anyone else, and there are no ads or trackers.',
  },
];

export default function PrivacyScreen() {
  const theme = useTheme();
  const { profile } = useSession();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (!profile) return;
    setDeleting(true);
    try {
      await deleteMyAccount(profile.id);
    } catch (e) {
      setDeleting(false);
      Alert.alert('Could not delete your account', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, posts, comments, chat messages and files. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you absolutely sure?', 'Everything you shared will be gone for good.', [
              { text: 'Keep my account', style: 'cancel' },
              { text: 'Delete forever', style: 'destructive', onPress: remove },
            ]),
        },
      ],
    );
  }

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <ThemedText themeColor="textSecondary">
        Squad Hub is a private app for the Kalvium @ AMET batch. Here is what it keeps about you, and how to remove it.
      </ThemedText>
      {SECTIONS.map((section) => (
        <View key={section.title} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={styles.inline}>
            <Ionicons name={section.icon} size={20} color={theme.primary} />
            <ThemedText type="smallBold">{section.title}</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {section.text}
          </ThemedText>
        </View>
      ))}
      <Button
        title="Questions? Email the Admin"
        icon="mail-outline"
        variant="secondary"
        onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=Squad%20Hub%20privacy`)}
      />

      <View style={[styles.card, styles.danger, { borderColor: theme.danger }]}>
        <ThemedText type="smallBold" style={{ color: theme.danger }}>
          Delete account
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Removes your login, profile, photo, posts, comments, chat messages and uploaded files. Your email stays on the batch
          list, so you can sign in again later with a fresh profile.
        </ThemedText>
        <Button title="Delete my account" icon="trash-outline" variant="danger" onPress={confirmDelete} loading={deleting} />
      </View>
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
  card: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  danger: {
    marginTop: Spacing.three,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
