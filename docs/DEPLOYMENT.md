# Deployment

Production runs in two places:
- **AWS**, from `infra/`: a DynamoDB table, the API as a Lambda behind an HTTP API, and match media in S3 behind CloudFront.
- **Vercel**: the web app (landing page and phone companion).

## 1. AWS (API, data, media)

Prerequisites:
- the AWS CLI with credentials (`aws configure` or `aws sso login`);
- Node 22 and Corepack.

```bash
corepack enable && yarn install
scripts/fetch-demo-media.sh                          # builds the CC0 demo program into apps/web/public/media
yarn workspace @delayed-reaction/infra cdk bootstrap # once per account and region
yarn workspace @delayed-reaction/infra deploy -c webOrigin=https://<your-vercel-domain>
```

The stack prints three outputs:

| Output | Used for |
|---|---|
| `ApiUrl` | `NEXT_PUBLIC_API_URL` on Vercel, `API_URL` in `apps/vega/src/config.ts` |
| `MediaUrl` | Already wired into the Lambda as `MEDIA_BASE_URL` |
| `TableName` | The DynamoDB table (rooms expire through TTL a week after creation) |

Leaving `webOrigin` empty allows any origin. That's safe, because the API authenticates with bearer tokens, not cookies.

## 2. Vercel (web)

```bash
cd apps/web
vercel link
vercel env add NEXT_PUBLIC_API_URL production   # the ApiUrl output
vercel deploy --prod
```

Set the Vercel project's root directory to `apps/web`. Install runs at the repository root (`yarn install`), because the app depends on workspace packages.

## 3. Fire TV (Vega)

Point `apps/vega/src/config.ts` at the deployed `ApiUrl` and the Vercel domain. Then:

```bash
yarn workspace @delayed-reaction/vega build   # needs the Vega SDK (`kepler --version`)
```

Install the resulting `.vpkg` on the Vega Virtual Device or a registered Fire TV with the Vega CLI.

## Local development

```bash
yarn dev:api    # http://localhost:8787 (in-memory store; set TABLE_NAME for DynamoDB)
yarn dev:web    # http://localhost:3000
yarn dev:tv     # http://localhost:5173, the TV app in a browser
```
