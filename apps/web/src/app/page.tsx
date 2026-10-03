import { AppShell } from '@/components/app-shell';
import { ButtonLink } from '@/components/ui/button';

export default function Home() {
  return (
    <AppShell>
      <p className="eyebrow mb-4">Delayed Reaction</p>
      <h1 className="display text-3xl">Watch it late. Watch it together.</h1>
      <p className="mt-4 text-chalk-2">
        Reactions are pinned to the game clock, so each one reaches you at the moment it happened in
        the match, and never before.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/start" size="lg">
          Start a room
        </ButtonLink>
        <ButtonLink href="/join" size="lg" variant="secondary">
          Join
        </ButtonLink>
      </div>
    </AppShell>
  );
}
