import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

import type { MediaFeedItem } from '../lib/queries';
import { deleteMediaPostWithFile, updateMediaPostCaption } from '../lib/queries';
import {
  clearActivePlayback,
  registerPlaybackItem,
  requestPlayback,
} from '../playback/playbackCoordinator';
import { OwnerMenu } from './OwnerMenu';
import { StatusMessage } from './StatusMessage';
import { colors, radii, spacing } from '../theme';

type MediaPostCardProps = {
  currentUserId?: string | null;
  item: MediaFeedItem;
  onChanged?: () => void;
  onViewComments?: () => void;
  showCommentsAction?: boolean;
};

export function MediaPostCard({
  currentUserId,
  item,
  onChanged,
  onViewComments,
  showCommentsAction = true,
}: MediaPostCardProps) {
  const [draftCaption, setDraftCaption] = useState(item.caption);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const isOwner = Boolean(currentUserId && currentUserId === item.user_id);
  const username = item.profile?.username ?? 'unknown_user';
  const displayDate = formatFeedDate(item.created_at);

  async function saveCaption() {
    if (isSaving) {
      return;
    }

    const trimmedCaption = draftCaption.trim();

    if (!trimmedCaption) {
      setError('Caption cannot be empty.');
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      await updateMediaPostCaption({
        caption: trimmedCaption,
        id: item.id,
      });
      setNotice('Post updated.');
      setIsEditing(false);
      onChanged?.();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Unable to update post.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete() {
    setIsMenuOpen(false);
    Alert.alert(
      'Delete media post?',
      'This removes the post and its uploaded file.',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          onPress: () => {
            void deletePost();
          },
          style: 'destructive',
          text: 'Delete',
        },
      ],
    );
  }

  async function deletePost() {
    if (isDeleting) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsDeleting(true);

    try {
      await deleteMediaPostWithFile(item);
      setNotice('Post deleted.');
      onChanged?.();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : 'Unable to delete post.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <View style={styles.card}>
      <MediaPreview item={item} playbackId={item.id} />
      <View style={styles.copy}>
        <View style={styles.contentHeader}>
          <View style={styles.contentTitleWrap}>
            {isEditing ? (
              <TextInput
                editable={!isSaving}
                onChangeText={setDraftCaption}
                placeholder="Caption"
                placeholderTextColor={colors.quiet}
                style={styles.captionInput}
                value={draftCaption}
              />
            ) : (
              <Text style={styles.caption}>{item.caption || 'Untitled upload'}</Text>
            )}
          </View>
          {isOwner ? (
            <OwnerMenu
              isOpen={isMenuOpen}
              onDelete={confirmDelete}
              onEdit={() => {
                setIsMenuOpen(false);
                setIsEditing(true);
                setError(null);
                setNotice(null);
              }}
              onToggle={() => setIsMenuOpen((value) => !value)}
            />
          ) : null}
        </View>
        <Text style={styles.uploader}>@{username}</Text>
        <Text style={styles.timestamp}>{displayDate}</Text>
        {isEditing ? (
          <View style={styles.editActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => {
                setDraftCaption(item.caption);
                setIsEditing(false);
                setError(null);
              }}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && !isSaving && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={saveCaption}
              style={({ pressed }) => [
                styles.saveButton,
                pressed && !isSaving && styles.pressed,
                isSaving && styles.disabled,
              ]}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {isDeleting ? <Text style={styles.statusText}>Deleting...</Text> : null}
        {notice ? <StatusMessage message={notice} tone="success" /> : null}
        {error ? <StatusMessage message={error} tone="error" /> : null}
        {showCommentsAction && onViewComments ? (
          <Pressable
            accessibilityRole="button"
            onPress={onViewComments}
            style={({ pressed }) => [
              styles.commentsButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons color={colors.accent} name="chatbubble-outline" size={16} />
            <Text style={styles.commentsButtonText}>
              View comments ({item.commentCount})
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.commentCount}>
            {item.commentCount} {item.commentCount === 1 ? 'comment' : 'comments'}
          </Text>
        )}
        <View style={styles.metadataSpace} />
      </View>
    </View>
  );
}

function MediaPreview({
  item,
  playbackId,
}: MediaPostCardProps & { playbackId: string }) {
  if (!item.resolvedFileUrl) {
    return <UnavailablePreview label="Media unavailable" />;
  }

  if (item.media_type === 'image') {
    return <ImagePreview url={item.resolvedFileUrl} />;
  }

  if (item.media_type === 'video') {
    return <VideoPreview playbackId={playbackId} url={item.resolvedFileUrl} />;
  }

  if (item.media_type === 'audio') {
    return (
      <AudioPreview
        caption={item.caption}
        playbackId={playbackId}
        url={item.resolvedFileUrl}
      />
    );
  }

  return <UnavailablePreview label="Unsupported media" />;
}

function ImagePreview({ url }: { url: string }) {
  const [hasError, setHasError] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState(16 / 9);
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(width - spacing.lg * 2, 1);
  const imageHeight = Math.min(cardWidth / naturalRatio, 520);

  useEffect(() => {
    Image.getSize(
      url,
      (imageWidth, imageHeight) => {
        if (imageWidth > 0 && imageHeight > 0) {
          setNaturalRatio(imageWidth / imageHeight);
        }
      },
      () => setHasError(true),
    );
  }, [url]);

  if (hasError) {
    return <UnavailablePreview label="Image unavailable" />;
  }

  return (
    <View style={[styles.imageFrame, { height: imageHeight }]}>
      <Image
        onError={() => setHasError(true)}
        resizeMode="contain"
        source={{ uri: url }}
        style={styles.image}
      />
    </View>
  );
}

function VideoPreview({ playbackId, url }: { playbackId: string; url: string }) {
  const player = useVideoPlayer(url, (nextPlayer) => {
    nextPlayer.loop = false;
    nextPlayer.timeUpdateEventInterval = 0.5;
  });

  useEffect(() => {
    return registerPlaybackItem(playbackId, () => player.pause());
  }, [playbackId, player]);

  useEffect(() => {
    const playingSubscription = player.addListener(
      'playingChange',
      ({ isPlaying }) => {
        if (isPlaying) {
          requestPlayback(playbackId, 'video');
        } else {
          clearActivePlayback(playbackId, 'video paused');
        }
      },
    );

    const endSubscription = player.addListener('playToEnd', () => {
      clearActivePlayback(playbackId, 'video ended');
    });

    return () => {
      playingSubscription.remove();
      endSubscription.remove();
    };
  }, [playbackId, player]);

  return (
    <VideoView
      allowsFullscreen
      contentFit="contain"
      nativeControls
      player={player}
      style={styles.media}
    />
  );
}

function AudioPreview({
  caption,
  playbackId,
  url,
}: {
  caption: string;
  playbackId: string;
  url: string;
}) {
  const player = useAudioPlayer(url, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const duration = Number.isFinite(status.duration) ? status.duration : 0;
  const currentTime = Number.isFinite(status.currentTime)
    ? Math.min(status.currentTime, duration || status.currentTime)
    : 0;
  const progress = duration > 0 ? currentTime / duration : 0;

  useEffect(() => {
    return registerPlaybackItem(playbackId, () => player.pause());
  }, [playbackId, player]);

  useEffect(() => {
    if (status.didJustFinish) {
      clearActivePlayback(playbackId, 'audio ended');
    }
  }, [playbackId, status.didJustFinish]);

  function playOrPause() {
    if (status.playing) {
      player.pause();
      clearActivePlayback(playbackId, 'audio paused by user');
      return;
    }

    requestPlayback(playbackId, 'audio');

    if (status.didJustFinish || (duration > 0 && currentTime >= duration - 0.25)) {
      void player.seekTo(0).then(() => player.play());
      return;
    }

    player.play();
  }

  function seekBy(seconds: number) {
    const nextTime = clamp(currentTime + seconds, 0, duration || currentTime);
    void player.seekTo(nextTime);
  }

  function seekToRatio(ratio: number) {
    if (duration <= 0) {
      return;
    }

    void player.seekTo(clamp(ratio, 0, 1) * duration);
  }

  return (
    <View style={[styles.media, styles.audio]}>
      <Text numberOfLines={1} style={styles.audioTitle}>
        {caption || 'Audio'}
      </Text>
      <View style={styles.audioActions}>
        <AudioButton
          icon="play-back"
          label="Back 10 seconds"
          onPress={() => seekBy(-10)}
          text="-10"
        />
        <Pressable
          accessibilityLabel={status.playing ? 'Pause audio' : 'Play audio'}
          accessibilityRole="button"
          onPress={playOrPause}
          style={({ pressed }) => [
            styles.primaryAudioButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            color="#03100c"
            name={status.playing ? 'pause' : 'play'}
            size={20}
          />
        </Pressable>
        <AudioButton
          icon="play-forward"
          label="Forward 10 seconds"
          onPress={() => seekBy(10)}
          text="+10"
        />
      </View>
      <SeekBar progress={progress} onSeek={seekToRatio} />
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>
        <Text style={styles.timeText}>{formatDuration(duration)}</Text>
      </View>
    </View>
  );
}

function AudioButton({
  icon,
  label,
  onPress,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  text?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.audioButton, pressed && styles.pressed]}
    >
      <Ionicons color={colors.accent} name={icon} size={18} />
      {text ? <Text style={styles.audioButtonText}>{text}</Text> : null}
    </Pressable>
  );
}

function SeekBar({
  onSeek,
  progress,
}: {
  onSeek: (ratio: number) => void;
  progress: number;
}) {
  const [trackWidth, setTrackWidth] = useState(1);
  const widthRef = useRef(trackWidth);

  useEffect(() => {
    widthRef.current = trackWidth;
  }, [trackWidth]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          onSeek(event.nativeEvent.locationX / widthRef.current);
        },
        onPanResponderMove: (event) => {
          onSeek(event.nativeEvent.locationX / widthRef.current);
        },
      }),
    [onSeek],
  );

  return (
    <View
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width || 1)}
      style={styles.seekTrack}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.seekFill,
          { width: `${Math.max(3, clamp(progress, 0, 1) * 100)}%` },
        ]}
      />
      <View
        pointerEvents="none"
        style={[styles.seekThumb, { left: `${clamp(progress, 0, 1) * 100}%` }]}
      />
    </View>
  );
}

