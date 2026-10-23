import type { Metadata, Viewport } from 'next';
import './globals.css';
import { HubProvider } from '@/lib/hub';
import { Shell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Synergy Hub',
  description: 'מרכז הניהול של צוות Synergy Innovate',
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#fafaf9' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <HubProvider>
          <Shell>{children}</Shell>
        </HubProvider>
      </body>
    </html>
  );
}
