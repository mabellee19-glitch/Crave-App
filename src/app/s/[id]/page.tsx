import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isValidSpaceId } from '@/lib/id';
import { SpaceApp } from '@/components/SpaceApp';

/*
 * Die Seite ist fuer jeden Datenraum dieselbe Huelle – die Daten holt der
 * Browser selbst. Deshalb wird sie beim ersten Aufruf einmal gebaut und danach
 * aus dem Cache ausgeliefert, statt bei jedem Oeffnen eine Funktion zu wecken.
 * Ein Kaltstart dieser Funktion kostete gut eine Sekunde, bevor ueberhaupt
 * etwas auf dem Bildschirm stand.
 */
export const dynamicParams = true;
export const revalidate = false;

export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: 'Crave',
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
