import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

type OwnerMenuProps = {
  isOpen: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onToggle: () => void;
};

export function OwnerMenu({
  isOpen,
  onDelete,
  onEdit,
  onToggle,
}: OwnerMenuProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityLabel="Content actions"
        accessibilityRole="button"
        onPress={onToggle}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Ionicons color={colors.muted} name="ellipsis-horizontal" size={18} />
      </Pressable>
      {isOpen ? (
        <View style={styles.menu}>
          <MenuItem label="Edit" onPress={onEdit} />
          <MenuItem destructive label="Delete" onPress={onDelete} />
        </View>
      ) : null}
    </View>
  );
}

function MenuItem({
  destructive = false,
  label,
  onPress,
}: {
  destructive?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <Text style={[styles.itemText, destructive && styles.destructiveText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  destructiveText: {
    color: '#ff9a93',
  },
  item: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  itemText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  menu: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    minWidth: 112,
    position: 'absolute',
    right: 0,
    top: 38,
    zIndex: 20,
  },
  pressed: {
    opacity: 0.82,
  },
  trigger: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  wrap: {
    position: 'relative',
    zIndex: 30,
  },
});
