import { ApiClient, SessionStore, type KeyValueStorage } from '@delayed-reaction/client';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface TvConfig {
  /** Base URL of the Deract API. */
  readonly apiUrl: string;
  /** Base URL of the phone companion, encoded in the room QR code. */
  readonly webUrl: string;
  /** Device-local persistence: AsyncStorage on Vega, localStorage in the browser. */
  readonly storage: KeyValueStorage;
  /** Shown to friends as this TV's name in presence. */
  readonly deviceName?: string;
}

export interface TvServices {
  readonly api: ApiClient;
  readonly sessions: SessionStore;
  readonly webUrl: string;
  readonly deviceName: string;
}

const Context = createContext<TvServices | null>(null);

export function TvServicesProvider({ config, children }: { config: TvConfig; children: ReactNode }) {
  const services = useMemo<TvServices>(
    () => ({
      api: new ApiClient({ baseUrl: config.apiUrl }),
      sessions: new SessionStore(config.storage, 'delayed-reaction-tv:'),
      webUrl: config.webUrl.replace(/\/+$/, ''),
      deviceName: config.deviceName ?? 'Living room',
    }),
    [config],
  );
  return <Context.Provider value={services}>{children}</Context.Provider>;
}

export function useServices(): TvServices {
  const services = useContext(Context);
  if (!services) throw new Error('useServices must be used inside TvServicesProvider');
  return services;
}
