'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signup } from '@/lib/api/auth';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const data = await signup({ name, email, password });
      localStorage.setItem('accessToken', data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Initialization Failed');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="w-full max-w-2xl border-2 border-retro-cyan p-10 shadow-retro shadow-retro-cyan bg-retro-bg relative">
        <div className="absolute top-0 right-0 p-3 text-2xl text-retro-cyan opacity-50">SYS_INIT_NODE</div>
        <h2 className="text-5xl text-retro-cyan mb-4 uppercase tracking-wider">&gt; REGISTER</h2>
        <p className="text-2xl text-retro-green-dim mb-10">
          INITIALIZE NEW INSTANCE... OR <Link href="/login" className="text-retro-green hover:underline hover:text-white">RETURN_TO_LOGIN</Link>
        </p>

        {error && (
          <div className="bg-red-500/20 border-2 border-red-500 text-red-500 p-4 mb-6">
            &gt; ERROR: {error}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-8">
            <div>
              <label htmlFor="name" className="block text-2xl text-retro-cyan mb-3">&gt; DEFINE_ALIAS:</label>
              <input 
                id="name" name="name" type="text" required 
                value={name} onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-2 border-retro-cyan/50 p-4 text-3xl text-retro-cyan focus:border-retro-cyan focus:outline-none focus:shadow-[0_0_15px_#00ffff] transition-all" 
                placeholder="NEO" 
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-2xl text-retro-cyan mb-3">&gt; ASSIGN_COMMS_LINK:</label>
              <input 
                id="email" name="email" type="email" required 
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-2 border-retro-cyan/50 p-4 text-3xl text-retro-cyan focus:border-retro-cyan focus:outline-none focus:shadow-[0_0_15px_#00ffff] transition-all" 
                placeholder="user@matrix.net" 
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-2xl text-retro-cyan mb-3">&gt; GENERATE_KEY:</label>
              <input 
                id="password" name="password" type="password" required 
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-2 border-retro-cyan/50 p-4 text-3xl text-retro-cyan focus:border-retro-cyan focus:outline-none focus:shadow-[0_0_15px_#00ffff] transition-all" 
                placeholder="********" 
              />
            </div>
          </div>
          
          <div className="pt-8">
            <button type="submit" disabled={isLoading} className="w-full border-2 border-retro-cyan text-retro-cyan p-6 text-4xl font-bold uppercase hover:bg-retro-cyan hover:text-retro-bg shadow-retro shadow-retro-cyan hover:shadow-retro-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3 group disabled:opacity-50">
              <span>{isLoading ? 'INITIALIZING...' : 'CREATE_ENTITY'}</span>
              <span className="group-hover:animate-blink">_</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
