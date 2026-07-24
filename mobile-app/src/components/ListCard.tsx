import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

export function ListCard({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
});
