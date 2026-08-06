import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

type AuthMessageProps = {
  message: string;
  tone: 'error' | 'notice';
};

export function AuthMessage({ message, tone }: AuthMessageProps) {
  return (
    <View style={[styles.container, tone === 'error' && styles.error]}>
      <Text style={[styles.text, tone === 'error' && styles.errorText]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    padding: spacing.md,
  },
  error: {
    backgroundColor: 'rgba(255, 105, 97, 0.12)',
    borderColor: 'rgba(255, 105, 97, 0.28)',
  },
  text: {
    color: colors.accent,
    fontSize: 13,
    lineHeight: 19,
  },
  errorText: {
    color: '#ff9a93',
  },
});
