import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type ScreenHeaderProps = {
  eyebrow: string;
  title: string;
};

export function ScreenHeader({ eyebrow, title }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 34,
  },
});
