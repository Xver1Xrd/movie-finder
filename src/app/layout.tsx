import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MovieTier — Pick a movie with friends',
  description: 'Swipe, vote, and discover movies with friends.',
  appleWebApp: { capable: true, title: 'MovieTier', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className="min-h-dvh flex flex-col">
        {children}
      </body>
    </html>
  );
}
