const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '../..');

/**
 * Metro for the Vega build. Workspace packages ship TypeScript source; `.vega.*` files take
 * precedence so platform code (W3C media, TVEventHandler) replaces the browser versions.
 * React and React Native are pinned to this app's copies so every package shares one instance.
 */
module.exports = mergeConfig(getDefaultConfig(__dirname), {
  watchFolders: [path.join(root, 'packages')],
  resolver: {
    unstable_enableSymlinks: true,
    sourceExts: ['vega.tsx', 'vega.ts', 'tsx', 'ts', 'jsx', 'js', 'json'],
    nodeModulesPaths: [
      path.join(__dirname, 'node_modules'),
      path.join(root, 'packages/tv-ui/node_modules'),
      path.join(root, 'packages/client/node_modules'),
      path.join(root, 'packages/core/node_modules'),
      path.join(root, 'node_modules'),
    ],
    extraNodeModules: {
      react: path.join(__dirname, 'node_modules/react'),
      'react-native': path.join(__dirname, 'node_modules/react-native'),
      '@babel/runtime': path.join(__dirname, 'node_modules/@babel/runtime'),
    },
  },
});
