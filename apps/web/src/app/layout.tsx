import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import { ToastProvider } from '@/components/ui/toast';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-mono-face',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Deract: your group chat, on your game clock',
    template: '%s · Deract',
  },
  description:
    'Watch the match late and still watch it with your friends. Every reaction lands at the moment it happened in the game, never before.',
  applicationName: 'Deract',
};

export const viewport: Viewport = {
  themeColor: '#0a0c0b',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
