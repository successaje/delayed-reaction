import react from '@vitejs/plugin-react';
import { createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';

const require = createRequire(import.meta.url);
/** Resolves a package directory from this app, so every workspace shares one copy. */
const pkg = (name: string) => path.dirname(require.resolve(`${name}/package.json`));

/**
 * React Native Web build of the Fire TV app. `.web.*` files win over shared ones and
 * `.vega.*` files are never resolved, mirroring how Metro picks `.vega.*` on device.
 * Workspaces keep their own node_modules, so React and React Native are pinned to this
 * app's copies to avoid duplicate instances.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: /^react-native$/, replacement: pkg('react-native-web') }],
    dedupe: ['react', 'react-dom', 'react-native-web'],
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-dom/client', 'react-native-web', 'react-tv-space-navigation', 'qrcode'],
  },
  define: {
    // React Native libraries reference Node's `global`.
    global: 'globalThis',
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
