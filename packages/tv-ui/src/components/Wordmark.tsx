import { StyleSheet, Text, View } from 'react-native';
import { color } from '../theme';

/** Two offset bars: the same moment on two timelines. */
export function Wordmark({ size = 28 }: { size?: number }) {
  const bar = { height: size * 0.22, width: size * 0.6, borderRadius: 2 };
  return (
    <View style={styles.row}>
      <View style={{ width: size * 0.95, height: size * 0.8, justifyContent: 'space-between' }}>
        <View style={[bar, { backgroundColor: color.chalk }]} />
        <View style={[bar, { backgroundColor: color.amber, alignSelf: 'flex-end' }]} />
      </View>
      <Text style={[styles.text, { fontSize: size }]}>
        <Text style={{ color: color.amber }}>DE</Text>RACT
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { color: color.chalk, fontWeight: '900', letterSpacing: -0.5 },
});
