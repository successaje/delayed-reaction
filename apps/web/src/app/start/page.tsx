import type { Metadata } from 'next';
import { AppShell, PageTitle } from '@/components/app-shell';
import { StartRoomForm } from '@/components/rooms/start-room-form';

export const metadata: Metadata = { title: 'Start a room' };

export default function StartPage() {
  return (
    <AppShell>
      <PageTitle
        eyebrow="New room"
        title="What are you watching?"
        lead="You'll get a link for the group. Everyone can watch whenever they like, and reactions wait for each person's moment."
      />
      <StartRoomForm />
    </AppShell>
  );
}
