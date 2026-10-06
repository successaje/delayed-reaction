import { formatPosition, getSport, reactionLabel } from '@delayed-reaction/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { MomentPlayer } from '@/components/moment/moment-player';
import { ButtonLink } from '@/components/ui/button';
import { fetchShare } from '@/lib/server-api';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const share = await fetchShare((await params).id);
  if (!share) return { title: 'Moment not found' };
  const first = share.reactions[0];
  const headline = first ? `${first.name}: ${reactionLabel(first.body)}` : 'A moment worth watching';
  return {
    title: `${headline} · ${share.title}`,
    description: `${share.reactions.length} reactions at ${formatPosition(share.position, getSport(share.sport))}. Watch it late, watch it together.`,
  };
}

export default async function MomentPage({ params }: { params: Promise<{ id: string }> }) {
  const share = await fetchShare((await params).id);
  if (!share) notFound();
  const sport = getSport(share.sport);
  const people = new Set(share.reactions.map((r) => r.name)).size;

  return (
    <AppShell width="wide">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <MomentPlayer share={share} />
        <div>
          <p className="eyebrow mb-3">
            {share.title} · {formatPosition(share.position, sport)}
          </p>
          <h1 className="display text-3xl sm:text-4xl">
            {people <= 1 ? 'One reaction' : `${people} friends`} lost it here
          </h1>
          <p className="mt-4 text-chalk-2">
            {share.sharedBy} shared this moment from their room. Every reaction landed at the moment it
            happened in the match, for each friend, whenever they watched.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/start" size="lg">
              Watch your next match together
            </ButtonLink>
            <ButtonLink href="/" size="lg" variant="secondary">
              How it works
            </ButtonLink>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
