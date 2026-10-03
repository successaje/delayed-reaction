import {
  extrapolate,
  formatGap,
  isAway,
  relativeTo,
  type MatchPosition,
  type Sport,
  type ViewerDto,
} from '@delayed-reaction/core';

export interface Delivery {
  readonly viewer: ViewerDto;
  /** `later`: they haven't reached this moment yet. `now`: watching with you. `missed`: already past it. */
  readonly when: 'later' | 'now' | 'missed';
  readonly gapMs: number;
}

/**
 * For a reaction at `position`, when each friend will see it. Devices linked to someone else's
 * TV are folded into that TV; friends who aren't syncing are left out.
 */
export function deliveries(
  position: MatchPosition,
  viewers: readonly ViewerDto[],
  selfId: string,
  sport: Sport,
  serverNow: number,
): Delivery[] {
  const result: Delivery[] = [];
  for (const viewer of viewers) {
    if (viewer.id === selfId || viewer.clockSource === 'linked') continue;
    if (!viewer.report || isAway(viewer.report, serverNow)) continue;
    const theirs = extrapolate(viewer.report, serverNow);
    const rel = relativeTo(theirs, position, sport);
    const when = rel.relation === 'ahead' ? 'later' : rel.relation === 'level' ? 'now' : 'missed';
    result.push({ viewer, when, gapMs: rel.gapMs });
  }
  return result.sort((a, b) => order(a) - order(b) || b.gapMs - a.gapMs);
}

function order(d: Delivery): number {
  return d.when === 'later' ? 0 : d.when === 'now' ? 1 : 2;
}

/**
 * The confirmation line after sending: "Tunde will see this in 38 min." The single most
 * important sentence in the reactor's experience, so it stays short and concrete.
 */
export function describeDeliveries(list: readonly Delivery[]): string {
  const later = list.filter((d) => d.when === 'later');
  const now = list.filter((d) => d.when === 'now');
  if (later.length === 1) {
    return `${later[0]!.viewer.name} will see this in ${formatGap(later[0]!.gapMs)}.`;
  }
  if (later.length > 1) {
    const furthest = later[0]!;
    return `${later.length} friends will see this, ${furthest.viewer.name} in ${formatGap(furthest.gapMs)}.`;
  }
  if (now.length > 0) return now.length === 1 ? `${now[0]!.viewer.name} is seeing it now.` : 'Everyone is seeing it now.';
  return 'Saved for anyone who watches later.';
}
