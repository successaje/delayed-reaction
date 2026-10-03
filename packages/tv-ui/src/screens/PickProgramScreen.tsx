import type { ProgramDto } from '@delayed-reaction/core';
import { Text, View } from 'react-native';
import { DefaultFocus, SpatialNavigationView } from 'react-tv-space-navigation';
import { TvButton } from '../components/Focusable';
import { ProgramCard } from '../components/ProgramCard';
import { Eyebrow, Message, Screen } from '../components/Screen';
import { RemoteKey } from '../remote/keys';
import { useRemote } from '../remote/use-remote';
import { useServices } from '../services';
import { useAsync } from '../state/use-async';
import { color, space, type } from '../theme';

/** A room started on a phone has no broadcast attached; the TV picks what it's playing. */
export function PickProgramScreen({
  roomTitle,
  onPick,
  onBack,
}: {
  roomTitle: string;
  onPick: (program: ProgramDto) => void;
  onBack: () => void;
}) {
  const { api } = useServices();
  const catalog = useAsync(() => api.programs().then((r) => r.programs), []);
  useRemote((key) => key === RemoteKey.Back && onBack());

  if (catalog.status !== 'ready') {
    return (
      <Screen>
        <Message
          title={catalog.status === 'loading' ? 'Loading games' : "Can't load games"}
          detail={catalog.status === 'error' ? catalog.message : undefined}
        >
          {catalog.status === 'error' ? (
            <DefaultFocus>
              <TvButton label="Try again" onSelect={catalog.retry} />
            </DefaultFocus>
          ) : null}
        </Message>
      </Screen>
    );
  }

  return (
    <Screen>
      <Eyebrow>Joined · {roomTitle}</Eyebrow>
      <Text style={[type.title, { color: color.chalk, marginBottom: space.lg }]}>What's playing on this TV?</Text>
      <SpatialNavigationView direction="horizontal" style={{ flexDirection: 'row', gap: space.md }}>
        {catalog.data.map((program, i) => {
          const card = <ProgramCard key={program.id} program={program} onSelect={() => onPick(program)} />;
          return i === 0 ? <DefaultFocus key={program.id}>{card}</DefaultFocus> : card;
        })}
      </SpatialNavigationView>
      <View style={{ marginTop: space.lg }}>
        <Text style={[type.label, { color: color.chalk3, fontWeight: '400' }]}>
          Watching on another app? Use the phone companion instead and tap at kick-off.
        </Text>
      </View>
    </Screen>
  );
}
