import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Avatar } from '@/components/avatar';
import { BrandLogo } from '@/components/brand';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandGradient, MaxContentWidth, Radius, SquadColors, Spacing, TypeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const BUILDER = {
  name: 'Sujan Anandh S I',
  squad: 92 as const,
  email: 'sujan.anandh.s93@kalvium.community',
};

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; title: string; text: string }[] = [
  { icon: 'document-text', color: TypeColors.note, title: 'Notes', text: 'PDFs, images and Drive links, tagged by subject' },
  { icon: 'rocket', color: TypeColors.project, title: 'Projects', text: 'Showcase builds with live GitHub stats' },
  { icon: 'bulb', color: TypeColors.idea, title: 'Ideas', text: 'Pitch, upvote and find teammates' },
  { icon: 'link', color: TypeColors.resource, title: 'Resources', text: 'Repos, articles and playlists worth sharing' },
];

/** The logo slowly rotates inside a soft halo. */
function SpinningLogo() {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.set(withRepeat(withTiming(1, { duration: 12000, easing: Easing.linear }), -1));
  }, [turn]);

  const haloStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 360}deg` }] }));

  return (
    <View style={styles.logoWrap}>
      <Animated.View style={[styles.halo, haloStyle]}>
        {([91, 92, 93] as const).map((squad, i) => (
          <View
            key={squad}
            style={[
              styles.haloDot,
              { backgroundColor: SquadColors[squad], transform: [{ rotate: `${i * 120}deg` }, { translateY: -70 }] },
            ]}
          />
        ))}
      </Animated.View>
      <BrandLogo size={96} />
    </View>
  );
}

/** Pulls the latest published update (pushed from GitHub) and restarts into it. */
function UpdateButton() {
  const [checking, setChecking] = useState(false);

  async function check() {
    if (!Updates.isEnabled) {
      Alert.alert('Updates', 'Updates are only available in the installed app.');
      return;
    }
    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert('You are up to date', 'You have the latest version of Squad Hub.');
        return;
      }
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      Alert.alert('Could not check for updates', e instanceof Error ? e.message : 'Please try again later.');
    } finally {
      setChecking(false);
    }
  }

  return <Button title="Check for updates" icon="cloud-download-outline" variant="secondary" onPress={check} loading={checking} />;
}

export default function AboutScreen() {
  const theme = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const updateDate = Updates.createdAt ? Updates.createdAt.toLocaleDateString([], { day: 'numeric', month: 'short' }) : null;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
        <SpinningLogo />
        <ThemedText type="subtitle">Squad Hub</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          One place for Squads 91, 92 and 93 to share notes, projects and ideas.
        </ThemedText>
        <Chip label={updateDate && !Updates.isEmbeddedLaunch ? `Version ${version} · updated ${updateDate}` : `Version ${version}`} icon="sparkles" />
      </Animated.View>

      <UpdateButton />

      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.builder}>
          <ThemedText type="caption" style={styles.builderLabel}>
            DESIGNED & BUILT BY
          </ThemedText>
          <View style={styles.builderRow}>
            <View style={styles.builderAvatar}>
              <Avatar name={BUILDER.name} squad={BUILDER.squad} size={64} />
            </View>
            <View style={styles.flex}>
              <ThemedText type="heading" style={styles.white}>
                {BUILDER.name}
              </ThemedText>
              <ThemedText type="small" style={styles.whiteSoft}>
                Squad {BUILDER.squad} · Kalvium @ AMET
              </ThemedText>
            </View>
          </View>
          <PressableScale onPress={() => Linking.openURL(`mailto:${BUILDER.email}`)} style={styles.builderButton}>
            <Ionicons name="mail-outline" size={16} color="#FFFFFF" />
            <ThemedText type="smallBold" style={styles.white}>
              Send feedback
            </ThemedText>
          </PressableScale>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
        <ThemedText type="caption" themeColor="textSecondary">
          WHAT YOU CAN DO
        </ThemedText>
        <View style={styles.grid}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={[styles.feature, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={[styles.featureIcon, { backgroundColor: `${feature.color}1F` }]}>
                <Ionicons name={feature.icon} size={20} color={feature.color} />
              </View>
              <ThemedText type="smallBold">{feature.title}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {feature.text}
              </ThemedText>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={[styles.kalvium, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Image source={require('@/assets/images/kalvium-logo.jpg')} style={styles.kalviumLogo} contentFit="contain" accessibilityLabel="Kalvium logo" />
        <View style={styles.flex}>
          <ThemedText type="smallBold">Kalvium @ AMET University</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Made by students, for the batch.
          </ThemedText>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  logoWrap: {
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 170,
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  builder: {
    borderRadius: Radius.lg + 6,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  builderLabel: {
    color: '#FFFFFFCC',
  },
  builderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  builderAvatar: {
    padding: 3,
    borderRadius: 40,
    backgroundColor: '#FFFFFF55',
  },
  white: {
    color: '#FFFFFF',
  },
  whiteSoft: {
    color: '#FFFFFFD9',
  },
  builderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: '#FFFFFF26',
    borderRadius: Radius.md,
    paddingVertical: Spacing.two + Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  feature: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  kalvium: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.three,
  },
  kalviumLogo: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
  },
});
