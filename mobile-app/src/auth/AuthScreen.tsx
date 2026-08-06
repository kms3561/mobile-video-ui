import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '../components/Screen';
import { colors, radii, spacing } from '../theme';
import { AuthButton } from './AuthButton';
import { AuthMessage } from './AuthMessage';
import { AuthTextInput } from './AuthTextInput';
import { useAuth } from './AuthContext';

type AuthMode = 'sign-in' | 'sign-up';

type AuthScreenProps = {
  footer?: ReactNode;
  initialMode?: AuthMode;
  subtitle?: string;
  title?: string;
  useOuterScreen?: boolean;
};

export function AuthScreen({
  footer,
  initialMode = 'sign-in',
  subtitle,
  title,
  useOuterScreen = true,
}: AuthScreenProps) {
  const { error, isConfigured, isSubmitting, notice, signIn, signUp } =
    useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const defaultTitle = mode === 'sign-in' ? 'Welcome back' : 'Create account';
  const defaultSubtitle =
    mode === 'sign-in'
      ? 'Sign in to unlock posting and messaging actions.'
      : 'Create a new account with email and password.';

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length >= 6 && isConfigured,
    [email, isConfigured, password],
  );

  async function handleSubmit() {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setLocalError('Enter your email address.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    setLocalError(null);

    if (mode === 'sign-in') {
      await signIn(normalizedEmail, password);
    } else {
      await signUp(normalizedEmail, password);
    }
  }

  function toggleMode() {
    setLocalError(null);
    setMode((currentMode) =>
      currentMode === 'sign-in' ? 'sign-up' : 'sign-in',
    );
  }

  const content = (
    <>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={styles.title}>{title ?? defaultTitle}</Text>
        <Text style={styles.subtitle}>{subtitle ?? defaultSubtitle}</Text>
      </View>

      <View style={styles.panel}>
        <AuthTextInput
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="you@example.com"
          value={email}
        />
        <AuthTextInput
          label="Password"
          onChangeText={setPassword}
          placeholder="At least 6 characters"
          secureTextEntry
          value={password}
        />

        {localError ? <AuthMessage message={localError} tone="error" /> : null}
        {error ? <AuthMessage message={error} tone="error" /> : null}
        {notice ? <AuthMessage message={notice} tone="notice" /> : null}

        <AuthButton
          disabled={!canSubmit}
          isLoading={isSubmitting}
          label={mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          onPress={handleSubmit}
        />
        <AuthButton
          disabled={isSubmitting}
          label={
            mode === 'sign-in'
              ? 'Need an account? Sign up'
              : 'Already have an account? Sign in'
          }
          onPress={toggleMode}
          variant="secondary"
        />
        {footer}
      </View>
    </>
  );

  if (!useOuterScreen) {
    return content;
  }

  return (
    <Screen>
      {content}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 39,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
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
