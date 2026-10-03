import { ButtonLink } from '@/components/ui/button';

const snippet = `import { ApiClient, TimelineSync, playerPlayhead } from '@delayed-reaction/client';

const sync = new TimelineSync({
  api: new ApiClient({ baseUrl: API_URL }),
  roomCode, token, viewerId,
  // Your player's playhead is the clock. Kick-off at 0:00 in the media.
  readPlayhead: playerPlayhead(
    [{ period: 1, localStartMs: 0 }],
    () => player.currentTime * 1000,
    () => !player.paused,
  ),
});

sync.subscribe((event) => {
  if (event.type === 'due') showLowerThird(event.reactions);
});
sync.start();`;

export function Developers() {
  return (
    <section id="developers" className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:py-24">
        <div>
          <p className="eyebrow mb-4">For sports app developers</p>
          <h2 className="display text-2xl sm:text-3xl">Add it to your player in a few lines</h2>
          <p className="mt-4 text-chalk-2">
            The sync engine is open source and player-agnostic. Point it at your video's playhead and
            your viewers get asynchronous co-watching: presence, reactions on the frame, spoiler
            safety enforced by the server.
          </p>
          <div className="mt-8">
            <ButtonLink href="https://github.com/successaje/delayed-reaction" variant="secondary">
              Read the source
            </ButtonLink>
          </div>
        </div>
        <pre className="overflow-x-auto rounded-lg border border-line bg-ink-900 p-5 font-mono text-[0.8rem] leading-6 text-chalk-2 [font-variant-ligatures:none]">
          <code>{snippet}</code>
        </pre>
      </div>
    </section>
  );
}
