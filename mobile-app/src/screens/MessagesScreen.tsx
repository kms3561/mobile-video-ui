import { StyleSheet, Text, View } from 'react-native';

import { ListCard } from '../components/ListCard';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { messages } from '../data/placeholder';
import { colors, spacing } from '../theme';

export function MessagesScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Inbox" title="Messages" />
      {messages.map((message) => (
        <ListCard key={message.id}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{message.initial}</Text>
            </View>
            <View style={styles.messageCopy}>
              <Text style={styles.sender}>{message.sender}</Text>
              <Text style={styles.body}>{message.body}</Text>
            </View>
          </View>
        </ListCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.panelStrong,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  messageCopy: {
    flex: 1,
  },
  sender: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});
