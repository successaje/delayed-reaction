import type { ReactionDto, ViewerDto } from '@delayed-reaction/core';
import { useEffect, useReducer } from 'react';
import type { ApiClientError } from './api';
import type { OwnReactionState, SyncStatus, TimelineEvent, TimelineSync } from './engine';

export interface FeedEntry {
  readonly reaction: ReactionDto;
  /** `live`: shown as it happened. `history`: received late or skipped. `own`: sent from this device. */
  readonly kind: 'live' | 'history' | 'own';
  readonly ownState: OwnReactionState | null;
  /** Local time the entry appeared, for transient displays. */
  readonly appearedAt: number;
}

export interface TimelineState {
  readonly status: SyncStatus;
  readonly error: ApiClientError | null;
  readonly viewers: readonly ViewerDto[];
  /** Newest first. */
  readonly feed: readonly FeedEntry[];
}

const FEED_LIMIT = 150;

const initial: TimelineState = { status: 'connecting', error: null, viewers: [], feed: [] };

function reducer(state: TimelineState, event: TimelineEvent): TimelineState {
  switch (event.type) {
    case 'due':
    case 'history':
      return {
        ...state,
        feed: addEntries(
          state.feed,
          event.reactions.map((reaction) => ({
            reaction,
            kind: event.type === 'due' ? 'live' : 'history',
            ownState: null,
            appearedAt: Date.now(),
          })),
        ),
      };
    case 'own': {
      const existing = state.feed.find((e) => e.reaction.id === event.reaction.id);
      if (existing) {
        return {
          ...state,
          feed: state.feed.map((e) =>
            e.reaction.id === event.reaction.id ? { ...e, ownState: event.state } : e,
          ),
        };
      }
      return {
        ...state,
        feed: addEntries(state.feed, [
          { reaction: event.reaction, kind: 'own', ownState: event.state, appearedAt: Date.now() },
        ]),
      };
    }
    case 'presence':
      return { ...state, viewers: event.viewers };
    case 'status':
      return { ...state, status: event.status, error: event.error };
    case 'cursor':
      return state;
  }
}

function addEntries(feed: readonly FeedEntry[], entries: FeedEntry[]): FeedEntry[] {
  const seen = new Set(feed.map((e) => e.reaction.id));
  const fresh = entries.filter((e) => !seen.has(e.reaction.id)).reverse();
  return [...fresh, ...feed].slice(0, FEED_LIMIT);
}

/** Subscribes a component to a running TimelineSync and keeps a bounded feed. */
export function useTimelineState(engine: TimelineSync | null): TimelineState {
  const [state, dispatch] = useReducer(reducer, initial);
  useEffect(() => {
    if (!engine) return;
    return engine.subscribe(dispatch);
  }, [engine]);
  return state;
}

/** Calls `handler` for each event, e.g. to animate a reaction card on the TV. */
export function useTimelineEvents(
  engine: TimelineSync | null,
  handler: (event: TimelineEvent) => void,
): void {
  useEffect(() => {
    if (!engine) return;
    return engine.subscribe(handler);
  }, [engine, handler]);
}
