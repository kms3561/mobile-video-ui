import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../auth/AuthContext';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusMessage } from '../components/StatusMessage';
import { colors, radii, spacing } from '../theme';
import { pickAudio, pickImageOrVideo } from '../upload/mediaPicker';
import type { PickedMedia } from '../upload/mediaTypes';
import { formatBytes } from '../upload/mediaTypes';
import { formatUploadError } from '../upload/uploadErrors';
import { uploadMediaPost } from '../upload/uploadMedia';

export function UploadScreen() {
  const { requireAuth, user } = useAuth();
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function chooseMedia(type: 'audio' | 'visual') {
    if (
      !requireAuth({
        actionLabel: type === 'audio' ? 'Upload audio' : 'Upload media',
        description: 'Uploading files requires an account.',
        onReady: () => {
          void chooseMedia(type);
        },
      })
    ) {
      return;
    }

    if (isUploading) {
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const result = type === 'audio' ? await pickAudio() : await pickImageOrVideo();

      if (!result.canceled) {
        setMedia(result.media);
        setProgress(0);
      }
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Unable to choose that file.',
      );
    }
  }

  async function submitUpload() {
    if (
      !requireAuth({
        actionLabel: 'Upload media',
        description: 'Uploading files requires an account.',
        onReady: () => {
          void submitUpload();
        },
      })
    ) {
      return;
    }

    if (!user || isUploading) {
      return;
    }

    if (!media) {
      setError('Choose a file before uploading.');
      return;
    }

    setError(null);
    setStatus(null);
    setIsUploading(true);
    setProgress(0);

    try {
      await uploadMediaPost({
        caption,
        media,
        onProgress: (nextProgress, nextStatus) => {
          setProgress(nextProgress);
          setStatus(nextStatus);
        },
        userEmail: user.email,
        userId: user.id,
      });

      setStatus('Upload saved.');
      setProgress(100);
      setCaption('');
      setMedia(null);
    } catch (nextError) {
      const formattedError = formatUploadError(nextError);
      console.error('Upload failed', formattedError, nextError);
      setError(formattedError);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader eyebrow="Create" title="Upload" />
      <View style={styles.panel}>
        <Ionicons color={colors.accent} name="cloud-upload-outline" size={46} />
        <Text style={styles.title}>Upload Media</Text>
        <Text style={styles.body}>
          Choose an image, video, or audio file. Successful uploads appear in
          the public feed.
        </Text>

        <View style={styles.actions}>
          <PickerButton
            disabled={isUploading}
            icon="image-outline"
            label="Image or video"
            onPress={() => chooseMedia('visual')}
          />
          <PickerButton
            disabled={isUploading}
            icon="musical-notes-outline"
            label="Audio"
            onPress={() => chooseMedia('audio')}
          />
        </View>

        {media ? <MediaPreview media={media} /> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Caption</Text>
          <TextInput
            editable={!isUploading}
            multiline
            onChangeText={setCaption}
            placeholder="Write a short caption"
            placeholderTextColor={colors.quiet}
            style={styles.captionInput}
            value={caption}
          />
        </View>

        {status ? <StatusMessage message={status} tone="success" /> : null}
        {error ? <StatusMessage message={error} tone="error" /> : null}

        {isUploading ? (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isUploading}
          onPress={submitUpload}
          style={({ pressed }) => [
            styles.uploadButton,
            pressed && !isUploading && styles.pressed,
            isUploading && styles.disabled,
          ]}
        >
          <Text style={styles.uploadButtonText}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

type PickerButtonProps = {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

function PickerButton({ disabled, icon, label, onPress }: PickerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pickerButton,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Ionicons color={colors.accent} name={icon} size={20} />
      <Text style={styles.pickerButtonText}>{label}</Text>
    </Pressable>
  );
}

function MediaPreview({ media }: { media: PickedMedia }) {
  return (
    <View style={styles.preview}>
      {media.mediaType === 'image' ? (
        <Image source={{ uri: media.uri }} style={styles.previewImage} />
      ) : (
        <View style={styles.fileIcon}>
          <Ionicons
            color={colors.accent}
            name={
              media.mediaType === 'video'
                ? 'videocam-outline'
                : 'musical-notes-outline'
            }
            size={34}
          />
        </View>
      )}
      <View style={styles.previewCopy}>
        <Text numberOfLines={1} style={styles.previewName}>
          {media.name}
        </Text>
        <Text style={styles.previewMeta}>
          {media.mediaType.toUpperCase()} - {media.mimeType} -{' '}
          {media.size === null ? 'size unknown' : formatBytes(media.size)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  pickerButton: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flex: 1,
    gap: spacing.sm,
    minHeight: 72,
    justifyContent: 'center',
    padding: spacing.md,
  },
  pickerButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  previewImage: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    height: 72,
    width: 72,
  },
  fileIcon: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  previewCopy: {
    flex: 1,
  },
  previewName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  previewMeta: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  captionInput: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 92,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  progressWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.pill,
    flex: 1,
    height: 6,
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 6,
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    width: 42,
  },
  uploadButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    minHeight: 48,
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: '#03100c',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
});
