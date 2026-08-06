import * as FileSystem from 'expo-file-system/legacy';
import * as tus from 'tus-js-client';

import {
  createMediaPost,
  getProfile,
  mediaStorageBucket,
  upsertProfile,
} from '../lib/queries';
import { supabase } from '../lib/supabase';
import type { PickedMedia } from './mediaTypes';
import {
  formatBytes,
  maxUploadSizeLimit,
  validatePickedMedia,
} from './mediaTypes';
import { notifyMediaUploadComplete } from './uploadEvents';
import { UploadStepError } from './uploadErrors';

type UploadMediaOptions = {
  caption: string;
  media: PickedMedia;
  onProgress?: (progress: number, status: string) => void;
  userEmail?: string | null;
  userId: string;
};

type TusUploadFile = {
  name: string;
  size?: number;
  type: string;
  uri: string;
};
type TusUploadInput = ConstructorParameters<typeof tus.Upload>[0];

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createStoragePath(userId: string, media: PickedMedia) {
  const extension = media.extension ? `.${media.extension}` : '';
  const timestamp = Date.now();
  const baseName = sanitizeFileName(media.name.replace(/\.[^.]+$/, ''));

  return `${userId}/${timestamp}-${baseName || 'media'}${extension}`;
}

function createResumableEndpoint() {
  if (!supabase) {
    throw new UploadStepError('session', 'Supabase is not configured.');
  }

  const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (!configuredUrl) {
    throw new UploadStepError('session', 'Supabase URL is not configured.');
  }

  try {
    const parsedUrl = new URL(configuredUrl);
    const projectId = parsedUrl.hostname.split('.')[0];

    return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
  } catch (error) {
    throw new UploadStepError('session', 'Invalid Supabase URL.', error);
  }
}

async function ensureProfile(userId: string, userEmail?: string | null) {
  let existingProfile;

  try {
    existingProfile = await getProfile(userId);
  } catch (error) {
    throw new UploadStepError('profile', 'Unable to load profile.', error);
  }

  if (existingProfile) {
    return existingProfile;
  }

  const username = `user_${userId.replace(/-/g, '').slice(0, 12)}`;
  const displayName = userEmail?.split('@')[0] || username;

  try {
    return await upsertProfile({
      display_name: displayName,
      id: userId,
      username,
    });
  } catch (error) {
    throw new UploadStepError('profile', 'Unable to create profile.', error);
  }
}

async function validateLocalFile(media: PickedMedia) {
  try {
    const fileInfo = await FileSystem.getInfoAsync(media.uri);

    if (!fileInfo.exists) {
      throw new Error(`Local file does not exist at URI: ${media.uri}`);
    }

    if (typeof fileInfo.size === 'number' && fileInfo.size > maxUploadSizeLimit) {
      throw new Error(
        `File exceeds ${formatBytes(maxUploadSizeLimit)}. Choose a smaller file.`,
      );
    }
  } catch (error) {
    throw new UploadStepError('file-read', 'Unable to read local file.', error);
  }
}

function uploadFileWithTus({
  accessToken,
  media,
  onProgress,
  storagePath,
}: {
  accessToken: string;
  media: PickedMedia;
  onProgress?: (progress: number, status: string) => void;
  storagePath: string;
}) {
  const file: TusUploadFile = {
    name: media.name,
    size: media.size ?? undefined,
    type: media.mimeType,
    uri: media.uri,
  };

  return new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file as unknown as TusUploadInput, {
      chunkSize: 6 * 1024 * 1024,
      endpoint: createResumableEndpoint(),
      headers: {
        authorization: `Bearer ${accessToken}`,
        'x-upsert': 'false',
      },
      metadata: {
        bucketName: mediaStorageBucket,
        cacheControl: '3600',
        contentType: media.mimeType,
        objectName: storagePath,
      },
      onError: (error) => {
        reject(error);
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const uploadProgress =
          bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
        const boundedProgress = Math.min(81, 20 + Math.round(uploadProgress * 0.61));
        onProgress?.(boundedProgress, `Uploading file... ${uploadProgress}%`);
      },
      onSuccess: () => {
        resolve();
      },
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
    });

    upload.start();
  });
}

export async function uploadMediaPost({
  caption,
  media,
  onProgress,
  userEmail,
  userId,
}: UploadMediaOptions) {
  if (!supabase) {
    throw new UploadStepError('session', 'Supabase is not configured.');
  }

  const trimmedCaption = caption.trim();
  if (!trimmedCaption) {
    throw new UploadStepError('validation', 'Add a caption before uploading.');
  }

  const validationError = validatePickedMedia(media);
  if (validationError) {
    throw new UploadStepError('validation', validationError);
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw new UploadStepError('session', 'Unable to confirm session.', sessionError);
  }

  if (!sessionData.session || sessionData.session.user.id !== userId) {
    throw new UploadStepError(
      'session',
      'No active authenticated session was found for this upload.',
    );
  }

  const storagePath = createStoragePath(userId, media);
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new UploadStepError(
      'validation',
      'Generated storage path does not start with the authenticated user ID.',
    );
  }

  onProgress?.(10, 'Checking account...');
  await ensureProfile(userId, userEmail);

  onProgress?.(16, 'Preparing file...');
  await validateLocalFile(media);

  onProgress?.(20, 'Starting resumable upload...');
  try {
    await uploadFileWithTus({
      accessToken: sessionData.session.access_token,
      media,
      onProgress,
      storagePath,
    });
  } catch (error) {
    throw new UploadStepError(
      'storage',
      'Storage upload failed or the connection was interrupted. Check your connection and try again.',
      error,
    );
  }

  onProgress?.(82, 'Saving post...');
  const { data: publicUrlData } = supabase.storage
    .from(mediaStorageBucket)
    .getPublicUrl(storagePath);

  let post;

  try {
    post = await createMediaPost({
      caption: trimmedCaption,
      created_at: new Date().toISOString(),
      file_url: publicUrlData.publicUrl,
      media_type: media.mediaType,
      thumbnail_url: null,
      user_id: userId,
    });
  } catch (error) {
    throw new UploadStepError(
      'database',
      `Storage upload succeeded at ${storagePath}, but media_posts insert failed.`,
      error,
    );
  }

  onProgress?.(100, 'Upload complete.');
  notifyMediaUploadComplete();

  return post;
}
