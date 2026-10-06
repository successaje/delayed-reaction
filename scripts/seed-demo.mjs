#!/usr/bin/env node
// Plays two friends, Ada and Bola, who have already watched the demo match, into a room.
// Their reactions are pinned to the moments in the CC0 final, so anyone who watches the room
// afterwards (the TV in the demo) gets them on the frame.
//
//   node scripts/seed-demo.mjs <ROOM_CODE> [--api https://...]
//
// Start a watch on the TV first, then seed its room code. Safe to run twice: reaction ids are
// fixed per room, so the API de-duplicates them.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const code = args.find((a) => /^[2-9A-HJ-NP-Z]{6}$/i.test(a))?.toUpperCase();
const apiFlag = args.indexOf('--api');
const API = (apiFlag >= 0 ? args[apiFlag + 1] : process.env.API_URL) ??
  'https://hi0uggjch1.execute-api.us-east-1.amazonaws.com';

if (!code) {
  console.error('Usage: node scripts/seed-demo.mjs <ROOM_CODE> [--api URL]');
  process.exit(1);
}

const s = (seconds) => Math.round(seconds * 1000);
/** Moments in the demo program (seconds into the clip; kick-off is at 0:00). */
const SCRIPT = [
  { who: 'Ada', at: 5.8, quick: 'no' },
  { who: 'Bola', at: 6.3, quick: 'yes' },
  { who: 'Ada', at: 8.5, text: 'how did nobody stop that' },
  { who: 'Bola', at: 30, quick: 'nervous' },
  { who: 'Ada', at: 47, quick: 'ref' },
  { who: 'Ada', at: 66, quick: 'unreal' },
  { who: 'Bola', at: 68, quick: 'come-on' },
  { who: 'Ada', at: 100, text: 'CHAMPIONS. I am not okay' },
];

async function call(method, path, body, token) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${json?.error?.message ?? ''}`);
  return json;
}

const room = await call('GET', `/v1/rooms/${code}`);
console.log(`Room ${code}: ${room.room.title}`);

// Remember Ada and Bola per room, so re-running the script reuses them instead of adding
// another pair of friends.
const memo = join(tmpdir(), `delayed-reaction-seed-${new URL(API).host}-${code}.json`);
const people = existsSync(memo) ? JSON.parse(readFileSync(memo, 'utf8')) : {};
for (const name of ['Ada', 'Bola']) {
  if (people[name]) {
    console.log(`  ${name} is already in`);
    continue;
  }
  const session = await call('POST', `/v1/rooms/${code}/viewers`, { name, clockSource: 'manual' });
  people[name] = session.token;
  console.log(`  ${name} joined`);
}
writeFileSync(memo, JSON.stringify(people));

// Both friends called it before kick-off (predictions lock a minute into each person's match).
const CALLS = { Ada: { home: 3, away: 1 }, Bola: { home: 2, away: 2 } };
for (const [name, score] of Object.entries(CALLS)) {
  await call('POST', `/v1/rooms/${code}/predictions`, score, people[name]).catch(() => undefined);
  console.log(`  ${name} called ${score.home}–${score.away}`);
}

const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

for (const [i, line] of SCRIPT.entries()) {
  const body = line.quick ? { kind: 'quick', value: line.quick } : { kind: 'text', value: line.text };
  try {
    await call(
      'POST',
      `/v1/rooms/${code}/reactions`,
      { id: `demo-${code}-${String(i).padStart(2, '0')}`, position: { period: 1, ms: s(line.at) }, body },
      people[line.who],
    );
    console.log(`  ${line.who} at ${clock(line.at)} → ${line.quick ?? line.text}`);
  } catch (error) {
    // Already seeded by an earlier run: the reaction is there, keep going.
    if (!String(error.message).includes('already in use')) throw error;
    console.log(`  ${line.who} at ${clock(line.at)} → already seeded`);
  }
}

// Leave both friends reported as having finished, so the TV's presence shows them ahead.
for (const name of Object.keys(people)) {
  await call('POST', `/v1/rooms/${code}/sync`, { position: { period: 1, ms: s(135) }, playing: false }, people[name]);
}
console.log('Done. Press play on the TV.');
