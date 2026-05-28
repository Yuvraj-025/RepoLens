import React from 'react';
import Link from 'next/link';
import { copyContent } from '@/lib/content';

export default function HomePage() {
  const c = copyContent.landing;
  const g = copyContent.global;

  return (
    <div className="flex flex-col items-center justify-center flex-1 space-y-16 py-12 px-4 md:px-8 max-w-4xl mx-auto w-full animate-reveal-up">
      
      {/* Editorial Header */}
      <header className="w-full border border-lux-border bg-lux-card/25 backdrop-blur-md p-6 md:p-8 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span className="text-3xl md:text-4xl text-lux-creme font-serif tracking-[0.25em] font-light leading-none">{g.brandName}</span>
          <span className="text-[10px] text-lux-gold font-mono tracking-[0.3em] uppercase opacity-85">{g.brandSubtitle}</span>
        </div>
        <nav className="flex items-center gap-4 text-xs font-mono tracking-widest uppercase">
          <Link 
            href="/login" 
            className="border border-lux-border hover:border-lux-gold/40 text-lux-creme-dim hover:text-lux-creme px-5 py-2 transition-all duration-300"
          >
            {c.navLogin}
          </Link>
          <Link 
            href="/signup" 
            className="border border-lux-gold/30 bg-lux-card hover:bg-lux-gold hover:text-lux-bg px-5 py-2 font-bold text-lux-gold transition-all duration-300"
          >
            {c.navSignup}
          </Link>
        </nav>
      </header>

      {/* Main Editorial Block */}
      <main className="w-full border border-lux-border bg-lux-card/45 backdrop-blur-lg p-10 md:p-20 relative overflow-hidden group">
        {/* Subtle decorative gold line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-lux-gold/30 to-transparent"></div>
        
        <div className="space-y-12">
          <div className="space-y-4">
            <h2 className="text-xs font-mono text-lux-gold uppercase tracking-[0.3em]">{c.categoryLabel}</h2>
            <h1 className="text-4xl md:text-6xl text-lux-creme font-serif font-light leading-tight">
              {c.mainHeadingPrefix}<span className="italic font-normal text-lux-gold">{c.mainHeadingHighlight}</span>{c.mainHeadingSuffix}
            </h1>
          </div>

          <div className="border-l border-lux-copper/40 pl-6 py-1 space-y-3">
            <p className="text-sm font-mono text-lux-creme-dim leading-relaxed">
              {c.logLines.map((line, idx) => (
                <React.Fragment key={idx}>
                  &gt; {line}<br />
                </React.Fragment>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <Link 
              href="/login" 
              className="block text-center border border-lux-border bg-lux-bg/60 p-5 text-sm font-mono uppercase tracking-widest text-lux-creme hover:border-lux-gold hover:text-lux-gold transition-all duration-500 shadow-lux hover:shadow-lux-hover"
            >
              {c.actionLogin}
            </Link>
            <Link 
              href="/signup" 
              className="block text-center border border-lux-gold/25 bg-lux-card/50 p-5 text-sm font-mono uppercase tracking-widest text-lux-gold hover:border-lux-gold hover:bg-lux-gold hover:text-lux-bg transition-all duration-500 shadow-lux"
            >
              {c.actionSignup}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-lux-creme-dim font-mono text-[10px] tracking-widest uppercase mt-auto opacity-60">
        {g.copyright}
      </footer>
    </div>
  );
}
