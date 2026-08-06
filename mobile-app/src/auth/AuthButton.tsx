import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing } from '../theme';

type AuthButtonProps = {
  disabled?: boolean;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function AuthButton({
  disabled,
  isLoading,
  label,
  onPress,
  variant = 'primary',
}: AuthButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#03100c' : colors.accent}
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'secondary' && styles.secondaryLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xl,
  },
  secondary: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.65,
  },
  pressed: {
    opacity: 0.86,
  },
  label: {
    color: '#03100c',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryLabel: {
    color: colors.accent,
  },
});
