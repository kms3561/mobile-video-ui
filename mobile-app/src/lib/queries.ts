import { supabase } from './supabase';
import type {
  Database,
  MediaComment,
  MediaPost,
  Profile,
  Question,
  QuestionReply,
} from './database.types';

type Tables = Database['public']['Tables'];
type FeedProfile = Pick<Profile, 'avatar_url' | 'display_name' | 'username'>;

export const usernamePattern = /^[A-Za-z0-9_]{3,20}$/;
export const generatedUsernamePattern = /^user_[a-f0-9]{12}$/;

export type MediaFeedItem = MediaPost & {
  commentCount: number;
  profile: FeedProfile | null;
  resolvedFileUrl: string | null;
};

export type MediaFeedPage = {
  items: MediaFeedItem[];
  nextCursor: string | null;
};

export type MediaCommentItem = MediaComment & {
  profile: FeedProfile | null;
};

export type QuestionListItem = Question & {
  profile: FeedProfile | null;
  replyCount: number;
};

export type QuestionReplyItem = QuestionReply & {
  profile: FeedProfile | null;
};

export type QuestionPage = {
  items: QuestionListItem[];
  nextCursor: string | null;
};

function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add Expo public Supabase environment variables.',
    );
  }

  return supabase;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProfile(
  profile: Tables['profiles']['Insert'],
): Promise<Profile> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .upsert(profile)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function normalizeUsername(username: string) {
  return username.trim();
}

export function validateUsername(username: string) {
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername) {
    return 'Choose a username.';
  }

  if (!usernamePattern.test(normalizedUsername)) {
    return 'Use 3-20 letters, numbers, or underscores.';
  }

  return null;
}

export function needsUsernameSetup(profile: Profile | null) {
  return !profile || generatedUsernamePattern.test(profile.username);
}

