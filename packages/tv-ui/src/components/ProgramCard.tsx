import type { ProgramDto } from '@delayed-reaction/core';
import { Image, StyleSheet, Text, View } from 'react-native';
import { color, radius, type } from '../theme';
import { Focusable } from './Focusable';

export function ProgramCard({ program, onSelect }: { program: ProgramDto; onSelect: () => void }) {
  return (
    <Focusable onSelect={onSelect} style={styles.card}>
      {({ focused }) => (
        <>
          <View style={styles.poster}>
            {program.posterUrl ? (
              <Image source={{ uri: program.posterUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : null}
            <View style={styles.sport}>
              <Text style={[type.eyebrow, { color: color.ink950, letterSpacing: 2 }]}>{program.sport}</Text>
            </View>
          </View>
          <View style={styles.text}>
            <Text style={[type.heading, { color: color.chalk, fontSize: 30 }]} numberOfLines={1}>
              {program.title}
            </Text>
            <Text style={[type.label, { color: focused ? color.chalk2 : color.chalk3, fontWeight: '400' }]} numberOfLines={1}>
              {program.subtitle}
            </Text>
          </View>
        </>
      )}
    </Focusable>
  );
}

const styles = StyleSheet.create({
  card: { width: 400, borderRadius: radius.md, overflow: 'hidden', backgroundColor: color.ink900 },
  poster: { height: 225, backgroundColor: color.ink800 },
  sport: {
    position: 'absolute',
    left: 16,
    top: 16,
    backgroundColor: color.amber,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  text: { paddingHorizontal: 20, paddingVertical: 16, gap: 4 },
});
