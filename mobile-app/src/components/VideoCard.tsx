import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { MediaItem } from '../data/placeholder';
import { colors, radii, spacing } from '../theme';

type VideoCardProps = {
  item: MediaItem;
};

export function VideoCard({ item }: VideoCardProps) {
  return (
    <View style={styles.card}>
      <VideoPlaceholder tone={item.tone} />
      <View style={styles.copy}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.uploader}>{item.uploaderId}</Text>
        <View style={styles.metadataSpace} />
      </View>
    </View>
  );
}

function VideoPlaceholder({ tone }: { tone: MediaItem['tone'] }) {
  const colorsByTone = {
    studio: ['#151b25', '#07090d'],
    walk: ['#10141c', '#163529'],
    editing: ['#07090d', '#151b25'],
  } satisfies Record<MediaItem['tone'], [string, string]>;

  return (
    <LinearGradient colors={colorsByTone[tone]} style={styles.video}>
      <View style={styles.playButton}>
        <Ionicons color={colors.accent} name="play" size={34} />
      </View>
      <View style={styles.controls}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <Ionicons color={colors.text} name="volume-medium-outline" size={18} />
        <Ionicons color={colors.text} name="expand-outline" size={18} />
      </View>
    </LinearGradient>
  );
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
  video: {
    aspectRatio: 16 / 9,
    justifyContent: 'center',
    overflow: 'hidden',
    padding: spacing.lg,
  },
  playButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.accentSoft,
    borderRadius: 44,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  controls: {
    alignItems: 'center',
    bottom: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
  },
  progressTrack: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radii.pill,
    flex: 1,
    height: 5,
  },
  progressFill: {
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    height: 5,
    width: '32%',
  },
  copy: {
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  uploader: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.xs,
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
});
