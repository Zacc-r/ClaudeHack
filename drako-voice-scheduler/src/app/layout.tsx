import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
import { PWAUpdater } from '@/components/PWAUpdater';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-heading',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DRAKO - Voice Schedule Builder',
  description: 'AI-powered voice scheduling companion. Build your perfect day with DRAKO.',
  manifest: '/manifest.json',
  icons: {
    apple: '/apple-touch-icon.png',
    icon: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DRAKO',
  },
  openGraph: {
    title: 'DRAKO - Voice Schedule Builder',
    description: 'Build your perfect day with AI voice scheduling',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0A0A0F',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <CopilotKit runtimeUrl="/api/copilotkit" showDevConsole={false}>
          {children}
          <PWAUpdater />
        </CopilotKit>
      </body>
    </html>
  );
}
