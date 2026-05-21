'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import { Terminal, Folder, User, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsAuthorized(false);
    } else {
      setIsAuthorized(true);
    }
  }, []);

  if (isAuthorized === false) {
    notFound();
  }

  if (isAuthorized === null) {
    return null; // or a loading spinner
  }

  const handleDisconnect = () => {
    localStorage.removeItem('accessToken');
    router.push('/login');
  };
  return (
    <div className="flex h-screen w-full bg-retro-bg text-retro-cyan overflow-hidden p-4">
      {/* Sidebar */}
      <aside className="w-64 border-2 border-retro-green p-4 flex flex-col shadow-retro shadow-retro-green bg-retro-bg/90 mr-4">
        <div className="flex items-center gap-2 mb-8">
          <Terminal className="text-retro-green w-8 h-8" />
          <span className="text-2xl font-bold tracking-widest uppercase">RepoLens_</span>
        </div>
        
        <nav className="flex-1 space-y-4">
          <Link href="/dashboard" className="flex items-center gap-3 text-xl hover:text-retro-green hover:translate-x-2 transition-all p-2 uppercase">
            <Folder className="w-6 h-6" />
            <span>Repositories</span>
          </Link>
          <Link href="/profile" className="flex items-center gap-3 text-xl hover:text-retro-green hover:translate-x-2 transition-all p-2 uppercase">
            <User className="w-6 h-6" />
            <span>Profile</span>
          </Link>
        </nav>

        <div className="mt-auto pt-4 border-t-2 border-retro-green-dim">
          <button 
            onClick={handleDisconnect}
            className="flex items-center gap-3 text-xl hover:text-red-500 hover:translate-x-2 transition-all p-2 uppercase w-full text-left"
          >
            <LogOut className="w-6 h-6" />
            <span>Disconnect()</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 border-2 border-retro-green p-6 overflow-y-auto shadow-retro shadow-retro-green bg-retro-bg/90 relative group">
        <div className="absolute top-0 left-0 w-full h-1 bg-retro-green/50 opacity-0 group-hover:opacity-100 group-hover:animate-[scan_2s_linear_infinite]"></div>
        {children}
      </main>
    </div>
  );
}
