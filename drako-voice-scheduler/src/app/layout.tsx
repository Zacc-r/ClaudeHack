import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
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
  description: 'Voice-powered AI schedule builder',
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
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
