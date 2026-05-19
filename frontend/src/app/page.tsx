import React from 'react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 space-y-12">
      <header className="w-full max-w-4xl border-2 border-retro-green p-6 shadow-retro shadow-retro-green bg-retro-bg/90 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-4xl text-retro-cyan font-bold tracking-widest">REPOLENS_</span>
            <span className="w-4 h-8 bg-retro-green animate-blink block"></span>
          </div>
          <div className="flex space-x-6 text-2xl">
            <Link href="/login" className="hover:text-retro-cyan transition-colors">[ LOGIN ]</Link>
            <Link href="/signup" className="hover:text-retro-cyan transition-colors">[ INIT_USER ]</Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl border-2 border-retro-green p-8 md:p-16 shadow-retro shadow-retro-green bg-retro-bg/90 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-retro-green/50 opacity-0 group-hover:opacity-100 group-hover:animate-[scan_2s_linear_infinite]"></div>
        <h2 className="text-5xl md:text-6xl text-retro-cyan mb-8 uppercase tracking-wider">SYSTEM.CONNECT()</h2>
        <p className="text-3xl leading-relaxed mb-12 max-w-2xl border-l-4 border-retro-green-dim pl-6 py-2">
          &gt; ESTABLISHING SECURE LINK...<br />
          &gt; UPLOAD REPOSITORY ZIP...<br />
          &gt; PARSING AST AND EMBEDDINGS...<br />
          &gt; READY FOR QUERY.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/login" className="block text-center border-2 border-retro-green p-6 text-3xl hover:bg-retro-green hover:text-retro-bg shadow-retro shadow-retro-green hover:shadow-retro-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase font-bold">
            Execute Login Sequence
          </Link>
          <Link href="/signup" className="block text-center border-2 border-retro-cyan text-retro-cyan p-6 text-3xl hover:bg-retro-cyan hover:text-retro-bg shadow-retro shadow-retro-cyan hover:shadow-retro-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all uppercase font-bold">
            Initialize New Entity
          </Link>
        </div>
      </main>

      <footer className="text-retro-green-dim text-xl mt-auto pt-8">
        (C) 1989-2026 REPOLENS CORP. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
}
