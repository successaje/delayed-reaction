'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/** Shown to the person who just created the room: get the link to the group. */
export function InviteCard({ code, title }: { code: string; title: string }) {
  const toast = useToast();
  const [url, setUrl] = useState(`/r/${code}`);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/r/${code}`);
    setCanShare(typeof navigator.share === 'function');
  }, [code]);

  async function share() {
    try {
      await navigator.share({ title, text: `Watch ${title} with me, whenever you can.`, url });
    } catch {
      // Dismissed the share sheet: nothing to do.
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.show({ title: 'Link copied', detail: 'Paste it in the group chat.', tone: 'success' });
    } catch {
      toast.show({ title: "Couldn't copy", detail: `The code is ${code}.`, tone: 'error' });
    }
  }

  return (
    <div className="animate-rise rounded-lg border border-amber/30 bg-amber-dim/30 p-4 sm:p-5">
      <p className="text-sm font-semibold text-chalk">Bring the group in</p>
      <p className="mt-1 text-sm text-chalk-2">
        Send the link. Friends watching live react now; anyone watching later gets every reaction at
        the right moment.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <code className="mr-1 rounded-sm bg-ink-950/60 px-2.5 py-1.5 font-mono text-sm tracking-[0.25em]">
          {code}
        </code>
        {canShare && (
          <Button size="sm" variant="amber" onClick={share}>
            Share link
          </Button>
        )}
        <Button size="sm" variant={canShare ? 'secondary' : 'amber'} onClick={copy}>
          Copy link
        </Button>
      </div>
    </div>
  );
}
