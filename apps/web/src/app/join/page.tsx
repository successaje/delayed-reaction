import type { Metadata } from 'next';
import { AppShell, PageTitle } from '@/components/app-shell';
import { JoinForm } from '@/components/rooms/join-form';
import { RecentRooms } from '@/components/rooms/recent-rooms';

export const metadata: Metadata = { title: 'Join a room' };

export default function JoinPage() {
  return (
    <AppShell>
      <PageTitle
        eyebrow="Join"
        title="Got a room code?"
        lead="It's on the TV, or in the link your friend sent. Six letters and numbers."
      />
      <JoinForm />
      <RecentRooms />
    </AppShell>
  );
}
