import { StyleSheet, View } from 'react-native';

import { Screen } from '../components/Screen';
import { VideoCard } from '../components/VideoCard';
import { mediaItems } from '../data/placeholder';

export function VideosScreen() {
  return (
    <Screen>
      <View style={styles.feed}>
        {mediaItems.map((item) => (
          <VideoCard item={item} key={item.id} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  feed: {
    width: '100%',
  },
});
