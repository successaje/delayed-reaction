import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Wordmark } from '@/components/ui/logo';

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Wordmark />
        <nav className="hidden items-center gap-7 text-sm text-chalk-2 md:flex" aria-label="Sections">
          <a href="#how" className="hover:text-chalk">How it works</a>
          <a href="#fire-tv" className="hover:text-chalk">Fire TV</a>
          <a href="#developers" className="hover:text-chalk">Developers</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/join" className="hidden rounded-sm px-3 py-2 text-sm text-chalk-2 hover:text-chalk sm:block">
            Join
          </Link>
          <ButtonLink href="/start" size="sm">
            Start a room
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
