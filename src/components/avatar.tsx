import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandGradient, FontFamily, SquadColors } from '@/constants/theme';
import type { Squad } from '@/lib/types';

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

/** The member's photo, or initials on a gradient in their squad colour (brand red for the Campus Manager). */
export function Avatar({ name, squad, uri, size = 40 }: { name: string; squad: Squad | null; uri?: string | null; size?: number }) {
  const base = squad ? SquadColors[squad] : BrandGradient[1];
  const colors = squad ? ([`${base}CC`, base] as const) : BrandGradient;
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[shape, { backgroundColor: base }]}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        accessibilityLabel={`${name}'s photo`}
      />
    );
  }

  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.avatar, shape]}>
      <ThemedText style={[styles.text, { fontSize: size * 0.38, lineHeight: size * 0.5 }]}>{initials(name)}</ThemedText>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
  },
});
