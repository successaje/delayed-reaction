# Delayed Reaction

**Your group chat, on your game clock.**

Watch the match an hour late and still watch it with your friends. Delayed Reaction pins every reaction to the **match clock** instead of the wall clock, so it reaches each person at the moment it happened in the game, and never before.

It's a Fire TV app (Vega OS) plus a phone companion that works in any browser.

> Built for Amazon's *Build, Ship, Shape* hackathon, Fire TV track.
>
> **Live:** https://delayed-reaction.vercel.app

---

## The problem

Live sport is social, but most people can't watch live: bedtime, shifts, time zones. Watching late means muting the group chat, because the friends who make the game fun are also the fastest way to spoil it.

## What it does

1. **Start a room** on the TV or a phone, and share the link or the TV's QR code.
2. **React live** with one tap. Your reaction is pinned to the match position (`1H 23:14`), and you're told when each friend will see it: *"Tunde will see this in 38 min."*
3. **Press play whenever.** On Fire TV, the video playhead is the clock. Reactions slide in as broadcast lower-thirds on the frame they were sent. Pause and they wait, rewind and they replay, skip ahead and they're filed away quietly.

You see *that* friends are ahead of you ("Ada · 38 min ahead"), never *what* they've seen.

## How it works

```
 phone (live)                        API                             Fire TV (38 min late)
 tap "NOOO" at 1H 23:14  ──POST──▶  reactions sorted by (period, ms)
                                                       ◀──POST sync {position, cursor}──
                                     serves only ≤ position + 5 s
                                                       ──────────────▶  released when the
                                                                         playhead crosses 1H 23:14
```

- **Match positions, not timestamps.** A reaction is stored at `(period, ms into period)`. Each viewer re-anchors at every period start, so ads and half-time never drift anyone into the future.
- **Three clock sources:**
  - `player`: the Fire TV video playhead;
  - `manual`: tap at kick-off, with pause and ±5 s nudges;
  - `linked`: a phone that scanned the TV's QR code and follows the TV's clock.
- **The spoiler invariant, enforced by the server.** A device can only receive reactions up to its own position plus a 5-second prefetch window (`clampUntil` in `packages/core`).
- **Pull, not push.** One `sync` request per tick reports the viewer's position (for presence) and pulls whatever is newly within reach. The server stays stateless, so it runs on Lambda.
- **Replies from behind.** The sync cursor tracks both match position and insertion order, so a reaction posted *behind* you by someone watching even later still reaches you.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/PRODUCT.md](docs/PRODUCT.md).

## Amazon technology used

| Technology | Where | How |
|---|---|---|
| **Vega OS** (React Native for Fire TV) | `apps/vega`, `packages/tv-ui` | The TV app. Platform code in `*.vega.tsx`, bundled by Metro for `kepler` |
| **W3C Media** (`@amazon-devices/react-native-w3cmedia`) | `packages/tv-ui/src/player/VideoSurface.vega.tsx` | `VideoPlayer` + `KeplerVideoSurfaceView`. Its `currentTime` drives the match clock |
| **Vega Media Controls** (`KeplerMediaControlHandler`, `IMediaPlaybackServer`) | `packages/tv-ui/src/player/media-controls.vega.ts` | Remote media keys, the system UI and Alexa transport commands drive the same player the match clock reads; "start over" returns to kick-off |
| **Vega remote input** (`TVEventHandler`) | `packages/tv-ui/src/remote/source.vega.ts` | D-pad, select, back and play/pause, routed into spatial focus navigation |
| **AsyncStorage for Vega** | `apps/vega/src/App.tsx` | Remembers rooms on the TV |
| **AWS Lambda + API Gateway (HTTP API)** | `services/api/src/lambda.ts`, `infra/` | The API |
| **Amazon DynamoDB** | `services/api/src/store/dynamo.ts` | Single table: reactions range-queried by match position, GSI on insertion order, TTL |
| **Amazon S3 + CloudFront** | `infra/lib/stack.ts` | Match media delivery |
| **AWS CDK** | `infra/` | All infrastructure as code |

## Repository

```
packages/
  core/      Domain: match positions, clocks, spoiler gate, reaction timeline, API schemas (zod)
  client/    Typed API client, TimelineSync engine, playheads, device session store, React hooks
  tv-ui/     Fire TV screens and components (React Native), shared by Vega and the browser build
apps/
  vega/      Vega OS app shell (RN 0.72, manifest.toml, Metro)
  tv-web/    The TV app in a browser via React Native Web (development and demos)
  web/       Next.js: landing page and phone companion (/r/:code)
services/
  api/       Hono HTTP API: Node server locally, Lambda in production; memory or DynamoDB store
infra/       AWS CDK stack
docs/        Product model, architecture, deployment, friction log, build log
scripts/     Demo media builders (CC0 footage from Wikimedia Commons)
```

## Local development

Requirements: Node 22+, Corepack (Yarn 4), and ffmpeg for the demo media.

```bash
corepack enable
yarn install
scripts/fetch-demo-media.sh   # builds the CC0 demo match into apps/web/public/media

yarn dev:api    # API on http://localhost:8787 (in-memory store)
yarn dev:web    # landing page and phone companion on http://localhost:3000
yarn dev:tv     # the Fire TV app in a browser on http://localhost:5173 (arrow keys, Enter, Esc, Space)
```

Try the loop:
1. In the TV app, start the demo match.
2. Open the lobby's join link on your phone (or another tab), choose **Follow Living room TV**, then press play on the TV.
3. React on the phone.

Then open the room in a second browser profile, join as someone watching on another screen, tap **Kick-off**, and react. When the TV reaches that moment, the reaction lands.

### Environment

| Variable | Where | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `apps/web` | `http://localhost:8787` |
| `VITE_API_URL`, `VITE_WEB_URL` | `apps/tv-web` | `http://localhost:8787`, `http://localhost:3000` |
| `PORT`, `CORS_ORIGINS`, `MEDIA_BASE_URL`, `TABLE_NAME`, `DYNAMODB_ENDPOINT` | `services/api` | See `services/api/.env.example` |

## Testing

```bash
yarn test        # core, client, API (including DynamoDB via dynalite), and a Vega Metro bundle
yarn typecheck   # every workspace, including the Vega-only files
yarn build       # web, TV web build, Lambda bundle
```

Highlights:
- `packages/client/test/engine.test.ts` runs the 38-minutes-late scenario end to end against the real API with fake timers.
- `services/api/test/store.contract.test.ts` runs one contract against both the memory and DynamoDB stores.
- CI synthesizes the CDK stack and bundles the Vega app on every pull request.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md):
- AWS via CDK (DynamoDB, Lambda, HTTP API, CloudFront);
- Vercel for the web app;
- the Vega SDK for the `.vpkg`.

## Developer feedback

[docs/FRICTION_LOG.md](docs/FRICTION_LOG.md) records every Vega and tooling problem we hit, with workarounds and suggestions.

## Credits

Demo footage is the 2021 FIFA Beach Soccer World Cup final, filmed from the stands by **Voltmetro** and released under **CC0** on [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:2021_FIFA_Beach_Soccer_World_Cup_Final).

Crowd sounds: the cheer is from *Football Austria vs. Sweden* by Work With Sounds / Torsten Nilsson ([CC BY 4.0](https://commons.wikimedia.org/wiki/File:WWS_FootballAustriavs.Sweden.ogg)); the groan is *Ohhh ahhh* by starlite (public domain, via Wikimedia Commons).

## License

[MIT](LICENSE)
