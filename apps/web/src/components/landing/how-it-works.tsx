import { cx } from '@/lib/cx';

const steps = [
  {
    n: '01',
    title: 'Start a room',
    body: 'On the Fire TV or on your phone. Send the link to the group. Everyone joins with just a name.',
    visual: <CodeChip />,
  },
  {
    n: '02',
    title: 'React live',
    body: "Tap once at kick-off to set your clock, then react with a word or a line. You'll see exactly when each friend will get it.",
    visual: <SentChip />,
  },
  {
    n: '03',
    title: 'Press play whenever',
    body: "Watching later? Every reaction waits for its moment in your match. Pause, rewind, skip: the reactions follow your playhead.",
    visual: <LowerThird />,
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6 lg:py-28">
      <p className="eyebrow mb-4">How it works</p>
      <h2 className="display max-w-2xl text-2xl sm:text-3xl">Three steps, one clock</h2>
      <ol className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-3">
        {steps.map((step) => (
          <li key={step.n} className="flex flex-col bg-ink-950 p-6 sm:p-8">
            <span className="font-mono text-xs text-amber">{step.n}</span>
            <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-chalk-2">{step.body}</p>
            <div className="mt-8 flex flex-1 items-end">{step.visual}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function CodeChip() {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-sm border border-line-strong px-3 py-2 font-mono text-lg tracking-[0.3em]">KX7P2M</span>
      <span className="text-xs text-chalk-3">room code</span>
    </div>
  );
}

function SentChip() {
  return (
    <div className="w-full rounded-md border border-turf/40 bg-ink-850 px-4 py-3">
      <p className="text-sm font-semibold">Sent</p>
      <p className="text-xs text-chalk-2">Tunde will see this in 38 min.</p>
    </div>
  );
}

function LowerThird() {
  return (
    <div className={cx('flex w-full overflow-hidden rounded-sm border border-line bg-ink-900')}>
      <span className="w-1.5 bg-[#4FD1C5]" />
      <div className="flex flex-1 items-center justify-between px-4 py-2.5">
        <div>
          <p className="text-[0.7rem] font-semibold text-[#4FD1C5]">Bola</p>
          <p className="display text-2xl leading-none">REF?!</p>
        </div>
        <span className="font-mono text-xs text-chalk-3">2H 07:41</span>
      </div>
    </div>
  );
}
