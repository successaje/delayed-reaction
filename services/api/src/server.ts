import { serve } from '@hono/node-server';
import { createApp } from './app';
import { config } from './config';
import { loadPrograms } from './programs';
import { MemoryRoomStore } from './store/memory';

const app = createApp({
  store: new MemoryRoomStore(),
  now: Date.now,
  programs: loadPrograms(config.programsPath, config.mediaBaseUrl),
  corsOrigins: config.corsOrigins,
});

serve({ fetch: app.fetch, port: config.port }, ({ port }) => {
  console.log(`Delayed Reaction API listening on http://localhost:${port}`);
});
