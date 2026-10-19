import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo, KalviumBadge } from '@/components/brand';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { BrandGradient, MaxContentWidth, Radius, SquadColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

/** A soft coloured circle that drifts up and down behind the hero. */
function Orb({ color, size, top, left, delay }: { color: string; size: number; top: number; left: number; delay: number }) {
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.set(withRepeat(
      withSequence(
        withTiming(1, { duration: 3200 + delay, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3200 + delay, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    ));
  }, [drift, delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value * 18 }, { scale: 1 + drift.value * 0.06 }],
  }));

  return (
    <Animated.View
      style={[styles.orb, { backgroundColor: color, width: size, height: size, borderRadius: size / 2, top, left }, style]}
    />
  );
}

// Email one-time code sign-in: no passwords, and no deep links needed inside an APK.
export default function SignInScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
    setLoading(false);
    if (error) {
      Alert.alert(
        'Could not send code',
        error.message.includes('Database error')
          ? 'This email is not on the Squad Hub list. Ask your Campus Manager to add you.'
          : error.message,
      );
      return;
    }
    setCodeSent(true);
  }

  async function verifyCode() {
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Invalid code', error.message);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Orb color="#FFFFFF22" size={220} top={-60} left={-70} delay={0} />
        <Orb color={`${SquadColors[91]}55`} size={90} top={70} left={290} delay={400} />
        <Orb color={`${SquadColors[92]}55`} size={60} top={190} left={40} delay={800} />
        <Orb color={`${SquadColors[93]}66`} size={44} top={30} left={220} delay={1200} />
      </LinearGradient>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.heroContent}>
              <View style={styles.logoRing}>
                <BrandLogo size={84} />
              </View>
              <ThemedText type="title" style={styles.heroTitle}>
                Squad Hub
              </ThemedText>
              <ThemedText style={styles.heroSubtitle}>Notes, projects and ideas for Squads 91 · 92 · 93</ThemedText>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(200).duration(600).springify()}
              style={[styles.card, { backgroundColor: theme.backgroundElement, shadowColor: theme.shadow }]}>
              <ThemedText type="heading">{codeSent ? 'Check your inbox' : 'Welcome back'}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {codeSent
                  ? `We sent a 6-digit code to ${email.trim().toLowerCase()}`
                  : 'Sign in with the email your Campus Manager added.'}
              </ThemedText>

              {codeSent ? (
                <Animated.View entering={FadeInDown.duration(400)} style={styles.form}>
                  <TextField
                    icon="key-outline"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    maxLength={8}
                    placeholder="123456"
                    style={styles.codeInput}
                    autoFocus
                  />
                  <Button title="Sign in" icon="arrow-forward" onPress={verifyCode} loading={loading} disabled={code.length < 6} />
                  <Button
                    title="Use a different email"
                    variant="ghost"
                    onPress={() => {
                      setCodeSent(false);
                      setCode('');
                    }}
                  />
                </Animated.View>
              ) : (
                <View style={styles.form}>
                  <TextField
                    icon="mail-outline"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="name.s93@kalvium.community"
                  />
                  <Button title="Send code" icon="paper-plane-outline" onPress={sendCode} loading={loading} disabled={!email.includes('@')} />
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.footer}>
              <KalviumBadge />
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.four,
  },
  heroContent: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoRing: {
    padding: 6,
    borderRadius: 30,
    backgroundColor: '#FFFFFF33',
    marginBottom: Spacing.two,
  },
  heroTitle: {
    color: '#FFFFFF',
  },
  heroSubtitle: {
    color: '#FFFFFFDD',
    textAlign: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  form: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  codeInput: {
    fontSize: 22,
    letterSpacing: 8,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: Spacing.four,
  },
});
