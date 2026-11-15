import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GameHouse — Online Multiplayer Party Game Platform',
  description: 'Play together, compete together! Online browser multiplayer party games featuring Panjat Pinang Battle.',
  keywords: ['party games', 'multiplayer', 'browser game', 'panjat pinang', 'gamehouse', 'indonesian game'],
  authors: [{ name: 'GameHouse' }],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GameHouse',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0E17',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M50 12 L88 42 L80 48 L50 24 L20 48 L12 42 Z' fill='%23F97316'/><path d='M22 46 C22 42 26 38 30 38 L70 38 C74 38 78 42 78 46 L82 72 C83 80 75 86 68 82 L58 76 L42 76 L32 82 C25 86 17 80 18 72 Z' fill='%236366F1'/></svg>" />
      </head>
      <body className="bg-background text-slate-100 antialiased selection:bg-indigo-500 selection:text-white min-h-screen overscroll-none">
        {children}
      </body>
    </html>
  );
}
