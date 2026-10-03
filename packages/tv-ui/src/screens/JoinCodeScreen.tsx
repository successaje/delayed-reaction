import { isApiClientError } from '@delayed-reaction/client';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@delayed-reaction/core';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import { Focusable, TvButton } from '../components/Focusable';
import { Eyebrow, Screen } from '../components/Screen';
import { RemoteKey } from '../remote/keys';
import { useRemote } from '../remote/use-remote';
import { color, radius, space, type } from '../theme';

const ROWS = [ROOM_CODE_ALPHABET.slice(0, 8), ROOM_CODE_ALPHABET.slice(8, 16), ROOM_CODE_ALPHABET.slice(16, 24), ROOM_CODE_ALPHABET.slice(24)];

/** Six characters with a D-pad: a compact grid of the 32-symbol room alphabet. */
export function JoinCodeScreen({
  onSubmit,
  onBack,
}: {
  onSubmit: (code: string) => Promise<void>;
  onBack: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useRemote((key) => {
    if (key === RemoteKey.Back) {
      if (code) setCode((c) => c.slice(0, -1));
      else onBack();
    }
  });

  async function submit(value: string) {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(value);
    } catch (err) {
      setError(isApiClientError(err) ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  }

  function type_(c: string) {
    if (busy || code.length >= ROOM_CODE_LENGTH) return;
    const next = code + c;
    setCode(next);
    setError(null);
    if (next.length === ROOM_CODE_LENGTH) void submit(next);
  }

  return (
    <Screen>
      <View style={styles.layout}>
        <View style={{ width: 640 }}>
          <Eyebrow>Join a room</Eyebrow>
          <Text style={[type.title, { color: color.chalk }]}>Enter the room code</Text>
          <Text style={[type.body, { color: color.chalk2, marginTop: space.sm }]}>
            It's on your friend's phone, under the room name. Back deletes a character.
          </Text>
          <View style={styles.slots}>
            {Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => (
              <View key={i} style={[styles.slot, i === code.length && styles.slotActive]}>
                <Text style={[type.title, type.mono, { color: color.chalk }]}>{code[i] ?? ''}</Text>
              </View>
            ))}
          </View>
          <Text style={[type.label, { color: error ? color.danger : color.chalk3, marginTop: space.md, minHeight: 28 }]}>
            {busy ? 'Joining…' : (error ?? ' ')}
          </Text>
        </View>

        <SpatialNavigationView direction="vertical" style={{ gap: 12 }}>
          {ROWS.map((row, r) => (
            <SpatialNavigationView key={r} direction="horizontal" style={{ flexDirection: 'row', gap: 12 }}>
              {[...row].map((c, i) => {
                const key = (
                  <Focusable key={c} onSelect={() => type_(c)} style={styles.key}>
                    {({ focused }) => (
                      <Text style={[type.heading, type.mono, { color: focused ? color.amber : color.chalk }]}>{c}</Text>
                    )}
                  </Focusable>
                );
                return r === 0 && i === 0 ? <DefaultFocus key={c}>{key}</DefaultFocus> : key;
              })}
            </SpatialNavigationView>
          ))}
          <SpatialNavigationView direction="horizontal" style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <TvButton label="Delete" variant="secondary" onSelect={() => setCode((c) => c.slice(0, -1))} />
            <TvButton label="Cancel" variant="secondary" onSelect={onBack} />
          </SpatialNavigationView>
        </SpatialNavigationView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slots: { flexDirection: 'row', gap: 12, marginTop: space.lg },
  slot: {
    width: 84,
    height: 104,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: color.lineStrong,
    backgroundColor: color.ink900,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActive: { borderColor: color.amber },
  key: {
    width: 88,
    height: 88,
    borderRadius: radius.sm,
    backgroundColor: color.ink850,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
