import { Ionicons } from '@expo/vector-icons';
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
import { QuestionCard, ReplyCard } from '../components/QuestionCard';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import {
  createQuestion,
  createQuestionReply,
  deleteQuestion,
  deleteQuestionReply,
  getQuestionDetail,
  listQuestionPage,
  listQuestionReplies,
  type QuestionListItem,
  type QuestionReplyItem,
  updateQuestion,
  updateQuestionReply,
} from '../lib/queries';
import { colors, radii, spacing } from '../theme';

const pageSize = 10;

export function QAScreen() {
  const { requireAuth, user } = useAuth();
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAskOpen, setIsAskOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuQuestionId, setMenuQuestionId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionListItem | null>(
    null,
  );
  const [questionActionError, setQuestionActionError] = useState<string | null>(
    null,
  );
  const [questionActionNotice, setQuestionActionNotice] = useState<string | null>(
    null,
  );
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(
    null,
  );
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );

  const loadFirstPage = useCallback(async (refreshing = false) => {
    setError(null);
    setIsLoading(!refreshing);
    setIsRefreshing(refreshing);

    try {
      const page = await listQuestionPage({ pageSize });
      setQuestions(dedupeQuestions(page.items));
      setCursor(page.nextCursor);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load questions.',
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoading || isLoadingMore || isRefreshing) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const page = await listQuestionPage({ cursor, pageSize });
      setQuestions((currentQuestions) =>
        dedupeQuestions([...currentQuestions, ...page.items]),
      );
      setCursor(page.nextCursor);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to load more questions.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, isLoading, isLoadingMore, isRefreshing]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  function openAskForm() {
    if (
      !requireAuth({
        actionLabel: 'Ask a question',
        description: 'Question posting requires an account.',
        onReady: () => setIsAskOpen(true),
      })
    ) {
      return;
    }

    setIsAskOpen(true);
  }

  function confirmDeleteQuestion(question: QuestionListItem) {
    setMenuQuestionId(null);
    Alert.alert(
      'Delete question?',
      'This deletes the question. Existing replies are deleted by the database cascade.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => {
            void removeQuestion(question.id);
          },
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  }

  async function removeQuestion(questionId: string) {
    if (deletingQuestionId) {
      return;
    }

    setQuestionActionError(null);
    setQuestionActionNotice(null);
    setDeletingQuestionId(questionId);

    try {
      await deleteQuestion(questionId);
      setQuestionActionNotice('Question deleted.');
      await loadFirstPage(true);
    } catch (nextError) {
      setQuestionActionError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to delete question.',
      );
    } finally {
      setDeletingQuestionId(null);
    }
  }

  if (selectedQuestionId) {
    return (
      <QuestionDetailScreen
        onBack={() => {
          setSelectedQuestionId(null);
          void loadFirstPage(true);
        }}
        questionId={selectedQuestionId}
      />
    );
  }

  return (
    <Screen scroll={false}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading questions...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            questions.length === 0 && styles.emptyList,
          ]}
          data={questions}
          keyExtractor={(question) => question.id}
          ListEmptyComponent={
            error ? null : (
              <EmptyState
                body="Questions from the community will appear here."
                title="No questions yet"
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
            <View>
              <ScreenHeader eyebrow="Community" title="Q&A" />
              <Pressable
                accessibilityRole="button"
                onPress={openAskForm}
                style={({ pressed }) => [
                  styles.primaryAction,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons color="#03100c" name="add" size={18} />
                <Text style={styles.primaryActionText}>Ask a question</Text>
              </Pressable>
              {isAskOpen ? (
                <QuestionComposer
                  onCancel={() => setIsAskOpen(false)}
                  onCreated={() => {
                    setIsAskOpen(false);
                    void loadFirstPage(true);
                  }}
                  userId={user?.id ?? null}
                />
              ) : null}
              {editingQuestion ? (
                <QuestionEditForm
                  onCancel={() => setEditingQuestion(null)}
                  onSaved={() => {
                    setEditingQuestion(null);
                    setQuestionActionNotice('Question updated.');
                    void loadFirstPage(true);
                  }}
                  question={editingQuestion}
                />
              ) : null}
              {questionActionNotice ? (
                <View style={styles.messageWrap}>
                  <StatusMessage message={questionActionNotice} tone="success" />
                </View>
              ) : null}
              {questionActionError ? (
                <View style={styles.messageWrap}>
                  <StatusMessage message={questionActionError} tone="error" />
                </View>
              ) : null}
              {deletingQuestionId ? (
                <Text style={styles.actionStatus}>Deleting question...</Text>
              ) : null}
              {error ? (
                <View style={styles.errorWrap}>
                  <StatusMessage message={error} tone="error" />
                  <RetryButton onPress={() => loadFirstPage()} />
                </View>
              ) : null}
            </View>
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
            <QuestionCard
              currentUserId={user?.id ?? null}
              isMenuOpen={menuQuestionId === item.id}
              onDelete={() => confirmDeleteQuestion(item)}
              onEdit={() => {
                setMenuQuestionId(null);
                setEditingQuestion(item);
                setQuestionActionError(null);
                setQuestionActionNotice(null);
              }}
              onMenuToggle={() =>
                setMenuQuestionId((currentId) =>
                  currentId === item.id ? null : item.id,
                )
              }
              onPress={() => setSelectedQuestionId(item.id)}
              question={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function QuestionDetailScreen({
  onBack,
  questionId,
}: {
  onBack: () => void;
  questionId: string;
}) {
  const { requireAuth, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null);
  const [editingReply, setEditingReply] = useState<QuestionReplyItem | null>(
    null,
  );
  const [isDeletingQuestion, setIsDeletingQuestion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [menuQuestionId, setMenuQuestionId] = useState<string | null>(null);
  const [menuReplyId, setMenuReplyId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionListItem | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<QuestionListItem | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [replies, setReplies] = useState<QuestionReplyItem[]>([]);

  const loadDetail = useCallback(
    async (refreshing = false) => {
      setError(null);
      setIsLoading(!refreshing);
      setIsRefreshing(refreshing);

      try {
        const [nextQuestion, nextReplies] = await Promise.all([
          getQuestionDetail(questionId),
          listQuestionReplies(questionId),
        ]);

        setQuestion(nextQuestion);
        setReplies(nextReplies);
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'Unable to load replies.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [questionId],
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  function openReplyForm() {
    if (
      !requireAuth({
        actionLabel: 'Reply to a question',
        description: 'Posting replies requires an account.',
        onReady: () => setIsReplyOpen(true),
      })
    ) {
      return;
    }

    setIsReplyOpen(true);
  }

  function confirmDeleteCurrentQuestion() {
    if (!question) {
      return;
    }

    setMenuQuestionId(null);
    Alert.alert(
      'Delete question?',
      'This deletes the question. Existing replies are deleted by the database cascade.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => {
            void removeCurrentQuestion();
          },
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  }

  async function removeCurrentQuestion() {
    if (!question || isDeletingQuestion) {
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setIsDeletingQuestion(true);

    try {
      await deleteQuestion(question.id);
      onBack();
    } catch (nextError) {
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to delete question.',
      );
    } finally {
      setIsDeletingQuestion(false);
    }
  }

  function confirmDeleteReply(reply: QuestionReplyItem) {
    setMenuReplyId(null);
    Alert.alert('Delete reply?', 'This removes your reply.', [
      { style: 'cancel', text: 'Cancel' },
      {
        onPress: () => {
          void removeReply(reply.id);
        },
        style: 'destructive',
        text: 'Delete',
      },
    ]);
  }

  async function removeReply(replyId: string) {
    if (deletingReplyId) {
      return;
    }

    setActionError(null);
    setActionNotice(null);
    setDeletingReplyId(replyId);

    try {
      await deleteQuestionReply(replyId);
      setActionNotice('Reply deleted.');
      await loadDetail(true);
    } catch (nextError) {
      setActionError(
        nextError instanceof Error ? nextError.message : 'Unable to delete reply.',
      );
    } finally {
      setDeletingReplyId(null);
    }
  }

  return (
    <Screen scroll={false}>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateText}>Loading replies...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[
            styles.listContent,
            replies.length === 0 && styles.detailList,
          ]}
          data={replies}
          keyExtractor={(reply) => reply.id}
          ListEmptyComponent={
            error || !question ? null : (
              <EmptyState
                body="Be the first to add a reply."
                title="No replies yet"
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
                <Ionicons color={colors.accent} name="chevron-back" size={18} />
                <Text style={styles.backText}>Questions</Text>
              </Pressable>
              {question ? (
                <QuestionCard
                  currentUserId={user?.id ?? null}
                  isMenuOpen={menuQuestionId === question.id}
                  onDelete={confirmDeleteCurrentQuestion}
                  onEdit={() => {
                    setMenuQuestionId(null);
                    setEditingQuestion(question);
                    setActionError(null);
                    setActionNotice(null);
                  }}
                  onMenuToggle={() =>
                    setMenuQuestionId((currentId) =>
                      currentId === question.id ? null : question.id,
                    )
                  }
                  question={question}
                />
              ) : null}
              {editingQuestion ? (
                <QuestionEditForm
                  onCancel={() => setEditingQuestion(null)}
                  onSaved={() => {
                    setEditingQuestion(null);
                    setActionNotice('Question updated.');
                    void loadDetail(true);
                  }}
                  question={editingQuestion}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={openReplyForm}
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons color={colors.accent} name="chatbubble-outline" size={18} />
                <Text style={styles.secondaryActionText}>Reply</Text>
              </Pressable>
              {isReplyOpen && question ? (
                <ReplyComposer
                  onCancel={() => setIsReplyOpen(false)}
                  onCreated={() => {
                    setIsReplyOpen(false);
                    void loadDetail(true);
                  }}
                  questionId={question.id}
                  userId={user?.id ?? null}
                />
              ) : null}
              {editingReply ? (
                <ReplyEditForm
                  onCancel={() => setEditingReply(null)}
                  onSaved={() => {
                    setEditingReply(null);
                    setActionNotice('Reply updated.');
                    void loadDetail(true);
                  }}
                  reply={editingReply}
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
              {isDeletingQuestion ? (
                <Text style={styles.actionStatus}>Deleting question...</Text>
              ) : null}
              {deletingReplyId ? (
                <Text style={styles.actionStatus}>Deleting reply...</Text>
              ) : null}
              {error ? (
                <View style={styles.errorWrap}>
                  <StatusMessage message={error} tone="error" />
                  <RetryButton onPress={() => loadDetail()} />
                </View>
              ) : null}
              {!question && !error ? (
                <EmptyState
                  body="This question may have been removed."
                  title="Question unavailable"
                />
              ) : null}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              tintColor={colors.accent}
              onRefresh={() => loadDetail(true)}
            />
          }
          renderItem={({ item }) => (
            <ReplyCard
              currentUserId={user?.id ?? null}
              isMenuOpen={menuReplyId === item.id}
              onDelete={() => confirmDeleteReply(item)}
              onEdit={() => {
                setMenuReplyId(null);
                setEditingReply(item);
                setActionError(null);
                setActionNotice(null);
              }}
              onMenuToggle={() =>
                setMenuReplyId((currentId) =>
                  currentId === item.id ? null : item.id,
                )
              }
              reply={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

function QuestionComposer({
  onCancel,
  onCreated,
  userId,
}: {
  onCancel: () => void;
  onCreated: () => void;
  userId: string | null;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!userId) {
      setError('Sign in before asking a question.');
      return;
    }

    if (!trimmedTitle || !trimmedBody) {
      setError('Add both a title and body before posting.');
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      await createQuestion({
        body: trimmedBody,
        created_at: new Date().toISOString(),
        title: trimmedTitle,
        user_id: userId,
      });
      setNotice('Question posted.');
      setBody('');
      setTitle('');
      onCreated();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to post question.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ComposePanel
      body={body}
      bodyPlaceholder="Add enough context for someone to answer"
      error={error}
      isSubmitting={isSubmitting}
      notice={notice}
      onBodyChange={setBody}
      onCancel={onCancel}
      onSubmit={submit}
      onTitleChange={setTitle}
      submitLabel="Post question"
      title={title}
      titlePlaceholder="Question title"
    />
  );
}

function ReplyComposer({
  onCancel,
  onCreated,
  questionId,
  userId,
}: {
  onCancel: () => void;
  onCreated: () => void;
  questionId: string;
  userId: string | null;
}) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const trimmedBody = body.trim();

    if (!userId) {
      setError('Sign in before replying.');
      return;
    }

    if (!trimmedBody) {
      setError('Add a reply before posting.');
      return;
    }

    setError(null);
    setNotice(null);
    setIsSubmitting(true);

    try {
      await createQuestionReply({
        body: trimmedBody,
        created_at: new Date().toISOString(),
        question_id: questionId,
        user_id: userId,
      });
      setNotice('Reply posted.');
      setBody('');
      onCreated();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to post reply.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ComposePanel
      body={body}
      bodyPlaceholder="Write a reply"
      error={error}
      isSubmitting={isSubmitting}
      notice={notice}
      onBodyChange={setBody}
      onCancel={onCancel}
      onSubmit={submit}
      submitLabel="Post reply"
    />
  );
}

function QuestionEditForm({
  onCancel,
  onSaved,
  question,
}: {
  onCancel: () => void;
  onSaved: () => void;
  question: QuestionListItem;
}) {
  const [body, setBody] = useState(question.body);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(question.title);

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      setError('Title and body cannot be empty.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateQuestion({
        body: trimmedBody,
        id: question.id,
        title: trimmedTitle,
      });
      onSaved();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to update question.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ComposePanel
      body={body}
      bodyPlaceholder="Question details"
      error={error}
      isSubmitting={isSubmitting}
      notice={null}
      onBodyChange={setBody}
      onCancel={onCancel}
      onSubmit={submit}
      onTitleChange={setTitle}
      submitLabel="Save question"
      title={title}
      titlePlaceholder="Question title"
    />
  );
}

function ReplyEditForm({
  onCancel,
  onSaved,
  reply,
}: {
  onCancel: () => void;
  onSaved: () => void;
  reply: QuestionReplyItem;
}) {
  const [body, setBody] = useState(reply.body);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    if (isSubmitting) {
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      setError('Reply cannot be empty.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await updateQuestionReply({
        body: trimmedBody,
        id: reply.id,
      });
      onSaved();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Unable to update reply.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ComposePanel
      body={body}
      bodyPlaceholder="Reply"
      error={error}
      isSubmitting={isSubmitting}
      notice={null}
      onBodyChange={setBody}
      onCancel={onCancel}
      onSubmit={submit}
      submitLabel="Save reply"
    />
  );
}

function ComposePanel({
  body,
  bodyPlaceholder,
  error,
  isSubmitting,
  notice,
  onBodyChange,
  onCancel,
  onSubmit,
  onTitleChange,
  submitLabel,
  title,
  titlePlaceholder,
}: {
  body: string;
  bodyPlaceholder: string;
  error: string | null;
  isSubmitting: boolean;
  notice: string | null;
  onBodyChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  onTitleChange?: (value: string) => void;
  submitLabel: string;
  title?: string;
  titlePlaceholder?: string;
}) {
  return (
    <View style={styles.composer}>
      {onTitleChange ? (
        <TextInput
          editable={!isSubmitting}
          onChangeText={onTitleChange}
          placeholder={titlePlaceholder}
          placeholderTextColor={colors.quiet}
          style={styles.input}
          value={title}
        />
      ) : null}
      <TextInput
        editable={!isSubmitting}
        multiline
        onChangeText={onBodyChange}
        placeholder={bodyPlaceholder}
        placeholderTextColor={colors.quiet}
        style={[styles.input, styles.bodyInput]}
        textAlignVertical="top"
        value={body}
      />
      {notice ? <StatusMessage message={notice} tone="success" /> : null}
      {error ? <StatusMessage message={error} tone="error" /> : null}
      <View style={styles.composerActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && !isSubmitting && styles.pressed,
            isSubmitting && styles.disabled,
          ]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onSubmit}
          style={({ pressed }) => [
            styles.submitButton,
            pressed && !isSubmitting && styles.pressed,
            isSubmitting && styles.disabled,
          ]}
        >
          <Text style={styles.submitText}>
            {isSubmitting ? 'Posting...' : submitLabel}
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

function dedupeQuestions(questions: QuestionListItem[]) {
  const seen = new Set<string>();

  return questions.filter((question) => {
    if (seen.has(question.id)) {
      return false;
    }

    seen.add(question.id);
    return true;
  });
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
    minHeight: 40,
  },
  backText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  actionStatus: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  bodyInput: {
    minHeight: 104,
  },
  cancelButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  composer: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  composerActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailList: {
    flexGrow: 1,
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
  emptyList: {
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
    marginBottom: spacing.md,
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
  footer: {
    paddingVertical: spacing.lg,
  },
  input: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    padding: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  messageWrap: {
    marginBottom: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    minHeight: 48,
  },
  primaryActionText: {
    color: '#03100c',
    fontSize: 15,
    fontWeight: '800',
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
  secondaryAction: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    minHeight: 42,
    paddingHorizontal: spacing.lg,
  },
  secondaryActionText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  submitText: {
    color: '#03100c',
    fontSize: 14,
    fontWeight: '800',
  },
});
