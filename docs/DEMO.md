# Demo video plan (under 3 minutes)

**Goal:** a judge understands the idea in the first 20 seconds and sees it work on Fire TV by 1:30.

## Setup before recording

- **Devices:** the Vega Virtual Device (or a Fire TV Stick 4K Select) running the release build, pointed at the deployed API.
- **Phones:** two. Phone A is "Ada" watching live; phone B is linked to the TV.
- **Seed room:**
  1. On the TV, start either demo match.
  2. Run `node scripts/seed-demo.mjs <ROOM_CODE>` (the code shown in the lobby). The script reads the room's match and uses its own set of reactions.
  3. Wait a minute before pressing play. Reactions posted in the last 30 seconds count as fresh replies, so skipping past them would tag them "replied later".

  Ada and Bola join as friends who already watched. The script is safe to run twice.
  - **Beach soccer:** the penalty (1H 0:05), the nervy spell (0:30), a refereeing call (0:47), the winning celebrations (1:06) and full time (1:40). Calls: 3–1 and 2–2.
  - **Basketball:** a shot at the rim (1H 0:12), the drive through the defence (1:08), half time (1:36), the bench going up (2H 0:58), the three (1:13) and the buzzer (1:44). Calls: 80–70 (right result) and 74–77.
- **Recording:** a screen recording of the TV output plus phone screen recordings, composited side by side.

## Script

| Time | Shot | Voice-over / on-screen text |
|---|---|---|
| 0:00 | Black. A phone buzzes: "Ada: NO WAY he missed that". Cut to "You: 12 minutes into the recording." | "Most of us can't watch the game live. And the group chat ruins it." |
| 0:10 | Title card: **Deract · your group chat, on your game clock** | "Deract pins every reaction to the match clock, not the wall clock." |
| 0:18 | Phone A (Ada, live): taps **Kick-off**, then **NOOO** at the penalty. Toast: *"Tunde will see this in 38 min."* | "Ada's watching live. She reacts. She's told exactly when Tunde will see it." |
| 0:32 | Fire TV home → *RFU v Japan* → lobby with the QR code and "Ada · 38 min ahead". | "Tunde's watching later, on Fire TV. He can see that Ada's ahead, but nothing she's said." |
| 0:45 | Phone B scans the QR → "Follow Living room TV" → pad. | "His phone becomes the reaction pad, already synced to the TV. Nothing to set up." |
| 0:55 | TV plays. At the penalty, **Ada's "NOOO" slides in on the frame**. | (Let it breathe; no voice for two seconds.) |
| 1:05 | Tunde presses ▲ on the remote, picks **REF?!**, OK. It slides in as "You". | "No phone in reach? React from the remote." |
| 1:12 | Tunde types "how did he save that" on the phone. Cut to Ada's phone: both arrive marked *caught up*. | "And his reactions travel backwards to Ada: replies from behind." |
| 1:20 | Remote: pause, then rewind 10 s. The card disappears and lands again on the frame. "Alexa, pause." | "The video playhead *is* the clock. Pause, rewind, Alexa: the reactions follow." |
| 1:40 | Skip ahead 30 s: no flood of cards. | "Skip ahead and they're filed away. Never a spoiler, never a flood." |
| 1:50 | Full time: **The loudest moments** → select the penalty → it replays. | "At full time, the group's loudest moments. Built only from what you've watched." |
| 2:10 | Diagram: the timeline with SEEN / LOCKED and +5 s. | "Spoiler-safe by construction: your TV can only ask for reactions up to where it is, plus five seconds, and the server enforces it." |
| 2:25 | Architecture strip: Vega OS · W3C Media · Media Controls · Lambda · DynamoDB · CloudFront. | "Built on Vega OS and AWS. Open source, so any sports app on Fire TV can add it." |
| 2:40 | Landing page hero: the two screens. End card with the URL and the repository. | "Watch it late. Watch it together." |

## Shots to capture

- The TV lobby with presence showing a friend ahead.
- The lower-third landing on the penalty frame. Record this twice, to be safe.
- The phone confirmation toast.
- A "caught up" reply on the live phone.
- The pause overlay with the QR code.
- The full-time moments list and a replay.
