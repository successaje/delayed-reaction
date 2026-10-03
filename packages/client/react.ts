// Resolves `@delayed-reaction/client/react` for bundlers without package `exports` support
// (Metro on Vega). Bundlers that read `exports` use ./src/react.ts directly.
export * from './src/react';
