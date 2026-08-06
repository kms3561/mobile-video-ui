import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AuthScreen } from '../auth/AuthScreen';
import { useAuth } from '../auth/AuthContext';
import { ListCard } from '../components/ListCard';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { supabase } from '../lib/supabase';
import { colors, radii, spacing } from '../theme';
import { useState } from 'react';

export function MessagesScreen() {
  const {
    isLoading,
    isProfileLoading,
    isSubmitting,
    openUsernamePrompt,
    profile,
    session,
    signOut,
    user,
  } = useAuth();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader eyebrow="Account" title="Messages" />
        <ListCard>
          <Text style={styles.body}>Restoring session...</Text>
        </ListCard>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <AuthScreen
          subtitle="Sign up or sign in to use future messaging features."
          title="Messages & Account"
          useOuterScreen={false}
        />
        <ListCard>
          <Text style={styles.sender}>Messaging under construction</Text>
          <Text style={styles.body}>
            Private, ad-free direct messaging will be added in a future update.
          </Text>
        </ListCard>
      </Screen>
    );
  }

  async function verifyAndDeleteAccount() {
    if (!supabase || !user?.email || isDeletingAccount) {
      return;
    }

    if (!deletePassword) {
      setDeleteError('Enter your current password.');
      return;
    }

    setDeleteError(null);
    setDeleteStatus('Verifying password...');
    setIsDeletingAccount(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    });

    if (signInError) {
      setDeleteError(`Password verification failed: ${signInError.message}`);
      setDeleteStatus(null);
      setIsDeletingAccount(false);
      return;
    }

    Alert.alert(
      'Final confirmation',
      'Delete your account permanently? This cannot be undone.',
      [
        {
          onPress: () => {
            setDeleteStatus(null);
            setIsDeletingAccount(false);
          },
          style: 'cancel',
          text: 'Cancel',
        },
        {
          onPress: () => {
            void performAccountDeletion();
          },
          style: 'destructive',
          text: 'Delete account',
        },
      ],
    );
  }

  async function performAccountDeletion() {
    if (!supabase) {
      setDeleteError('Supabase is not configured.');
      setIsDeletingAccount(false);
      return;
    }

    setDeleteError(null);
    setDeleteStatus('Deleting account data...');

    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: {},
    });

    if (error) {
      setDeleteError(`delete-account function failed: ${error.message}`);
      setDeleteStatus(null);
      setIsDeletingAccount(false);
      return;
    }

    const result = data as { error?: string; step?: string };

    if (result?.error) {
      setDeleteError(`step: ${result.step ?? 'unknown'}\nmessage: ${result.error}`);
      setDeleteStatus(null);
      setIsDeletingAccount(false);
      return;
    }

    setDeleteStatus('Account deleted. Signing out...');
    await signOut();
  }

  return (
    <Screen>
      <ScreenHeader eyebrow="Account" title="Messages" />
      <ListCard>
        <View style={styles.accountStack}>
          <Text style={styles.sender}>Account</Text>
          <Text style={styles.label}>Public username</Text>
          <View style={styles.usernameRow}>
            <Text style={styles.body}>
              {isProfileLoading ? 'Loading username...' : profile?.username ?? 'Not set'}
            </Text>
            <Pressable
              accessibilityLabel="Change username"
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() =>
                openUsernamePrompt({
                  actionLabel: 'Change username',
                  description: 'Choose a new public username.',
                })
              }
              style={({ pressed }) => [
                styles.usernameIconButton,
                pressed && !isSubmitting && styles.pressed,
                isSubmitting && styles.disabled,
              ]}
            >
              <Ionicons color={colors.accent} name="pencil" size={16} />
            </Pressable>
          </View>
          <Text style={styles.label}>Private email</Text>
          <Text style={styles.body}>{user?.email ?? 'Current user'}</Text>
          <View style={styles.accountActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={signOut}
              style={({ pressed }) => [
                styles.signOutButton,
                pressed && !isSubmitting && styles.pressed,
                isSubmitting && styles.disabled,
              ]}
            >
              <Text style={styles.signOutText}>
                {isSubmitting ? 'Signing out...' : 'Sign out'}
              </Text>
            </Pressable>
          </View>
          {isDeleteOpen ? (
            <View style={styles.deletePanel}>
              <Text style={styles.deleteTitle}>Delete account permanently</Text>
              <Text style={styles.body}>
                This is permanent. Your profile, media posts, uploaded files,
                questions, replies, and comments will be deleted.
              </Text>
              <TextInput
                editable={!isDeletingAccount}
                onChangeText={setDeletePassword}
                placeholder="Current password"
                placeholderTextColor={colors.quiet}
                secureTextEntry
                style={styles.passwordInput}
                value={deletePassword}
              />
              {deleteStatus ? (
                <StatusMessage message={deleteStatus} tone="info" />
              ) : null}
              {deleteError ? (
                <StatusMessage message={deleteError} tone="error" />
              ) : null}
              <View style={styles.deleteActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeletingAccount}
                  onPress={() => {
                    setIsDeleteOpen(false);
                    setDeleteError(null);
                    setDeleteStatus(null);
                    setDeletePassword('');
                  }}
                  style={({ pressed }) => [
                    styles.cancelDeleteButton,
                    pressed && !isDeletingAccount && styles.pressed,
                    isDeletingAccount && styles.disabled,
                  ]}
                >
                  <Text style={styles.cancelDeleteText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isDeletingAccount}
                  onPress={verifyAndDeleteAccount}
                  style={({ pressed }) => [
                    styles.confirmDeleteButton,
                    pressed && !isDeletingAccount && styles.pressed,
                    isDeletingAccount && styles.disabled,
                  ]}
                >
                  <Text style={styles.confirmDeleteText}>
                    {isDeletingAccount ? 'Working...' : 'Continue'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={isDeletingAccount}
            onPress={() => setIsDeleteOpen(true)}
            style={({ pressed }) => [
              styles.deleteAccountLink,
              pressed && !isDeletingAccount && styles.pressed,
              isDeletingAccount && styles.disabled,
            ]}
          >
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </Pressable>
        </View>
      </ListCard>
      <ListCard>
        <Text style={styles.sender}>Messaging under construction</Text>
        <Text style={styles.body}>
          Private, ad-free direct messaging will be added in a future update.
        </Text>
      </ListCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  accountActions: {
    marginTop: spacing.md,
  },
  accountStack: {
    gap: spacing.sm,
  },
  messageCopy: {
    flex: 1,
  },
  cancelDeleteButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  cancelDeleteText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  sender: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  label: {
    color: colors.quiet,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.xs,
    textTransform: 'uppercase',
  },
  confirmDeleteButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  confirmDeleteText: {
    color: '#03100c',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteAccountLink: {
    alignSelf: 'flex-start',
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  deleteAccountText: {
    color: '#ff9a93',
    fontSize: 14,
    fontWeight: '800',
  },
  deleteActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  deletePanel: {
    backgroundColor: colors.panelStrong,
    borderColor: 'rgba(255, 105, 97, 0.28)',
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  deleteTitle: {
    color: '#ff9a93',
    fontSize: 15,
    fontWeight: '800',
  },
  passwordInput: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  signOutButton: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  signOutText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
  usernameIconButton: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  usernameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
