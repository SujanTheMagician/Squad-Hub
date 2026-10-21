import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand';
import { ProfileForm } from '@/components/profile-form';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { BrandGradient, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';

/**
 * Shown once after a member's first sign-in (and once to existing members after this update),
 * so the students list fills up with photos, phone numbers and birthdays.
 */
export default function WelcomeScreen() {
  const theme = useTheme();
  const { profile, refreshProfile } = useSession();
  const [skipping, setSkipping] = useState(false);
  const firstName = profile?.full_name.split(' ')[0] ?? 'there';

  // Leaving the screen happens on its own: once onboarded_at is set, the root layout swaps in the tabs.
  async function skip() {
    if (!profile) return;
    setSkipping(true);
    const { error } = await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', profile.id);
    setSkipping(false);
    if (error) {
      Alert.alert('Something went wrong', error.message);
      return;
    }
    await refreshProfile();
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <BrandLogo size={40} />
              <ThemedText type="subtitle" style={styles.white}>
                Welcome, {firstName}!
              </ThemedText>
              <ThemedText style={styles.whiteSoft}>
                Add a photo and a few details so your squad can find you. It takes 30 seconds.
              </ThemedText>
            </LinearGradient>
          </Animated.View>
          <ProfileForm compact submitLabel="Save and continue" onSaved={() => {}} />
          <Button title="Skip for now" variant="ghost" onPress={skip} loading={skipping} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  hero: {
    borderRadius: Radius.lg + 6,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  white: {
    color: '#FFFFFF',
  },
  whiteSoft: {
    color: '#FFFFFFD9',
  },
});
