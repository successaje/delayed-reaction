# Delayed Reaction: product model

## Thesis

Live sport is social, but most people can't watch it live. They watch an hour late after the kids are asleep, on a different continent, or after a shift ends. The group chat that makes the game fun becomes the thing that spoils it.

Delayed Reaction lets friends watch the same game **at different times and still watch it together**. Every reaction is pinned to the **game clock**, not the wall clock. It reaches each person's screen at the moment it happened in the game, and never before.

> Your group chat, on your game clock.

## Core users

| User | Situation | What they need |
|---|---|---|
| **The late watcher** (primary) | Watching 10 minutes to a day behind live, usually on the living-room TV | The group's energy without the spoilers |
| **The live reactor** | Watching live on any screen, anywhere | One tap to react, and confidence that late friends will feel it |
| **The streaming app developer** (secondary) | Builds a sports or video app for Fire TV | Drop-in asynchronous co-watching for their player |

## Core action

**Press play and feel the group react at exactly the right moment.**

Everything else serves this: rooms, sync, the reaction pad, presence and the recap.

## The magical moment

Tunde starts the match 38 minutes late. At 23:14 of the first half the penalty is missed. At that frame, on his TV, Ada's reaction slides in: **"NOOO"**. She sent it 38 minutes ago.

Before that, Delayed Reaction showed him only *that* his friends were ahead ("Ada is 38 min ahead"), never *what* they said.

The live side has its own small moment. When Ada reacts, her phone tells her: **"Sent. Tunde will see this in 38 min."**

## Product loop

1. Someone starts a room for a game and shares the link, or the QR code on the TV.
2. Live friends react on their phones (and pull in more friends).
3. Late friends watch with those reactions in sync. Their own reactions travel *backwards* to the early friends as "replies from behind".
4. Early friends come back to see how the late ones took it. After the final whistle, the recap shows the group's loudest moments.
5. Next game, the same group starts a new room.

## Sync model

The shared reference is **match position**: `(period, ms into period)`.

- Each viewer has a **clock source**:
  - `player`: the Fire TV app reads the video playhead. It handles pause and seek, and needs no tapping when the broadcast has known kick-off markers.
  - `manual`: the viewer taps "Kick-off" (and later "Second half") when they see it. A wall clock runs from there, with pause and ±5 s nudges.
  - `linked`: a phone that scanned the TV's QR code follows that TV's clock, so a reaction pad on the couch needs no sync.
- A viewer re-anchors at the start of each period. This keeps drift from ads, broadcaster delay and half-time length bounded to a single period.
- **Spoiler invariant:** a device only ever receives reactions at or behind its own position, plus a 5-second prefetch window. The API enforces this, and a recap is gated the same way.

## Essential flows

| Flow | Surface | Behaviour |
|---|---|---|
| First visit | Web `/` | See the concept demonstrated (live and delayed timelines side by side), then start a room |
| Start a room | Web or TV | Name the game; the room gets a 6-character code and a link |
| Join | Phone `/r/:code` | Enter a display name (no account) → choose "watching live" or "watching later" → sync |
| Sync | Phone or TV | Tap at kick-off, or auto-sync from known markers, or link to a TV |
| React | Phone | Tap a quick reaction or send short text. The confirmation says when each friend will see it |
| Watch with reactions | TV (or phone feed) | Reactions appear at their match position; presence shows who is ahead or behind |
| Loading | All | Joining, syncing and connecting are named stages, never a frozen screen |
| Errors | All | Unknown room, expired session, offline, out-of-sync clock: each has a recovery action |
| Returning | All | Device identity is remembered; "Your rooms" resumes at your last position |
| Recap | Phone or TV | The reaction intensity timeline and the loudest moments, gated by your position |

## Why Fire TV

The late watch happens on the living-room TV. Vega OS gives Delayed Reaction:
- **the player's playhead**, through the W3C media APIs (`@amazon-devices/react-native-w3cmedia`), as a precise clock that survives pause and seek;
- **Vega Media Controls**, so play/pause from the remote or Alexa keeps the clock honest;
- **Content Launcher**, so "Alexa, watch the match with my group" lands in the right room;
- a big shared screen, while phones act as private reaction pads.

On a platform with no social sports apps and no games, this is the reference integration of an SDK any Vega sports app can embed.

## Non-goals for v1

These stay out of v1:
- live video or voice chat;
- accounts and passwords (device identity is enough);
- recommendations, feeds, or public rooms;
- overlaying other apps' players (Vega cannot do this, and partners integrate the SDK instead).
