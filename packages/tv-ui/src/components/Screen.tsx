import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, safe, space, type } from '../theme';
import { Wordmark } from './Wordmark';

/** Full-screen frame inside the title-safe area. */
export function Screen({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Wordmark />
        {aside}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <Text style={[type.eyebrow, { color: color.chalk3, marginBottom: space.sm }]}>{children}</Text>;
}

/** Centred message for loading, empty and error states. */
export function Message({ title, detail, children }: { title: string; detail?: string; children?: ReactNode }) {
  return (
    <View style={styles.message}>
      <Text style={[type.heading, { color: color.chalk }]}>{title}</Text>
      {detail ? <Text style={[type.body, { color: color.chalk2, marginTop: space.sm, maxWidth: 900 }]}>{detail}</Text> : null}
      {children ? <View style={{ marginTop: space.lg, flexDirection: 'row', gap: space.md }}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink950, paddingHorizontal: safe.x, paddingVertical: safe.y },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 56 },
  body: { flex: 1, marginTop: space.lg },
  message: { flex: 1, justifyContent: 'center' },
});
