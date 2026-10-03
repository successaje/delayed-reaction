import { InViewVideo } from '@/components/ui/in-view-video';

/**
 * The TV experience, drawn in the TV app's own visual language: scorebug top-left,
 * reaction lower-thirds sliding in on the right, a QR code on pause.
 */
export function FireTv() {
  return (
    <section id="fire-tv" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-center">
        <div aria-hidden className="relative">
          <div className="overflow-hidden rounded-[14px] border-[10px] border-[#151716] bg-black shadow-[0_40px_100px_-40px_rgba(0,0,0,0.95)]">
            <div className="relative aspect-video">
              <InViewVideo src="/demo/penalty.mp4" poster="/demo/penalty.jpg" className="h-full w-full object-cover" />
              <div className="absolute top-[6%] left-[5%] flex overflow-hidden rounded-xs text-[0.6rem] font-semibold sm:text-xs">
                <span className="bg-amber px-1.5 py-1 font-mono text-ink-950">2H</span>
                <span className="bg-ink-950/90 px-2 py-1 font-mono tabular">31:07</span>
                <span className="bg-ink-850/90 px-2 py-1 text-chalk-2">With 3 friends</span>
              </div>
              <div className="absolute right-[5%] bottom-[12%] flex flex-col items-end gap-1.5">
                <TvCard name="Bola" color="#4FD1C5" text="WHAT." />
                <TvCard name="Ada" color="#FF8A3D" text="how is that not a pen" plain />
              </div>
            </div>
          </div>
          <div className="mx-auto h-3 w-1/3 rounded-b-lg bg-[#151716]" />
        </div>
        <div>
          <p className="eyebrow mb-4">Built for Fire TV</p>
          <h2 className="display text-2xl sm:text-3xl">The playhead is the clock</h2>
          <p className="mt-4 text-chalk-2">
            On Fire TV, Delayed Reaction reads the match straight from the video player. Pause and the
            reactions wait. Rewind and they replay. Skip ahead and they're filed away instead of
            flooding the screen.
          </p>
          <p className="mt-4 text-chalk-2">
            Scan the code on the TV and your phone becomes the reaction pad, already in sync. Nothing
            to set up, nothing to install.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-line pt-6 text-sm">
            <div>
              <dt className="text-chalk-3">Runs on</dt>
              <dd className="mt-1 font-semibold">Vega OS · Fire TV</dd>
            </div>
            <div>
              <dt className="text-chalk-3">Phones</dt>
              <dd className="mt-1 font-semibold">Any browser, via QR</dd>
            </div>
            <div>
              <dt className="text-chalk-3">Clock source</dt>
              <dd className="mt-1 font-semibold">W3C media playhead</dd>
            </div>
            <div>
              <dt className="text-chalk-3">Navigation</dt>
              <dd className="mt-1 font-semibold">Remote D-pad</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function TvCard({ name, color, text, plain }: { name: string; color: string; text: string; plain?: boolean }) {
  return (
    <div className="flex overflow-hidden rounded-sm border border-line bg-ink-900/95">
      <span className="w-1" style={{ backgroundColor: color }} />
      <div className="px-2.5 py-1 sm:px-3 sm:py-1.5">
        <p className="text-[0.55rem] font-semibold sm:text-[0.65rem]" style={{ color }}>
          {name}
        </p>
        <p className={plain ? 'text-[0.7rem] text-chalk sm:text-sm' : 'display text-base leading-none sm:text-xl'}>
          {text}
        </p>
      </div>
    </div>
  );
}
