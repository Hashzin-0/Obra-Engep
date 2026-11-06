import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'OBra ENGEP — Manual Técnico Inteligente',
  description: 'Manual técnico inteligente para obras, instalações, segurança e estética automotiva.',
  applicationName: 'OBra ENGEP',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'OBra ENGEP — Manual Técnico Inteligente',
    description: 'Manual técnico inteligente para obras, instalações, segurança e estética automotiva.',
    type: 'website',
  },
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  appleWebApp: { capable: true, title: 'OBra ENGEP', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 2,
  themeColor: '#F5F2EC',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
