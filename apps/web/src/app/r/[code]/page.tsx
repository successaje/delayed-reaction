import type { Metadata } from 'next';
import { RoomScreen } from '@/components/room/room-screen';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `Room ${code.toUpperCase()}` };
}

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tv?: string; new?: string }>;
}) {
  const { code } = await params;
  const query = await searchParams;
  return (
    <RoomScreen
      code={code.toUpperCase()}
      linkToTv={typeof query.tv === 'string' ? query.tv : null}
      isNew={query.new === '1'}
    />
  );
}
