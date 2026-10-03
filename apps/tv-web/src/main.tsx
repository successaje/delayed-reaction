import { DelayedReactionTV, type TvConfig } from '@delayed-reaction/tv-ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Stage } from './Stage';

function storage(): TvConfig['storage'] {
  try {
    window.localStorage.setItem('__probe__', '1');
    window.localStorage.removeItem('__probe__');
    return window.localStorage;
  } catch {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
      removeItem: (k) => void map.delete(k),
    };
  }
}

const config: TvConfig = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8787',
  webUrl: import.meta.env.VITE_WEB_URL ?? 'http://localhost:3000',
  storage: storage(),
  deviceName: 'Living room',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Stage>
      <DelayedReactionTV config={config} />
    </Stage>
  </StrictMode>,
);
