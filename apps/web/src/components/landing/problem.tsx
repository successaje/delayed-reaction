/**
 * The problem, shown rather than described: the notification that ruins a late watch.
 */
export function Problem() {
  return (
    <section className="border-y border-line bg-ink-900/60">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div className="mx-auto w-full max-w-sm" aria-hidden>
          <div className="rounded-lg border border-line-strong bg-ink-850 p-3.5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between text-2xs text-chalk-3">
              <span className="font-semibold tracking-wide text-chalk-2">SUNDAY LEAGUE CHAT</span>
              <span>9:47 PM</span>
            </div>
            <p className="mt-2 text-sm text-chalk">
              <span className="font-semibold">Ada:</span> NO WAY he missed that penalty
            </p>
          </div>
          <p className="mt-3 text-center text-xs text-chalk-3">
            You, 12 minutes into the recording: <span className="text-chalk-2">oh.</span>
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">The problem</p>
          <h2 className="display text-2xl sm:text-3xl">The group chat is the spoiler</h2>
          <p className="mt-4 max-w-xl text-chalk-2">
            Most people can't watch live: kids' bedtime, a late shift, a different time zone. So they
            mute the chat, avoid their phone for two hours, and watch alone. The friends who make the
            game fun become the thing they have to hide from.
          </p>
        </div>
      </div>
    </section>
  );
}
