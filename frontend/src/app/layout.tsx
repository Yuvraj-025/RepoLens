import './globals.css';
import type { Metadata } from 'next';
import { VT323 } from 'next/font/google';

const vt323 = VT323({ weight: '400', subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'REPOLENS OS',
  description: 'AI Codebase Chat Platform - System Access',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={vt323.className}>
      <body className="relative min-h-screen bg-retro-bg text-retro-green">
        <div className="relative z-10 w-full min-h-screen p-4 md:p-8 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
