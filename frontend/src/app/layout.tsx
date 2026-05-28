import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RepoLens // Codebase Intelligence',
  description: 'AI Codebase Chat Platform - Luxury Minimalism',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-lux-bg text-lux-creme antialiased selection:bg-lux-gold selection:text-lux-bg">
        {/* Soft elegant ambient background overlay */}
        <div className="fixed inset-0 pointer-events-none bg-vignette z-0" />
        <div className="fixed inset-0 pointer-events-none bg-grain z-0" />
        
        <div className="relative z-10 w-full min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
