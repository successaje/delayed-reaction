import Link from 'next/link';
import { ButtonLink } from '@/components/ui/button';
import { Wordmark } from '@/components/ui/logo';

export function ClosingCta() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-24">
        <h2 className="display max-w-2xl text-3xl sm:text-4xl">
          Next match, <span className="text-amber">watch it when you can.</span>
        </h2>
        <ButtonLink href="/start" size="lg" variant="amber">
          Start a room
        </ButtonLink>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-xs text-chalk-3 sm:px-6 md:flex-row md:items-center md:justify-between">
        <Wordmark />
        <p className="max-w-xl">
          Demo footage: 2021 FIFA Beach Soccer World Cup final, filmed from the stands by Voltmetro,{' '}
          <a
            className="underline decoration-line-strong underline-offset-2 hover:text-chalk-2"
            href="https://commons.wikimedia.org/wiki/Category:2021_FIFA_Beach_Soccer_World_Cup_Final"
          >
            CC0 on Wikimedia Commons
          </a>
          . Built for Amazon's Build, Ship, Shape hackathon.
        </p>
        <nav className="flex gap-5">
          <Link href="/join" className="hover:text-chalk-2">
            Join
          </Link>
          <a href="https://github.com/successaje/delayed-reaction" className="hover:text-chalk-2">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
