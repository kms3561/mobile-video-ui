import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { QuestionListItem, QuestionReplyItem } from '../lib/queries';
import { OwnerMenu } from './OwnerMenu';
import { colors, radii, spacing } from '../theme';

type QuestionCardProps = {
  currentUserId?: string | null;
  isMenuOpen?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onMenuToggle?: () => void;
  onPress?: () => void;
  question: QuestionListItem;
};

export function QuestionCard({
  currentUserId,
  isMenuOpen = false,
  onDelete,
  onEdit,
  onMenuToggle,
  onPress,
  question,
}: QuestionCardProps) {
  const isOwner = Boolean(currentUserId && currentUserId === question.user_id);
  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>{question.title}</Text>
      {isOwner && onDelete && onEdit && onMenuToggle ? (
        <OwnerMenu
          isOpen={isMenuOpen}
          onDelete={onDelete}
          onEdit={onEdit}
          onToggle={onMenuToggle}
        />
      ) : null}
    </View>
  );
  const detail = (
    <>
      <Text numberOfLines={onPress ? 3 : undefined} style={styles.body}>
        {question.body}
      </Text>
      <MetaRow
        createdAt={question.created_at}
        replyCount={question.replyCount}
        username={question.profile?.username}
      />
    </>
  );

  if (!onPress) {
    return (
      <View style={styles.card}>
        {header}
        {detail}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {header}
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {detail}
      </Pressable>
    </View>
  );
}

export function ReplyCard({
  currentUserId,
  isMenuOpen = false,
  onDelete,
  onEdit,
  onMenuToggle,
  reply,
}: {
  currentUserId?: string | null;
  isMenuOpen?: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onMenuToggle?: () => void;
  reply: QuestionReplyItem;
}) {
  const isOwner = Boolean(currentUserId && currentUserId === reply.user_id);

  return (
    <View style={styles.replyCard}>
      <View style={styles.header}>
        <Text style={styles.replyBody}>{reply.body}</Text>
        {isOwner && onDelete && onEdit && onMenuToggle ? (
          <OwnerMenu
            isOpen={isMenuOpen}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggle={onMenuToggle}
          />
        ) : null}
      </View>
      <Text style={styles.meta}>
        @{reply.profile?.username ?? 'unknown_user'} -{' '}
        {formatDateTime(reply.created_at)}
      </Text>
    </View>
  );
}

function MetaRow({
  createdAt,
  replyCount,
  username,
}: {
  createdAt: string;
  replyCount: number;
  username?: string;
}) {
  return (
    <View style={styles.metaWrap}>
      <Text style={styles.meta}>
        @{username ?? 'unknown_user'} - {formatDateTime(createdAt)}
      </Text>
      <Text style={styles.replyCount}>
        {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </Text>
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
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  meta: {
    color: colors.quiet,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  metaWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  replyCard: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  replyBody: {
    color: colors.muted,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  replyCount: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
});
