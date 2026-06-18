'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, notFound } from 'next/navigation';
import { Terminal, Folder, User, LogOut, Menu, X } from 'lucide-react';
import { copyContent } from '@/lib/content';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = React.useState<boolean | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const c = copyContent.sidebar;

  React.useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsAuthorized(false);
    } else {
      setIsAuthorized(true);
    }
  }, []);

  // Close mobile menu on path changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isAuthorized === false) {
    notFound();
  }

  if (isAuthorized === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-lux-bg">
        <span className="text-lux-gold animate-pulse text-xs tracking-widest uppercase">&gt; {c.confirmSession}</span>
      </div>
    );
  }

  const handleDisconnect = () => {
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex flex-col h-screen w-full bg-lux-bg text-lux-creme overflow-hidden p-0 font-sans relative">
      {/* Sleek, Minimalist Top Navigation */}
      <header className="border-b border-lux-border px-4 md:px-8 py-4 md:py-5 flex items-center justify-between bg-lux-card/30 backdrop-blur-md z-50">
        
        {/* Editorial Brand Header */}
        <div className="flex items-center gap-3">
          <Terminal className="text-lux-gold w-5 h-5" />
          <span className="text-lg md:text-xl font-serif font-light tracking-[0.2em] uppercase text-lux-creme">
            {copyContent.global.brandName}
          </span>
        </div>
        
        {/* Navigation Menu (Desktop) */}
        <div className="hidden md:flex items-center gap-8">
          <nav className="flex items-center gap-8">
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-2.5 text-xs tracking-[0.25em] transition-all duration-300 pb-1.5 pt-0.5 uppercase font-medium border-b ${
                isActive('/dashboard') 
                  ? 'text-lux-gold border-lux-gold' 
                  : 'text-lux-creme-dim border-transparent hover:text-lux-creme hover:border-lux-creme-dim/30'
              }`}
            >
              <Folder className="w-4 h-4 opacity-75" />
              <span>{c.menuRepositories}</span>
            </Link>
            
            <Link 
              href="/profile" 
              className={`flex items-center gap-2.5 text-xs tracking-[0.25em] transition-all duration-300 pb-1.5 pt-0.5 uppercase font-medium border-b ${
                isActive('/profile') 
                  ? 'text-lux-gold border-lux-gold' 
                  : 'text-lux-creme-dim border-transparent hover:text-lux-creme hover:border-lux-creme-dim/30'
              }`}
            >
              <User className="w-4 h-4 opacity-75" />
              <span>{c.menuProfile}</span>
            </Link>
          </nav>

          <div className="h-5 w-[1px] bg-lux-border/40"></div>

          {/* Disconnect Button */}
          <button 
            onClick={handleDisconnect}
            className="flex items-center gap-2.5 text-xs tracking-[0.25em] text-red-400 hover:text-red-300 transition-colors duration-300 py-1 uppercase font-medium"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>{c.menuDisconnect}</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 border border-lux-border text-lux-gold hover:text-lux-creme hover:border-lux-gold transition-colors duration-300 focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Menu Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[61px] bg-lux-bg/95 backdrop-blur-lg z-40 animate-fade-in flex flex-col p-8 space-y-8">
          <nav className="flex flex-col gap-6">
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 text-sm tracking-[0.25em] transition-all duration-300 pb-2.5 uppercase font-medium border-b ${
                isActive('/dashboard') 
                  ? 'text-lux-gold border-lux-gold' 
                  : 'text-lux-creme-dim border-lux-border/30 hover:text-lux-creme'
              }`}
            >
              <Folder className="w-4.5 h-4.5 opacity-75" />
              <span>{c.menuRepositories}</span>
            </Link>
            
            <Link 
              href="/profile" 
              className={`flex items-center gap-3 text-sm tracking-[0.25em] transition-all duration-300 pb-2.5 uppercase font-medium border-b ${
                isActive('/profile') 
                  ? 'text-lux-gold border-lux-gold' 
                  : 'text-lux-creme-dim border-lux-border/30 hover:text-lux-creme'
              }`}
            >
              <User className="w-4.5 h-4.5 opacity-75" />
              <span>{c.menuProfile}</span>
            </Link>
          </nav>

          <div className="border-t border-lux-border pt-8 mt-auto">
            <button 
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-3 text-xs tracking-[0.25em] text-red-400 hover:text-red-300 transition-colors duration-300 py-3 uppercase border border-red-500/20 bg-red-950/10 font-bold"
            >
              <LogOut className="w-4.5 h-4.5 text-red-400" />
              <span>{c.menuDisconnect}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      <main className="flex-1 p-4 md:p-12 overflow-y-auto bg-lux-bg relative">
        {/* Subtle decorative framing */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-lux-border via-lux-border/20 to-transparent"></div>
        {children}
      </main>
    </div>
  );
}

