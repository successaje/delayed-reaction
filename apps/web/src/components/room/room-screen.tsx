'use client';

import { AppShell, PageTitle } from '@/components/app-shell';
import { Button, ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { JoinPanel } from './join-panel';
import { RoomLive } from './room-live';
import { useRoomSession } from './use-room-session';

export function RoomScreen({
  code,
  linkToTv,
  isNew,
}: {
  code: string;
  linkToTv: string | null;
  isNew: boolean;
}) {
  const { phase, retry, join, forget } = useRoomSession(code);

  switch (phase.kind) {
    case 'loading':
      return (
        <AppShell>
          <div aria-busy className="flex flex-col gap-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-6 h-12 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </AppShell>
      );
    case 'not-found':
      return (
        <AppShell>
          <PageTitle
            eyebrow={`Room ${code}`}
            title="We can't find that room"
            lead="Check the code with whoever sent it. Rooms close a week after they're created."
          />
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/join">Try another code</ButtonLink>
            <ButtonLink href="/start" variant="secondary">
              Start a new room
            </ButtonLink>
          </div>
        </AppShell>
      );
    case 'error':
      return (
        <AppShell>
          <PageTitle eyebrow={`Room ${code}`} title="Can't reach the room" lead={phase.message} />
          <Button onClick={retry}>Try again</Button>
        </AppShell>
      );
    case 'join':
      return (
        <AppShell>
          <JoinPanel room={phase.room} linkToTv={linkToTv} onJoin={join} />
        </AppShell>
      );
    case 'ready':
      return <RoomLive room={phase.room} session={phase.session} isNew={isNew} onEnded={forget} />;
  }
}
