import Link from 'next/link';
import { Wordmark } from '@/components/ui/logo';
import { cx } from '@/lib/cx';

/** Chrome for product pages: compact header, centred content column. */
export function AppShell({
  children,
  width = 'narrow',
  aside,
}: {
  children: React.ReactNode;
  width?: 'narrow' | 'wide';
  /** Right side of the header, e.g. a status label. */
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Wordmark />
          {aside ?? (
            <nav className="flex items-center gap-1 text-xs">
              <Link href="/join" className="rounded-sm px-2.5 py-1.5 text-chalk-2 hover:text-chalk">
                Join
              </Link>
              <Link href="/start" className="rounded-sm px-2.5 py-1.5 text-chalk-2 hover:text-chalk">
                Start a room
              </Link>
            </nav>
          )}
        </div>
      </header>
      <main
        className={cx(
          'mx-auto w-full flex-1 px-4 pt-8 pb-16 sm:px-6 sm:pt-14',
          width === 'narrow' ? 'max-w-md' : 'max-w-6xl',
        )}
      >
        {children}
      </main>
    </div>
  );
}

export function PageTitle({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: React.ReactNode }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h1 className="display text-2xl sm:text-3xl">{title}</h1>
      {lead && <p className="mt-3 text-sm text-chalk-2">{lead}</p>}
    </div>
  );
}
