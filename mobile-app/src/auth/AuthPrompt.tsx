import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '../theme';
import { AuthScreen } from './AuthScreen';
import { useAuth } from './AuthContext';
import { UsernameSetup } from './UsernameSetup';

export function AuthPrompt() {
  const { authPrompt, closeAuthPrompt, closeUsernamePrompt, usernamePrompt } =
    useAuth();
  const prompt = usernamePrompt ?? authPrompt;
  const isUsernamePrompt = Boolean(usernamePrompt);

  return (
    <Modal
      animationType="slide"
      onRequestClose={isUsernamePrompt ? closeUsernamePrompt : closeAuthPrompt}
      presentationStyle="pageSheet"
      visible={Boolean(prompt)}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>
              {isUsernamePrompt ? 'Username required' : 'Sign in required'}
            </Text>
            <Text style={styles.heading}>
              {prompt?.actionLabel ?? 'Protected action'}
            </Text>
            {prompt?.description ? (
              <Text style={styles.description}>{prompt.description}</Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={isUsernamePrompt ? closeUsernamePrompt : closeAuthPrompt}
            style={styles.closeButton}
          >
            <Ionicons color={colors.text} name="close" size={22} />
          </Pressable>
        </View>
        <View style={styles.content}>
          {isUsernamePrompt ? (
            <UsernameSetup />
          ) : (
            <AuthScreen
              subtitle="Sign in or create an account, then return here to continue."
              title="Continue with account"
              useOuterScreen={false}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    padding: spacing.lg,
  },
});
