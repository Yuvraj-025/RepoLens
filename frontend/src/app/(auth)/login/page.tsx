import React from 'react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="w-full max-w-2xl border-2 border-retro-green p-10 shadow-retro shadow-retro-green bg-retro-bg relative">
        <div className="absolute top-0 right-0 p-3 text-2xl text-retro-green-dim">SYS_AUTH_NODE</div>
        <h2 className="text-5xl text-retro-cyan mb-4 uppercase tracking-wider">&gt; IDENTIFY</h2>
        <p className="text-2xl text-retro-green-dim mb-10">
          AWAITING CREDENTIALS... OR <Link href="/signup" className="text-retro-cyan hover:underline hover:text-white">CREATE_NEW</Link>
        </p>

        <form className="space-y-8" action="#">
          <div className="space-y-8">
            <div>
              <label htmlFor="email" className="block text-2xl mb-3">&gt; INPUT_EMAIL:</label>
              <input 
                id="email" name="email" type="email" required 
                className="w-full bg-transparent border-2 border-retro-green-dim p-4 text-3xl text-retro-green focus:border-retro-green focus:outline-none focus:shadow-[0_0_15px_#00ff41] transition-all" 
                placeholder="user@domain.com" 
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-2xl mb-3">&gt; INPUT_SECRET:</label>
              <input 
                id="password" name="password" type="password" required 
                className="w-full bg-transparent border-2 border-retro-green-dim p-4 text-3xl text-retro-green focus:border-retro-green focus:outline-none focus:shadow-[0_0_15px_#00ff41] transition-all" 
                placeholder="********" 
              />
            </div>
          </div>
          
          <div className="pt-8">
            <button type="submit" className="w-full border-2 border-retro-green p-6 text-4xl font-bold uppercase hover:bg-retro-green hover:text-retro-bg shadow-retro shadow-retro-green hover:shadow-retro-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3 group">
              <span>GRANT_ACCESS</span>
              <span className="group-hover:animate-blink">_</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
