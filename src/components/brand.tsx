import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function BrandLogo({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/images/logo.png')}
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
      contentFit="cover"
      accessibilityLabel="Squad Hub logo"
    />
  );
}

/** "Kalvium @ AMET" lockup with the official Kalvium logo. */
export function KalviumBadge({ size = 28 }: { size?: number }) {
  return (
    <View style={styles.badge}>
      <Image
        source={require('@/assets/images/kalvium-logo.jpg')}
        style={{ width: size, height: size, borderRadius: 6 }}
        contentFit="contain"
        accessibilityLabel="Kalvium logo"
      />
      <ThemedText type="caption" themeColor="textSecondary">
        KALVIUM @ AMET UNIVERSITY
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
