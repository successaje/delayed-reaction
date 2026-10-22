import { formatPosition, getSport, reactionLabel } from '@delayed-reaction/core';
import { ImageResponse } from 'next/og';
import { fetchShare } from '@/lib/server-api';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A moment shared from Deract';

/** The link preview: the match, the moment, and the group's reactions as lower-thirds. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const share = await fetchShare((await params).id);
  const reactions = share?.reactions.slice(0, 3) ?? [];
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0a0c0b',
          color: '#f2f0e8',
          padding: 64,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontWeight: 800 }}>
          <span style={{ color: '#ffb547' }}>DE</span>RACT
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {reactions.map((r, i) => (
            <div key={i} style={{ display: 'flex', background: '#151916', borderRadius: 12, overflow: 'hidden', width: 760 }}>
              <div style={{ width: 14, background: r.color }} />
              <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 24px' }}>
                <span style={{ color: r.color, fontSize: 26, fontWeight: 700 }}>{r.name}</span>
                <span style={{ fontSize: r.body.kind === 'quick' ? 64 : 38, fontWeight: 900 }}>{reactionLabel(r.body)}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, color: '#c4c7be' }}>
          <span>{share?.title ?? 'A shared moment'}</span>
          <span style={{ color: '#ffb547' }}>
            {share ? formatPosition(share.position, getSport(share.sport)) : ''}
          </span>
        </div>
      </div>
    ),
    size,
  );
}
