import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
};

export function TextField({ label, icon, style, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && (
        <ThemedText type="caption" themeColor="textSecondary" style={styles.label}>
          {label.toUpperCase()}
        </ThemedText>
      )}
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          { backgroundColor: theme.backgroundElement, borderColor: focused ? theme.primary : theme.border },
        ]}>
        {icon && <Ionicons name={icon} size={18} color={focused ? theme.primary : theme.textSecondary} />}
        <TextInput
          placeholderTextColor={theme.textSecondary}
          multiline={multiline}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, multiline && styles.multilineInput, { color: theme.text }, style]}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one + Spacing.half,
  },
  label: {
    marginLeft: Spacing.one,
  },
  box: {
    minHeight: 50,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  multiline: {
    alignItems: 'flex-start',
    paddingVertical: Spacing.two,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: FontFamily.medium,
    paddingVertical: Spacing.two,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
});
