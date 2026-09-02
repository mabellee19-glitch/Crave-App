import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidSpaceId } from '@/lib/id';
import { SpaceApp } from '@/components/SpaceApp';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'CRAVE',
    // Eigenes Manifest pro Datenraum: so startet die App vom Home-Bildschirm
    // wieder genau in diesem Datenraum.
    manifest: isValidSpaceId(id) ? `/s/${id}/manifest` : undefined,
  };
}

export default async function SpacePage({ params }: Props) {
  const { id } = await params;
  if (!isValidSpaceId(id)) notFound();
  return <SpaceApp spaceId={id} />;
}
