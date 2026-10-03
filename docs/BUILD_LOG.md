# Build log

| Date | Milestone | PR |
|---|---|---|
| 2026-10-03 | Repository initialized; product model and architecture documented | — |
| 2026-10-03 | Core domain: match positions, viewer clocks, spoiler gate, reaction timeline, API schemas | #1 |
| 2026-10-03 | API: rooms, hashed viewer tokens, gated sync with two-part cursor, idempotent reactions | #2 |
| 2026-10-03 | Client: TimelineSync engine, playheads (manual / player / linked), session store, React hooks | #3 |
| 2026-10-03 | Web foundation: design tokens, components, start and join flows | #4 |
| 2026-10-03 | Phone companion: join, kick-off sync, reaction pad, presence, delivery confirmations | #5 |
| 2026-10-03 | Fire TV app: lobby with QR pairing, player with on-the-frame reactions; Vega shell bundled in CI | #6 |
| 2026-10-03 | Landing page with a live two-screen demo of the core interaction | #7 |
| 2026-10-03 | AWS: DynamoDB store, Lambda entry, CDK stack (HTTP API, CloudFront media) | #8 |
| 2026-10-03 | README, friction log, build log | #9 |

## Next

- [ ] Deploy to AWS and Vercel (needs AWS credentials)
- [ ] Run on the Vega Virtual Device or a Fire TV (needs the Vega SDK)
- [ ] Vega Media Controls, so remote and Alexa transport commands keep the clock honest
- [ ] Post-match recap: the group's loudest moments, gated by your position
- [ ] Demo video
