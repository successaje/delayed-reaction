import { StyleSheet, Text, View } from 'react-native';
import { color, radius, space, type } from '../theme';

const STEPS = [
  { n: '1', title: 'Pick a game', body: 'This TV opens a room and shows a code.' },
  { n: '2', title: 'React from the sofa', body: 'Press ▲ on the remote, or scan to make your phone the pad.' },
  { n: '3', title: 'Friends react whenever', body: 'Live or hours later, each reaction lands on its moment.' },
];

/** The home screen's right-hand panel: the whole idea in three lines and one picture. */
export function HowItWorks() {
  return (
    <View style={styles.panel}>
      <View style={styles.timelines}>
        <Timeline label="Ada · live" offset={0} tone={color.live} />
        <Timeline label="You · 38 min later" offset={140} tone={color.amber} />
      </View>
      <View style={{ gap: space.md, marginTop: space.lg }}>
        {STEPS.map((step) => (
          <View key={step.n} style={styles.step}>
            <Text style={[type.heading, type.mono, { color: color.amber, width: 40 }]}>{step.n}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[type.label, { color: color.chalk, fontSize: 26 }]}>{step.title}</Text>
              <Text style={[type.label, { color: color.chalk3, fontWeight: '400' }]}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** A match timeline with one reaction on it; the second one is the same moment, later. */
function Timeline({ label, offset, tone }: { label: string; offset: number; tone: string }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={[type.label, { color: color.chalk2, fontWeight: '400' }]}>{label}</Text>
      <View style={styles.track}>
        <View style={styles.line} />
        <View style={[styles.played, { width: 162 + offset, backgroundColor: tone }]} />
        <View style={[styles.marker, { left: 160 + offset, backgroundColor: tone }]} />
        <View style={[styles.tag, { left: 120 + offset }]}>
          <Text style={[type.label, { color: color.ink950, fontWeight: '900' }]}>NOOO</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: 640,
    backgroundColor: color.ink900,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.line,
    padding: space.lg,
  },
  timelines: { gap: space.md },
  track: { height: 64, justifyContent: 'center' },
  line: { position: 'absolute', left: 0, right: 0, top: 44, height: 4, borderRadius: 2, backgroundColor: color.lineStrong },
  played: { position: 'absolute', left: 0, top: 44, height: 4, borderRadius: 2, opacity: 0.6 },
  marker: { position: 'absolute', width: 4, height: 36, top: 28, borderRadius: 2 },
  tag: {
    position: 'absolute',
    top: -6,
    backgroundColor: color.chalk,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 6,
  },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});
