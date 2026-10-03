'use client';

import {
  extrapolate,
  formatGap,
  isAway,
  relativeTo,
  type MatchPosition,
  type Sport,
  type ViewerDto,
} from '@delayed-reaction/core';
import { Avatar } from '@/components/ui/viewer-chip';
import { cx } from '@/lib/cx';

/**
 * Where everyone is relative to you. Says *that* friends are ahead, never *what* they've seen.
 */
export function Presence({
  viewers,
  selfId,
  playhead,
  sport,
  serverNow,
}: {
  viewers: readonly ViewerDto[];
  selfId: string;
  playhead: MatchPosition;
  sport: Sport;
  serverNow: number;
}) {
  const others = viewers.filter((v) => v.id !== selfId && v.clockSource !== 'linked');
  if (others.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line-strong px-4 py-3 text-sm text-chalk-2">
        Nobody else here yet. Share the room code and friends can join whenever they're watching.
      </p>
    );
  }
  return (
    <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Friends in this room">
      {others.map((viewer) => {
        const line = describe(viewer, playhead, sport, serverNow);
        return (
          <li
            key={viewer.id}
            className="flex shrink-0 items-center gap-2.5 rounded-full border border-line bg-ink-900 py-1.5 pr-3.5 pl-1.5"
          >
            <Avatar name={viewer.name} color={viewer.color} />
            <span className="text-sm font-semibold text-chalk">{viewer.name}</span>
            <span className={cx('text-xs', line.tone)}>{line.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

function describe(viewer: ViewerDto, me: MatchPosition, sport: Sport, now: number) {
  if (!viewer.report || viewer.report.position.period === 0) {
    return { text: 'not started', tone: 'text-chalk-3' };
  }
  if (isAway(viewer.report, now)) return { text: 'away', tone: 'text-chalk-3' };
  const rel = relativeTo(me, extrapolate(viewer.report, now), sport);
  if (rel.relation === 'level') return { text: 'with you', tone: 'text-turf' };
  if (rel.relation === 'ahead') return { text: `${formatGap(rel.gapMs)} ahead`, tone: 'text-chalk-2' };
  return { text: `${formatGap(rel.gapMs)} behind`, tone: 'text-amber' };
}
