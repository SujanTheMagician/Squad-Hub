import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PressableScale } from '@/components/ui/pressable-scale';
import { BrandGradient, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  icon?: ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ title, variant = 'primary', icon, loading, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const color = variant === 'secondary' || variant === 'ghost' ? theme.text : theme.onPrimary;
  const inactive = disabled || loading;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={color} />}
          <ThemedText type="smallBold" style={{ color }}>
            {title}
          </ThemedText>
        </>
      )}
    </View>
  );

  return (
    <PressableScale disabled={inactive} style={[styles.button, inactive && styles.dimmed, style]} {...rest}>
      {variant === 'primary' ? (
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.fill,
            variant === 'secondary' && { backgroundColor: theme.backgroundSelected },
            variant === 'danger' && { backgroundColor: theme.danger },
            variant === 'ghost' && { borderWidth: 1, borderColor: theme.border },
          ]}>
          {content}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  fill: {
    minHeight: 50,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dimmed: {
    opacity: 0.5,
  },
});
