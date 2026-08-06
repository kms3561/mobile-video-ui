import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton } from './AuthButton';
import { AuthMessage } from './AuthMessage';
import { AuthTextInput } from './AuthTextInput';
import { useAuth } from './AuthContext';
import { generatedUsernamePattern, validateUsername } from '../lib/queries';
import { colors, radii, spacing } from '../theme';

export function UsernameSetup() {
  const { error, isSubmitting, profile, saveUsername } = useAuth();
  const [username, setUsername] = useState(
    profile && !generatedUsernamePattern.test(profile.username)
      ? profile.username
      : '',
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const validationError = useMemo(() => validateUsername(username), [username]);
  const canSubmit = !validationError && !isSubmitting;

  async function submit() {
    const nextValidationError = validateUsername(username);

    if (nextValidationError) {
      setLocalError(nextValidationError);
      return;
    }

    setLocalError(null);
    await saveUsername(username);
  }

  return (
    <View style={styles.panel}>
      <AuthTextInput
        autoCapitalize="none"
        label="Public username"
        onChangeText={setUsername}
        placeholder="your_username"
        value={username}
      />
      <Text style={styles.help}>
        3-20 characters. Letters, numbers, and underscores only.
      </Text>
      {localError ? <AuthMessage message={localError} tone="error" /> : null}
      {error ? <AuthMessage message={error} tone="error" /> : null}
      <AuthButton
        disabled={!canSubmit}
        isLoading={isSubmitting}
        label="Save username"
        onPress={submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  help: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
});