export async function updateProfileUsername({
  displayName,
  userId,
  username,
}: {
  displayName?: string;
  userId: string;
  username: string;
}): Promise<Profile> {
  const normalizedUsername = normalizeUsername(username);
  const validationError = validateUsername(normalizedUsername);

  if (validationError) {
    throw new Error(validationError);
  }

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update({
      display_name: displayName ?? normalizedUsername,
      username: normalizedUsername,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    const message = error.message.toLowerCase();

    if (
      error.code === '23505' ||
      message.includes('duplicate') ||
      message.includes('profiles_username_lower_unique')
    ) {
      throw new Error('That username is already taken.');
    }

    throw error;
  }

  return data;
}

export async function listMediaPosts(limit = 20): Promise<MediaPost[]> {
  const { data, error } = await getSupabaseClient()
    .from('media_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getMediaCommentCounts(mediaPostIds: string[]) {
  const countMap = new Map<string, number>();

  if (mediaPostIds.length === 0) {
    return countMap;
  }

  const { data, error } = await getSupabaseClient()
    .from('media_comments')
    .select('media_post_id')
    .in('media_post_id', mediaPostIds);

  if (error) {
    throw error;
  }

  for (const comment of data ?? []) {
    countMap.set(
      comment.media_post_id,
      (countMap.get(comment.media_post_id) ?? 0) + 1,
    );
  }

  return countMap;
}

function normalizeStoragePath(fileUrlOrPath: string) {
  return fileUrlOrPath.replace(/^\/+/, '').replace(/^media\//, '');
}

export function resolveMediaFileUrl(fileUrlOrPath: string | null | undefined) {
  const value = fileUrlOrPath?.trim();

  if (!value) {
    return null;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  if (!supabase) {
    return value;
  }

  const { data } = supabase.storage
    .from(mediaStorageBucket)
    .getPublicUrl(normalizeStoragePath(value));

  return data.publicUrl || null;
}

export async function listMediaFeedPage({
  cursor = null,
  pageSize = 10,
}: {
  cursor?: string | null;
  pageSize?: number;
} = {}): Promise<MediaFeedPage> {
  let query = getSupabaseClient()
    .from('media_posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(pageSize + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, pageSize);
  const userIds = Array.from(new Set(pageRows.map((post) => post.user_id)));
  const profileMap = new Map<string, FeedProfile>();
  const commentCountMap = await getMediaCommentCounts(
    pageRows.map((post) => post.id),
  );

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await getSupabaseClient()
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    if (profileError) {
      throw profileError;
    }

    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, {
        avatar_url: profile.avatar_url,
        display_name: profile.display_name,
        username: profile.username,
      });
    }
  }

  return {
    items: pageRows.map((post) => ({
      ...post,
      commentCount: commentCountMap.get(post.id) ?? 0,
      profile: profileMap.get(post.user_id) ?? null,
      resolvedFileUrl: resolveMediaFileUrl(post.file_url),
    })),
    nextCursor:
      rows.length > pageSize
        ? (pageRows[pageRows.length - 1]?.created_at ?? null)
        : null,
  };
}

export async function getMediaPostDetail(
  mediaPostId: string,
): Promise<MediaFeedItem | null> {
  const { data, error } = await getSupabaseClient()
    .from('media_posts')
    .select('*')
    .eq('id', mediaPostId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [profileMap, commentCountMap] = await Promise.all([
    getProfilesByUserId([data.user_id]),
    getMediaCommentCounts([data.id]),
  ]);

  return {
    ...data,
    commentCount: commentCountMap.get(data.id) ?? 0,
    profile: profileMap.get(data.user_id) ?? null,
    resolvedFileUrl: resolveMediaFileUrl(data.file_url),
  };
}

export async function createMediaPost(
  post: Tables['media_posts']['Insert'],
): Promise<MediaPost> {
  const { data, error } = await getSupabaseClient()
    .from('media_posts')
    .insert(post)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateMediaPostCaption({
  caption,
  id,
}: {
  caption: string;
  id: string;
}): Promise<MediaPost> {
  const { data, error } = await getSupabaseClient()
    .from('media_posts')
    .update({ caption })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export function getMediaStoragePath(fileUrlOrPath: string | null | undefined) {
  const value = fileUrlOrPath?.trim();

  if (!value) {
    return null;
  }

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return normalizeStoragePath(value);
  }

  try {
    const parsedUrl = new URL(value);
    const marker = `/storage/v1/object/public/${mediaStorageBucket}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(
      parsedUrl.pathname.slice(markerIndex + marker.length),
    );
  } catch {
    return null;
  }
}

export async function deleteMediaPostWithFile(post: MediaPost) {
  const storagePath = getMediaStoragePath(post.file_url);

  if (!storagePath) {
    throw new Error('storage: Unable to determine the media file path.');
  }

  const { error: storageError } = await getSupabaseClient()
    .storage.from(mediaStorageBucket)
    .remove([storagePath]);

  if (storageError) {
    throw new Error(`storage: ${storageError.message}`);
  }

  const { error: databaseError } = await getSupabaseClient()
    .from('media_posts')
    .delete()
    .eq('id', post.id);

  if (databaseError) {
    throw new Error(`database: ${databaseError.message}`);
  }
}

export async function listQuestions(limit = 20): Promise<Question[]> {
  const { data, error } = await getSupabaseClient()
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getProfilesByUserId(userIds: string[]) {
  const profileMap = new Map<string, FeedProfile>();

  if (userIds.length === 0) {
    return profileMap;
  }

  const { data: profiles, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', Array.from(new Set(userIds)));

  if (error) {
    throw error;
  }

  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, {
      avatar_url: profile.avatar_url,
      display_name: profile.display_name,
      username: profile.username,
    });
  }

  return profileMap;
}

async function getReplyCounts(questionIds: string[]) {
  const countMap = new Map<string, number>();

  if (questionIds.length === 0) {
    return countMap;
  }

  const { data, error } = await getSupabaseClient()
    .from('question_replies')
    .select('question_id')
    .in('question_id', questionIds);

  if (error) {
    throw error;
  }

  for (const reply of data ?? []) {
    countMap.set(reply.question_id, (countMap.get(reply.question_id) ?? 0) + 1);
  }

  return countMap;
}

export async function listQuestionPage({
  cursor = null,
  pageSize = 10,
}: {
  cursor?: string | null;
  pageSize?: number;
} = {}): Promise<QuestionPage> {
  let query = getSupabaseClient()
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(pageSize + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const pageRows = rows.slice(0, pageSize);
  const [profileMap, replyCountMap] = await Promise.all([
    getProfilesByUserId(pageRows.map((question) => question.user_id)),
    getReplyCounts(pageRows.map((question) => question.id)),
  ]);

  return {
    items: pageRows.map((question) => ({
      ...question,
      profile: profileMap.get(question.user_id) ?? null,
      replyCount: replyCountMap.get(question.id) ?? 0,
    })),
    nextCursor:
      rows.length > pageSize
        ? (pageRows[pageRows.length - 1]?.created_at ?? null)
        : null,
  };
}

export async function getQuestionDetail(
  questionId: string,
): Promise<QuestionListItem | null> {
  const { data, error } = await getSupabaseClient()
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const [profileMap, replyCountMap] = await Promise.all([
    getProfilesByUserId([data.user_id]),
    getReplyCounts([data.id]),
  ]);

  return {
    ...data,
    profile: profileMap.get(data.user_id) ?? null,
    replyCount: replyCountMap.get(data.id) ?? 0,
  };
}

export async function listQuestionReplies(
  questionId: string,
): Promise<QuestionReplyItem[]> {
  const { data, error } = await getSupabaseClient()
    .from('question_replies')
    .select('*')
    .eq('question_id', questionId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const profileMap = await getProfilesByUserId(
    rows.map((reply) => reply.user_id),
  );

  return rows.map((reply) => ({
    ...reply,
    profile: profileMap.get(reply.user_id) ?? null,
  }));
}

export async function createQuestion(
  question: Tables['questions']['Insert'],
): Promise<Question> {
  const { data, error } = await getSupabaseClient()
    .from('questions')
    .insert(question)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateQuestion({
  body,
  id,
  title,
}: {
  body: string;
  id: string;
  title: string;
}): Promise<Question> {
  const { data, error } = await getSupabaseClient()
    .from('questions')
    .update({ body, title })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteQuestion(id: string) {
  const { error } = await getSupabaseClient()
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function createQuestionReply(
  reply: Tables['question_replies']['Insert'],
) {
  const { data, error } = await getSupabaseClient()
    .from('question_replies')
    .insert(reply)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateQuestionReply({
  body,
  id,
}: {
  body: string;
  id: string;
}): Promise<QuestionReply> {
  const { data, error } = await getSupabaseClient()
    .from('question_replies')
    .update({ body })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteQuestionReply(id: string) {
  const { error } = await getSupabaseClient()
    .from('question_replies')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function createMediaComment(
  comment: Tables['media_comments']['Insert'],
) {
  const { data, error } = await getSupabaseClient()
    .from('media_comments')
    .insert(comment)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listMediaComments(
  mediaPostId: string,
): Promise<MediaCommentItem[]> {
  const { data, error } = await getSupabaseClient()
    .from('media_comments')
    .select('*')
    .eq('media_post_id', mediaPostId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  const profileMap = await getProfilesByUserId(
    rows.map((comment) => comment.user_id),
  );

  return rows.map((comment) => ({
    ...comment,
    profile: profileMap.get(comment.user_id) ?? null,
  }));
}

export async function updateMediaComment({
  body,
  id,
}: {
  body: string;
  id: string;
}): Promise<MediaComment> {
  const { data, error } = await getSupabaseClient()
    .from('media_comments')
    .update({ body })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteMediaComment(id: string) {
  const { error } = await getSupabaseClient()
    .from('media_comments')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export const mediaStorageBucket = 'media';
