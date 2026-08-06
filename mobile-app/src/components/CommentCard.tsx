import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { MediaCommentItem } from '../lib/queries';
import { OwnerMenu } from './OwnerMenu';
import { StatusMessage } from './StatusMessage';
import { colors, radii, spacing } from '../theme';

type CommentCardProps = {
  comment: MediaCommentItem;
  currentUserId?: string | null;
  draftBody: string;
  error?: string | null;
  isEditing: boolean;
  isMenuOpen: boolean;
  isSaving: boolean;
  onCancelEdit: () => void;
  onDelete: () => void;
  onDraftBodyChange: (body: string) => void;
  onEdit: () => void;
  onMenuToggle: () => void;
  onSave: () => void;
};

export function CommentCard({
  comment,
  currentUserId,
  draftBody,
  error,
  isEditing,
  isMenuOpen,
  isSaving,
  onCancelEdit,
  onDelete,
  onDraftBodyChange,
  onEdit,
  onMenuToggle,
  onSave,
}: CommentCardProps) {
  const isOwner = Boolean(currentUserId && currentUserId === comment.user_id);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.meta}>
          @{comment.profile?.username ?? 'unknown_user'} -{' '}
          {formatDateTime(comment.created_at)}
        </Text>
        {isOwner ? (
          <OwnerMenu
            isOpen={isMenuOpen}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggle={onMenuToggle}
          />
        ) : null}
      </View>
      {isEditing ? (
        <View style={styles.editor}>
          <TextInput
            editable={!isSaving}
            multiline
            onChangeText={onDraftBodyChange}
            placeholder="Edit comment"
            placeholderTextColor={colors.quiet}
            style={styles.input}
            textAlignVertical="top"
            value={draftBody}
          />
          {error ? <StatusMessage message={error} tone="error" /> : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onCancelEdit}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !isSaving && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={onSave}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && !isSaving && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              <Text style={styles.saveText}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.body}>{comment.body}</Text>
      )}
    </View>
  );
}

function formatDateTime(value: string) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable';
  }

  return parsedDate.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  disabled: {
    opacity: 0.6,
  },
  editor: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  input: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 92,
    padding: spacing.md,
  },
  meta: {
    color: colors.quiet,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.82,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  saveText: {
    color: '#03100c',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
});
