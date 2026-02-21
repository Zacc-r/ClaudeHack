import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Geist_Mono } from 'next/font/google';
import { CopilotKit } from '@copilotkit/react-core';
import '@copilotkit/react-ui/styles.css';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <CopilotKit runtimeUrl="/api/copilotkit">
          {children}
        </CopilotKit>
      </body>
    </html>
  );
}
