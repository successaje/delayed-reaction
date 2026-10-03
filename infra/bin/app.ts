import { App } from 'aws-cdk-lib';
import { DelayedReactionStack } from '../lib/stack';

const app = new App();
new DelayedReactionStack(app, 'DelayedReaction', {
  // Browser origin of the deployed web app (e.g. https://delayed-reaction.vercel.app).
  // Empty allows any origin; auth is bearer-token based, so no cookies are exposed.
  webOrigin: app.node.tryGetContext('webOrigin') ?? '',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});
