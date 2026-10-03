'use client';

import type { SyncStatus } from '@delayed-reaction/client';
import { Button } from '@/components/ui/button';
import { StatusLabel } from '@/components/ui/status';

/** One compact line that always says whether reactions are flowing. */
export function ConnectionStatus({ status, onEnded }: { status: SyncStatus; onEnded: () => void }) {
  switch (status) {
    case 'connecting':
      return <StatusLabel tone="muted" pulse>Connecting</StatusLabel>;
    case 'live':
      return <StatusLabel tone="ok">In sync</StatusLabel>;
    case 'reconnecting':
      return <StatusLabel tone="delayed" pulse>Reconnecting</StatusLabel>;
    case 'offline':
      return <StatusLabel tone="danger" pulse>Offline, retrying</StatusLabel>;
    case 'ended':
      return (
        <Button size="sm" variant="secondary" onClick={onEnded}>
          Rejoin
        </Button>
      );
  }
}
