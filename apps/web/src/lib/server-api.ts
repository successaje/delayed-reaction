import type { SharedMomentDto } from '@delayed-reaction/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';

/** Server-side fetch of a shared moment, for the page and its link-preview image. */
export async function fetchShare(id: string): Promise<SharedMomentDto | null> {
  try {
    const res = await fetch(`${API_URL}/v1/shares/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    });
    return res.ok ? ((await res.json()) as SharedMomentDto) : null;
  } catch {
    return null;
  }
}
