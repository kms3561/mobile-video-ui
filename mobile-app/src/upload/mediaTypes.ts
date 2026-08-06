import type { MediaType } from '../lib/database.types';

export type PickedMedia = {
  extension: string;
  mediaType: MediaType;
  mimeType: string;
  name: string;
  size: number | null;
  uri: string;
};

export const maxUploadSizeLimit = 50 * 1024 * 1024;

export const maxFileSizeByType: Record<MediaType, number> = {
  image: maxUploadSizeLimit,
  video: maxUploadSizeLimit,
  audio: maxUploadSizeLimit,
};

export const acceptedMimeTypes = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],
  video: ['video/mp4', 'video/quicktime'],
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/mp4',
    'audio/m4a',
    'audio/x-m4a',
  ],
} satisfies Record<MediaType, string[]>;

export const acceptedExtensions = {
  image: ['jpg', 'jpeg', 'png', 'heic', 'heif'],
  video: ['mp4', 'mov'],
  audio: ['mp3', 'wav', 'm4a'],
} satisfies Record<MediaType, string[]>;

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function getExtension(fileNameOrUri: string) {
  const cleanValue = fileNameOrUri.split('?')[0] ?? fileNameOrUri;
  const extension = cleanValue.split('.').pop()?.toLowerCase();

  return extension && extension !== cleanValue ? extension : '';
}

export function getMediaTypeFromMime(
  mimeType: string | null | undefined,
): MediaType | null {
  if (!mimeType) {
    return null;
  }

  if (acceptedMimeTypes.image.includes(mimeType)) {
    return 'image';
  }

  if (acceptedMimeTypes.video.includes(mimeType)) {
    return 'video';
  }

  if (acceptedMimeTypes.audio.includes(mimeType)) {
    return 'audio';
  }

  return null;
}

export function getMediaTypeFromExtension(extension: string): MediaType | null {
  if (acceptedExtensions.image.includes(extension)) {
    return 'image';
  }

  if (acceptedExtensions.video.includes(extension)) {
    return 'video';
  }

  if (acceptedExtensions.audio.includes(extension)) {
    return 'audio';
  }

  return null;
}

export function normalizeMimeType(
  mediaType: MediaType,
  mimeType: string | null | undefined,
  extension: string,
) {
  if (mimeType && acceptedMimeTypes[mediaType].includes(mimeType)) {
    return mimeType;
  }

  const fallbackByExtension: Record<string, string> = {
    heic: 'image/heic',
    heif: 'image/heif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    m4a: 'audio/mp4',
    mov: 'video/quicktime',
    mp3: 'audio/mpeg',
    mp4: mediaType === 'audio' ? 'audio/mp4' : 'video/mp4',
    png: 'image/png',
    wav: 'audio/wav',
  };

  return fallbackByExtension[extension] ?? acceptedMimeTypes[mediaType][0];
}

export function validatePickedMedia(media: PickedMedia): string | null {
  const acceptedExtensionsForType = acceptedExtensions[media.mediaType];
  const acceptedMimeTypesForType = acceptedMimeTypes[media.mediaType];

  if (
    !acceptedExtensionsForType.includes(media.extension) &&
    !acceptedMimeTypesForType.includes(media.mimeType)
  ) {
    return 'Choose a JPEG, PNG, HEIC, MP4, MOV, MP3, WAV, or M4A file.';
  }

  if (media.size !== null && media.size > maxFileSizeByType[media.mediaType]) {
    return `Files can be up to ${formatBytes(maxUploadSizeLimit)}. Choose a smaller file.`;
  }

  return null;
}
