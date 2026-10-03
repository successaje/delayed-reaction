import { Directions, SpatialNavigation } from 'react-tv-space-navigation';
import { RemoteKey } from './keys';
import { remoteSource } from './source';

const DIRECTIONS: Partial<Record<RemoteKey, Directions>> = {
  [RemoteKey.Up]: Directions.UP,
  [RemoteKey.Down]: Directions.DOWN,
  [RemoteKey.Left]: Directions.LEFT,
  [RemoteKey.Right]: Directions.RIGHT,
  [RemoteKey.Select]: Directions.ENTER,
};

/** Routes remote presses into spatial navigation. Imported once, for its side effect. */
SpatialNavigation.configureRemoteControl({
  remoteControlSubscriber: (callback: (direction: Directions | null) => void) =>
    remoteSource.subscribe((key) => {
      const direction = DIRECTIONS[key];
      if (direction) callback(direction);
    }),
  remoteControlUnsubscriber: (unsubscribe: () => void) => unsubscribe(),
});
