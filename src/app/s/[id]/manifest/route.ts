import { NextResponse } from 'next/server';
import { isValidSpaceId } from '@/lib/id';

export const dynamic = 'force-dynamic';

/**
 * Web-App-Manifest pro Datenraum. `start_url` zeigt auf genau diesen Link,
 * damit die vom Home-Bildschirm gestartete App die richtigen Daten oeffnet.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidSpaceId(id)) {
    return NextResponse.json({ error: 'invalid_space' }, { status: 400 });
  }

  return NextResponse.json(
    {
      name: 'CRAVE – Kochen & Einkaufen',
      short_name: 'CRAVE',
      description: 'Rezepte, Gerichte und Einkaufsliste – auf allen Geräten gleich.',
      start_url: `/s/${id}`,
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#faf6ea',
      theme_color: '#faf6ea',
      lang: 'de',
      dir: 'ltr',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  );
}
