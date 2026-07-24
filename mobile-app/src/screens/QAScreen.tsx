import { StyleSheet, Text } from 'react-native';

import { ListCard } from '../components/ListCard';
import { Screen } from '../components/Screen';
import { ScreenHeader } from '../components/ScreenHeader';
import { questions } from '../data/placeholder';
import { colors } from '../theme';

export function QAScreen() {
  return (
    <Screen>
      <ScreenHeader eyebrow="Community" title="Q&A" />
      {questions.map((question) => (
        <ListCard key={question.id}>
          <Text style={styles.title}>{question.title}</Text>
          <Text style={styles.detail}>{question.detail}</Text>
        </ListCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  detail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
