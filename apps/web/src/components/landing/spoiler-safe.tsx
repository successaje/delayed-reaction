/**
 * The guarantee, with the mechanism visible: a timeline with the playhead, reactions behind it
 * revealed, reactions ahead of it locked.
 */
export function SpoilerSafe() {
  const behind = [9, 24, 40];
  const ahead = [65, 79, 92];
  return (
    <section className="border-y border-line bg-ink-900/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-24">
        <div>
          <p className="eyebrow mb-4">Spoiler-safe by design</p>
          <h2 className="display text-2xl sm:text-3xl">Nothing reaches you early. Not even by a second.</h2>
          <p className="mt-4 text-chalk-2">
            Your device only ever asks for reactions up to where you are in the match, plus five
            seconds so they land on the frame. The server enforces it. You'll see that friends are
            ahead of you, never what they've seen.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-chalk-2">
            <li>· Re-synced every half, so ads and breaks never drift you into the future</li>
            <li>· Skipping ahead files reactions quietly instead of flooding the screen</li>
            <li>· Replies from friends watching even later still find you</li>
          </ul>
        </div>
        <div aria-hidden className="rounded-lg border border-line bg-ink-950 p-6 sm:p-8">
          <div className="flex items-center justify-between text-2xs text-chalk-3">
            <span>Kick-off</span>
            <span className="font-mono">You · 2H 07:10</span>
            <span>Full time</span>
          </div>
          <div className="relative mt-4 h-24">
            <div className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
            <div className="absolute top-1/2 left-0 h-px w-[52%] bg-amber" />
            {behind.map((x) => (
              <span
                key={x}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-[130%] rounded-xs bg-chalk px-1.5 py-0.5 text-[0.6rem] font-bold text-ink-950"
                style={{ left: `${x}%` }}
              >
                SEEN
              </span>
            ))}
            {ahead.map((x) => (
              <span
                key={x}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-[130%] rounded-xs border border-dashed border-line-strong px-1.5 py-0.5 text-[0.6rem] font-bold text-chalk-3"
                style={{ left: `${x}%` }}
              >
                LOCKED
              </span>
            ))}
            <span className="absolute top-1/2 left-[52%] h-10 w-0.5 -translate-y-1/2 bg-amber" />
            <span className="absolute top-[70%] left-[52%] -translate-x-1/2 rounded-xs bg-amber px-1.5 py-0.5 font-mono text-[0.6rem] font-bold text-ink-950">
              +5s
            </span>
          </div>
          <p className="mt-2 text-xs text-chalk-3">
            Reactions after your playhead stay on the server until you get there.
          </p>
        </div>
      </div>
    </section>
  );
}
