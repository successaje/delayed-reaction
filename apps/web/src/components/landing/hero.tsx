import { ButtonLink } from '@/components/ui/button';
import { TwoTimelines } from './two-timelines';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_70%_0%,rgba(255,181,71,0.10),transparent_70%)]"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-24 lg:pb-28">
        <div className="animate-rise">
          <p className="eyebrow mb-5">For Fire TV, and every phone</p>
          <h1 className="display text-[3rem] leading-[0.95] sm:text-[4rem] xl:text-[4.6rem]">
            Watch it late.
            <br />
            <span className="text-amber">Watch it together.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base text-chalk-2 sm:text-lg sm:leading-8">
            Deract pins your group chat to the game clock. Friends react live; you press play
            an hour later and every reaction lands on the exact moment it happened, never before.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/start" size="lg">
              Start a room
            </ButtonLink>
            <ButtonLink href="/join" size="lg" variant="secondary">
              Join with a code
            </ButtonLink>
          </div>
          <p className="mt-5 text-xs text-chalk-3">No accounts. No app to install on your phone.</p>
        </div>
        <div className="animate-rise [animation-delay:120ms]">
          <TwoTimelines />
        </div>
      </div>
    </section>
  );
}
