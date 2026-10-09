import type { Metadata, Viewport } from 'next';
import { THEME_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'CRAVE – Kochen & Einkaufen',
  description:
    'Persönliche Koch- und Einkaufs-App: Rezepte, Gerichte, Kochmodus mit Timer und eine Einkaufsliste, die auf allen Geräten gleich ist.',
  applicationName: 'CRAVE',
  appleWebApp: {
    capable: true,
    title: 'CRAVE',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  // Die gewaehlte Farbwelt passt die Farbe beim Start selbst an (lib/theme).
  themeColor: '#faf6ea',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Die Farbwelt setzt das Skript im Kopf, bevor React laeuft – daher darf
    // das Attribut am <html> vom Server-HTML abweichen.
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
