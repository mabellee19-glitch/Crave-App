import type { Metadata, Viewport } from 'next';
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf7f2' },
    { media: '(prefers-color-scheme: dark)', color: '#16130f' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
