import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../auth/AuthContext';
import { CommentCard } from '../components/CommentCard';
import { MediaPostCard } from '../components/MediaPostCard';
import { Screen } from '../components/Screen';
import { StatusMessage } from '../components/StatusMessage';
import {
  createMediaComment,
  deleteMediaComment,
  getMediaPostDetail,
  listMediaComments,
  listMediaFeedPage,
  type MediaCommentItem,
  type MediaFeedItem,
  updateMediaComment,
} from '../lib/queries';
import { colors, radii, spacing } from '../theme';
import { subscribeToMediaUploads } from '../upload/uploadEvents';

const pageSize = 10;

export function VideosScreen() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [items, setItems] = useState<MediaFeedItem[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const loadFirstPage = useCallback(async (refreshing = false) => {
    setError(null);
    setIsLoading(!refreshing);
    setIsRefreshing(refreshing);

    try {
      const page = await listMediaFeedPage({ pageSize });
      setItems(dedupePosts(page.items));
      setCursor(page.nextCursor);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load media posts.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore || isLoading || isRefreshing) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const page = await listMediaFeedPage({ cursor, pageSize });
      setItems((currentItems) => dedupePosts([...currentItems, ...page.items]));
      setCursor(page.nextCursor);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load more media posts.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, isLoading, isLoadingMore, isRefreshing]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    return subscribeToMediaUploads(() => {
      void loadFirstPage(true);
    });
  }, [loadFirstPage]);

  if (selectedPostId) {
    return (
      <MediaCommentsScreen
        onBack={() => {
          setSelectedPostId(null);
          void loadFirstPage(true);
        }}
        postId={selectedPostId}
      />
    );
  }

  return (
    <Screen scroll={false}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading uploads...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.feed,
            items.length === 0 && styles.emptyFeed,
          ]}
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            error ? null : (
              <EmptyState
                body="Uploaded media will appear here as soon as it is added."
                title="No uploads yet"
              />
            )
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footer}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : null
          }
          ListHeaderComponent={
            error ? (
              <View style={styles.errorWrap}>
                <StatusMessage message={error} tone="error" />
                <RetryButton onPress={() => loadFirstPage()} />
              </View>
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.45}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor={colors.accent}
              onRefresh={() => loadFirstPage(true)}
            />
          }
          renderItem={({ item }) => (
            <MediaPostCard
              currentUserId={user?.id ?? null}
              item={item}
              onChanged={() => loadFirstPage(true)}
              onViewComments={() => setSelectedPostId(item.id)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function MediaCommentsScreen({
  onBack,
  postId,
}: {
  onBack: () => void;
  postId: string;
}) {
  const { requireAuth, user } = useAuth();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [comments, setComments] = useState<MediaCommentItem[]>([]);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [draftByCommentId, setDraftByCommentId] = useState<Record<string, string>>(
    {},
  );
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editErrorByCommentId, setEditErrorByCommentId] = useState<
    Record<string, string | null>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuCommentId, setMenuCommentId] = useState<string | null>(null);
  const [post, setPost] = useState<MediaFeedItem | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);

  const loadComments = useCallback(
    async (refreshing = false) => {
      setScreenError(null);
      setIsLoading(!refreshing);
      setIsRefreshing(refreshing);

      try {
        const [nextPost, nextComments] = await Promise.all([
          getMediaPostDetail(postId),
          listMediaComments(postId),
        ]);

        setPost(nextPost);
        setComments(nextComments);
      } catch (nextError) {
        setScreenError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load comments.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [postId],
  );

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  function openCommentComposer() {
    if (
      !requireAuth({
        actionLabel: 'Post a comment',
        description: 'Comment posting requires an account.',
        onReady: () => setIsComposerOpen(true),
      })
    ) {
      return;
    }

    setIsComposerOpen(true);
  }

  function startEditComment(comment: MediaCommentItem) {
    setMenuCommentId(null);
    setEditingCommentId(comment.id);
    setDraftByCommentId((currentDrafts) => ({
      ...currentDrafts,
      [comment.id]: currentDrafts[comment.id] ?? comment.body,
    }));
    setEditErrorByCommentId((currentErrors) => ({
      ...currentErrors,
      [comment.id]: null,
    }));
  }

  function cancelEditComment(comment: MediaCommentItem) {
    setEditingCommentId(null);
    setDraftByCommentId((currentDrafts) => ({
      ...currentDrafts,
      [comment.id]: comment.body,
    }));
    setEditErrorByCommentId((currentErrors) => ({
      ...currentErrors,
      [comment.id]: null,
    }));
  }

  async function saveComment(comment: MediaCommentItem) {
    if (savingCommentId) {
      return;
    }

    const trimmedBody = (draftByCommentId[comment.id] ?? comment.body).trim();

    if (!trimmedBody) {
      setEditErrorByCommentId((currentErrors) => ({
        ...currentErrors,
        [comment.id]: 'Comment cannot be empty.',
      }));
      return;
    }

    setSavingCommentId(comment.id);
    setEditErrorByCommentId((currentErrors) => ({
      ...currentErrors,
      [comment.id]: null,
    }));

    try {
      await updateMediaComment({ body: trimmedBody, id: comment.id });
      setActionNotice('Comment updated.');
      setEditingCommentId(null);
      await loadComments(true);
    } catch (nextError) {
      setEditErrorByCommentId((currentErrors) => ({
        ...currentErrors,
        [comment.id]:
          nextError instanceof Error
            ? nextError.message
            : 'Unable to update comment.',
      }));
    } finally {
      setSavingCommentId(null);
    }
  }

  function confirmDeleteComment(comment: MediaCommentItem) {
    setMenuCommentId(null);
    Alert.alert('Delete comment?', 'This removes your comment.', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          void removeComment(comment.id);
        },
        style: 'destructive',
        text: 'Delete',
      },
    ]);
  }

  async function removeComment(commentId: string) {
    if (deletingCommentId) {
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setDeletingCommentId(commentId);

    try {
      await deleteMediaComment(commentId);
      setActionNotice('Comment deleted.');
      await loadComments(true);
    } catch (nextError) {
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to delete comment.',
      );
    } finally {
      setDeletingCommentId(null);
    }
  }

  return (
    <Screen scroll={false}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading comments...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.feed,
            comments.length === 0 && styles.commentDetailFeed,
          ]}
          data={comments}
          keyExtractor={(comment) => comment.id}
          ListEmptyComponent={
            screenError || !post ? null : (
              <EmptyState
                body="Be the first to comment on this post."
                title="No comments yet"
              />
            )
          }
          ListHeaderComponent={
            <View>
              <Pressable
                accessibilityRole="button"
                onPress={onBack}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.backButtonText}>Back to feed</Text>
              </Pressable>
              {post ? (
                <MediaPostCard
                  currentUserId={user?.id ?? null}
                  item={post}
                  onChanged={() => loadComments(true)}
                  showCommentsAction={false}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={openCommentComposer}
                style={({ pressed }) => [
                  styles.commentAction,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.commentActionText}>Add comment</Text>
              </Pressable>
              {isComposerOpen ? (
                <CommentComposer
                  mediaPostId={postId}
                  onCancel={() => setIsComposerOpen(false)}
                  onCreated={() => {
                    setIsComposerOpen(false);
                    setActionNotice('Comment posted.');
                    void loadComments(true);
                  }}
                  userId={user?.id ?? null}
                />
              ) : null}
              {actionNotice ? (
                <View style={styles.messageWrap}>
                  <StatusMessage message={actionNotice} tone="success" />
                </View>
              ) : null}
              {actionError ? (
                <View style={styles.messageWrap}>
                  <StatusMessage message={actionError} tone="error" />
                </View>
              ) : null}
              {deletingCommentId ? (
                <Text style={styles.statusText}>Deleting comment...</Text>
              ) : null}
              {screenError ? (
                <View style={styles.errorWrap}>
                  <StatusMessage message={screenError} tone="error" />
                  <RetryButton onPress={() => loadComments()} />
                </View>
              ) : null}
              {!post && !screenError ? (
                <EmptyState
                  body="This media post may have been removed."
                  title="Post unavailable"
                />
              ) : null}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor={colors.accent}
              onRefresh={() => loadComments(true)}
            />
          }
          renderItem={({ item }) => (
            <CommentCard
              comment={item}
              currentUserId={user?.id ?? null}
              draftBody={draftByCommentId[item.id] ?? item.body}
              error={editErrorByCommentId[item.id]}
              isEditing={editingCommentId === item.id}
              isMenuOpen={menuCommentId === item.id}
              isSaving={savingCommentId === item.id}
              onCancelEdit={() => cancelEditComment(item)}
              onDelete={() => confirmDeleteComment(item)}
              onDraftBodyChange={(body) =>
                setDraftByCommentId((currentDrafts) => ({
                  ...currentDrafts,
                  [item.id]: body,
                }))
              }
              onEdit={() => startEditComment(item)}
              onMenuToggle={() =>
                setMenuCommentId((currentId) =>
                  currentId === item.id ? null : item.id,
                )
              }
              onSave={() => saveComment(item)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function CommentComposer({
  mediaPostId,
  onCancel,
  onCreated,
  userId,
}: {
  mediaPostId: string;
  onCancel: () => void;
  onCreated: () => void;
  userId: string | null;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const trimmedBody = body.trim();

    if (!userId) {
      setError('Sign in before commenting.');
      return;
    }

    if (!trimmedBody) {
      setError('Add a comment before posting.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createMediaComment({
        body: trimmedBody,
        created_at: new Date().toISOString(),
        media_post_id: mediaPostId,
        user_id: userId,
      });
      setBody('');
      onCreated();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to post comment.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.commentComposer}>
      <TextInput
        editable={!isSubmitting}
        multiline
        onChangeText={setBody}
        placeholder="Write a comment"
        placeholderTextColor={colors.quiet}
        style={styles.commentInput}
        textAlignVertical="top"
        value={body}
      />
      {error ? <StatusMessage message={error} tone="error" /> : null}
      <View style={styles.commentComposerActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.commentCancel,
            pressed && !isSubmitting && styles.pressed,
            isSubmitting && styles.disabled,
          ]}
        >
          <Text style={styles.commentCancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={submit}
          style={({ pressed }) => [
            styles.commentSubmit,
            pressed && !isSubmitting && styles.pressed,
            isSubmitting && styles.disabled,
          ]}
        >
          <Text style={styles.commentSubmitText}>
            {isSubmitting ? 'Posting...' : 'Post comment'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

function RetryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
    >
      <Text style={styles.retryText}>Try again</Text>
    </Pressable>
  );
}

function dedupePosts(posts: MediaFeedItem[]) {
  const seen = new Set<string>();

  return posts.filter((post) => {
    if (seen.has(post.id)) {
      return false;
    }

    seen.add(post.id);
    return true;
  });
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginBottom: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  commentAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginBottom: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  commentActionText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  commentCancel: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  commentCancelText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  commentComposer: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  commentComposerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  commentDetailFeed: {
    flexGrow: 1,
  },
  commentInput: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 92,
    padding: spacing.md,
  },
  commentSubmit: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  commentSubmitText: {
    color: '#03100c',
    fontSize: 14,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyFeed: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  errorWrap: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  feed: {
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingVertical: spacing.lg,
  },
  pressed: {
    opacity: 0.82,
  },
  retryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
  },
  messageWrap: {
    marginBottom: spacing.md,
  },
  statusText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
});
