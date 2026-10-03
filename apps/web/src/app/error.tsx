'use client';

import { AppShell, PageTitle } from '@/components/app-shell';
import { Button } from '@/components/ui/button';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <AppShell>
      <PageTitle
        eyebrow="Something broke"
        title="That didn't load"
        lead="It's on our side, not yours. Your rooms and reactions are safe."
      />
      <Button onClick={reset}>Try again</Button>
    </AppShell>
  );
}
