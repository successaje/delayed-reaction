# Devpost submission draft

**Track:** Fire TV
**Mini challenges:** AWS Builder; Open Source (once the repository is public)

## Tagline

Your group chat, on your game clock: watch the match late, and still watch it together.

## Inspiration

Most people can't watch live sport live: kids' bedtime, a late shift, a different time zone. Watching later means muting the group chat for two hours, because the friends who make the game fun are also the fastest way to spoil it. We wanted watching late to feel like watching together.

## What it does

Delayed Reaction is a Fire TV app and a phone companion.
- **Pinned to the match clock.** Friends react to a game on their phones, and each reaction is pinned to the *match clock* (for example `1H 23:14`), not the wall clock.
- **Reactions land on the frame.** Watch on Fire TV an hour later and every reaction slides in as a broadcast-style lower-third on the frame it was sent. Pause and the reactions wait, rewind and they replay, skip ahead and they're filed away instead of flooding the screen.
- **Phone pairing in one scan.** Scan the QR code on the TV and your phone becomes a reaction pad already synced to the TV's playhead.
- **Senders know the timing.** When you react live, the app tells you exactly when each friend will see it: *"Tunde will see this in 38 min."*
- **Replies from behind.** Reactions from people watching even later travel backwards to you.
- **Full-time recap.** The TV shows the group's loudest moments, each one replayable from the remote.

You can see that friends are ahead of you, but never what they've seen.

## How we built it

- **Vega OS app** (React Native 0.72):
  - Amazon's **W3C Media** `VideoPlayer` + `KeplerVideoSurfaceView`; its `currentTime` *is* the match clock.
  - **Vega Media Controls** (`KeplerMediaControlHandler`, `IMediaPlaybackServer`), so remote media keys, the system UI and Alexa transport commands move the same clock.
  - `TVEventHandler` remote input with spatial focus navigation.
  - AsyncStorage.
- **One sync protocol for every device.**
  - Each tick, a device reports its match position and pulls reactions up to that position plus 5 seconds.
  - The server enforces this spoiler invariant in a single function.
  - A two-part cursor (match position + insertion order) also delivers replies posted behind you.
- **AWS**:
  - the API runs on **Lambda behind an HTTP API**;
  - **DynamoDB** single-table design: reactions range-queried by match position, a GSI on insertion order, TTL;
  - match media on **S3 + CloudFront**;
  - everything defined in **CDK**.
- **Phone companion and landing page**: Next.js. There are no accounts; device tokens are stored hashed.
- **Shared code across platforms**:
  - one TypeScript domain package and sync engine run on the TV, the phones and in tests;
  - the TV UI also runs in a browser via React Native Web for development.

## Challenges

- **Defining "now" for people watching different streams with different delays.** We settled on per-period anchors: every viewer re-syncs at each half, which bounds drift from ads and breaks.
- **Spoiler safety had to be structural, not a UI promise**, so the server clamps every request to the viewer's own position.
- **Vega tooling** (details in our friction log):
  - a beta navigation library that ships React 19's JSX runtime;
  - Metro without package `exports`;
  - no headless SDK install for CI.

## Accomplishments

- The core moment works: a reaction sent live lands on a TV 38 minutes later, on the frame.
- CI typechecks the Vega app and produces a Kepler bundle on every pull request, without the SDK.
- 70 automated tests, including the 38-minutes-late scenario end to end, and one store contract run against both in-memory and DynamoDB.

## What we learned

The interesting problem wasn't real-time chat. It was making *time* a first-class part of the data model.

## What's next

- An SDK for Vega sports apps, so asynchronous co-watching lives inside the broadcaster's own player.
- Official game-clock sync from sports data.
- Voice reactions through Alexa.

## Product feedback

See `docs/FRICTION_LOG.md` in the repository.