function UnavailablePreview({ label }: { label: string }) {
  return (
    <View style={[styles.media, styles.unavailable]}>
      <Ionicons color={colors.quiet} name="alert-circle-outline" size={32} />
      <Text style={styles.unavailableText}>{label}</Text>
    </View>
  );
}

function formatFeedDate(value: string) {
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

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const roundedSeconds = Math.floor(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSeconds = roundedSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageFrame: {
    alignItems: 'center',
    backgroundColor: colors.panelStrong,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  media: {
    aspectRatio: 16 / 9,
    backgroundColor: colors.panelStrong,
    width: '100%',
  },
  audio: {
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  audioActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  audioButton: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    height: 38,
    justifyContent: 'center',
    minWidth: 64,
    paddingHorizontal: spacing.sm,
  },
  audioButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  audioTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  copy: {
    padding: spacing.lg,
  },
  caption: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  captionInput: {
    backgroundColor: colors.panelStrong,
    borderColor: colors.line,
    borderRadius: radii.sm,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 44,
    padding: spacing.md,
  },
  contentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contentTitleWrap: {
    flex: 1,
  },
  commentCount: {
    color: colors.quiet,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  commentsButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    borderColor: colors.line,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  commentsButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  metadataSpace: {
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.sm,
    borderStyle: 'dashed',
    borderWidth: 1,
    height: 44,
    marginTop: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.6,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  primaryAudioButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 23,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
  },
  saveButtonText: {
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
  secondaryButtonText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
  seekFill: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 5,
  },
  seekThumb: {
    backgroundColor: colors.text,
    borderColor: colors.panelStrong,
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    marginLeft: -7,
    position: 'absolute',
    top: -4,
    width: 14,
  },
  seekTrack: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.pill,
    height: 5,
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  timestamp: {
    color: colors.quiet,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  statusText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  unavailable: {
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  unavailableText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  uploader: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.quiet,
    fontSize: 12,
    fontWeight: '700',
  },
});
