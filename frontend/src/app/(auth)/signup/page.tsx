import React from 'react';
import Link from 'next/link';

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="w-full max-w-2xl border-2 border-retro-cyan p-10 shadow-retro shadow-retro-cyan bg-retro-bg relative">
        <div className="absolute top-0 right-0 p-3 text-2xl text-retro-cyan opacity-50">SYS_INIT_NODE</div>
        <h2 className="text-5xl text-retro-cyan mb-4 uppercase tracking-wider">&gt; REGISTER</h2>
        <p className="text-2xl text-retro-green-dim mb-10">
          INITIALIZE NEW INSTANCE... OR <Link href="/login" className="text-retro-green hover:underline hover:text-white">RETURN_TO_LOGIN</Link>
        </p>

        <form className="space-y-8" action="#">
          <div className="space-y-8">
            <div>
              <label htmlFor="name" className="block text-2xl text-retro-cyan mb-3">&gt; DEFINE_ALIAS:</label>
              <input 
                id="name" name="name" type="text" required 
                className="w-full bg-transparent border-2 border-retro-cyan/50 p-4 text-3xl text-retro-cyan focus:border-retro-cyan focus:outline-none focus:shadow-[0_0_15px_#00ffff] transition-all" 
                placeholder="NEO" 
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-2xl text-retro-cyan mb-3">&gt; ASSIGN_COMMS_LINK:</label>
              <input 
                id="email" name="email" type="email" required 
                className="w-full bg-transparent border-2 border-retro-cyan/50 p-4 text-3xl text-retro-cyan focus:border-retro-cyan focus:outline-none focus:shadow-[0_0_15px_#00ffff] transition-all" 
                placeholder="user@matrix.net" 
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-2xl text-retro-cyan mb-3">&gt; GENERATE_KEY:</label>
              <input 
                id="password" name="password" type="password" required 
                className="w-full bg-transparent border-2 border-retro-cyan/50 p-4 text-3xl text-retro-cyan focus:border-retro-cyan focus:outline-none focus:shadow-[0_0_15px_#00ffff] transition-all" 
                placeholder="********" 
              />
            </div>
          </div>
          
          <div className="pt-8">
            <button type="submit" className="w-full border-2 border-retro-cyan text-retro-cyan p-6 text-4xl font-bold uppercase hover:bg-retro-cyan hover:text-retro-bg shadow-retro shadow-retro-cyan hover:shadow-retro-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3 group">
              <span>CREATE_ENTITY</span>
              <span className="group-hover:animate-blink">_</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
