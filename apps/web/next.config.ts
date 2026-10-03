import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ['@delayed-reaction/core', '@delayed-reaction/client'],
  turbopack: { root: path.join(__dirname, '../..') },
  devIndicators: false,
  agentRules: false,
};

export default config;
