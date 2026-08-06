import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

type PlaceholderPanelProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionLabel?: string;
  action?: ReactNode;
};

export function PlaceholderPanel({
  action,
  actionLabel,
  body,
  icon,
  title,
}: PlaceholderPanelProps) {
  return (
    <View style={styles.panel}>
      <Ionicons color={colors.accent} name={icon} size={50} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {action}
      {actionLabel ? (
        <Pressable accessibilityRole="button" style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: radii.sm,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 352,
    padding: spacing.xxl,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
    marginTop: spacing.lg,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  action: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    marginTop: spacing.xl,
    minHeight: 44,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  actionText: {
    color: '#03100c',
    fontSize: 14,
    fontWeight: '800',
  },
});
