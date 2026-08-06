import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import type { PickedMedia } from './mediaTypes';
import {
  acceptedMimeTypes,
  getExtension,
  getMediaTypeFromExtension,
  getMediaTypeFromMime,
  normalizeMimeType,
  validatePickedMedia,
} from './mediaTypes';

export type PickMediaResult =
  | { canceled: true }
  | { canceled: false; media: PickedMedia };

export async function pickImageOrVideo(): Promise<PickMediaResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Photo library permission is required to choose images or videos.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ['images', 'videos'],
    quality: 1,
    selectionLimit: 1,
  });

  if (result.canceled || result.assets.length === 0) {
    return { canceled: true };
  }

  const asset = result.assets[0];
  const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'selected-media';
  const extension = getExtension(name || asset.uri);
  const mediaType =
    getMediaTypeFromMime(asset.mimeType) ??
    getMediaTypeFromExtension(extension) ??
    (asset.type === 'video' ? 'video' : 'image');
  const mimeType = normalizeMimeType(mediaType, asset.mimeType, extension);

  const media = {
    extension,
    mediaType,
    mimeType,
    name,
    size: await getFileSize(asset.uri, asset.fileSize),
    uri: asset.uri,
  };

  const validationError = validatePickedMedia(media);
  if (validationError) {
    throw new Error(validationError);
  }

  return { canceled: false, media };
}

export async function pickAudio(): Promise<PickMediaResult> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: acceptedMimeTypes.audio,
  });

  if (result.canceled || !result.assets?.[0]) {
    return { canceled: true };
  }

  const asset = result.assets[0];
  const extension = getExtension(asset.name || asset.uri);
  const mediaType = getMediaTypeFromMime(asset.mimeType) ?? 'audio';
  const mimeType = normalizeMimeType(mediaType, asset.mimeType, extension);

  const media = {
    extension,
    mediaType,
    mimeType,
    name: asset.name || 'selected-audio',
    size: await getFileSize(asset.uri, asset.size),
    uri: asset.uri,
  };

  const validationError = validatePickedMedia(media);
  if (validationError) {
    throw new Error(validationError);
  }

  return { canceled: false, media };
}

async function getFileSize(uri: string, pickerSize?: number | null) {
  if (typeof pickerSize === 'number' && pickerSize > 0) {
    return pickerSize;
  }

  const info = await FileSystem.getInfoAsync(uri);

  if (info.exists && typeof info.size === 'number') {
    return info.size;
  }

  return null;
}
