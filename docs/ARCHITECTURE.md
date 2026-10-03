# Architecture

```
delayed-reaction/
├── packages/
│   ├── core/       @delayed-reaction/core     domain model: match positions, clocks, spoiler gate, timeline
│   ├── client/     @delayed-reaction/client   typed API client + TimelineSync engine (runs on TV, phone and web)
│   └── tv-ui/      @delayed-reaction/tv-ui    shared React Native TV screens and components
├── apps/
│   ├── vega/       Fire TV app for Vega OS (React Native 0.72, Vega SDK)
│   ├── tv-web/     browser build of the TV UI (react-native-web) for development and demos
│   └── web/        Next.js: landing page (/), phone companion (/r/:code), recap
└── services/
    └── api/        Hono HTTP API (runs on Node or AWS Lambda); storage in memory or DynamoDB
```

## Data flow

```
 phone (live)                        API                             Fire TV (38 min late)
 ───────────                         ───                             ────────────────────
 tap "NOOO" at 1H 23:14  ──POST──▶  reactions sorted by position
                                     (period, ms)
                                                        ◀──GET reactions?after=cursor&until=1H 23:19──
                                     until ≤ reported position + 5 s
                                                        ──────────────▶  queue → shown when playhead
                                                                          crosses 1H 23:14
```

1. **Clocks report positions.** Every viewer sends a heartbeat with its current match position and play state (every 2 s while playing, and on every pause, seek or period change).
2. **Pull, gated.** Clients pull reactions in the window `(cursor, position + prefetch]`. The API clamps `until` to the viewer's last reported position plus the prefetch window, so a client can't over-fetch by accident. The window is 5 s and covers network jitter.
3. **Display at the moment.** `TimelineSync` holds the prefetched reactions and releases each one when the local playhead crosses it. Seeking backwards replays from the cache. Seeking forward files the skipped reactions into history without a burst.
4. **Presence.** Viewer positions come back with every pull, so each client can show "Ada · 38 min ahead" without receiving any of Ada's content.

## Why pull and not push

A per-viewer push stream would need the server to schedule delivery for each viewer's playhead. A pull on the client's own clock makes the server stateless:
- the same handlers run on a long-lived Node process or on AWS Lambda;
- the spoiler invariant is one comparison in one place (`clampUntil` in `core`);
- DynamoDB answers the query with a single range read, because reactions are stored with a sort key derived from position (`RX#<period:02><ms:010>#<id>`).

Polling costs one small request every 1–2 s per active viewer, which is fine for groups of friends.

## Identity

There are no accounts:
- creating a room returns a **host key**;
- joining returns a **viewer token**, which is a random 256-bit secret stored on the device;
- every write is authenticated with `Authorization: Bearer <token>`;
- tokens are stored hashed (SHA-256), so a database leak can't be replayed.

## Storage

`services/api` depends on a `RoomStore` interface with two implementations:

| Implementation | Used for |
|---|---|
| `MemoryRoomStore` | tests and local development |
| `DynamoRoomStore` | production: single table, `PK = ROOM#<code>` |

## Platform-specific code

The TV UI resolves platform files at bundle time:
- `*.vega.tsx` for Vega Metro (`sourceExts` lists `vega.tsx` first);
- `*.web.tsx` for the react-native-web build.

The video player is the only significant fork: W3C media on Vega, and `<video>` on web.
