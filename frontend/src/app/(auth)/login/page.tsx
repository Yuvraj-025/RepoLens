'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api/auth';
import Captcha from '@/components/auth/Captcha';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCaptchaValid, setIsCaptchaValid] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCaptchaValid) {
      setError('CAPTCHA validation failed. Please try again.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const data = await login({ email, password });
      // Store token securely (e.g. in localStorage for this basic setup)
      localStorage.setItem('accessToken', data.accessToken);
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="w-full max-w-2xl border-2 border-retro-green p-10 shadow-retro shadow-retro-green bg-retro-bg relative">
        <div className="absolute top-0 right-0 p-3 text-2xl text-retro-green-dim">SYS_AUTH_NODE</div>
        <h2 className="text-5xl text-retro-cyan mb-4 uppercase tracking-wider">&gt; IDENTIFY</h2>
        <p className="text-2xl text-retro-green-dim mb-10 flex flex-wrap gap-x-4">
          <span>AWAITING CREDENTIALS...</span>
          <span className="text-retro-green/30">|</span>
          <Link href="/signup" className="text-retro-cyan hover:underline hover:text-white">CREATE_NEW</Link>
          <span className="text-retro-green/30">|</span>
          <Link href="/" className="text-retro-green hover:underline hover:text-white">EXIT_TO_LANDING</Link>
        </p>

        {error && (
          <div className="bg-red-500/20 border-2 border-red-500 text-red-500 p-4 mb-6">
            &gt; ERROR: {error}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-8">
            <div>
              <label htmlFor="email" className="block text-2xl mb-3">&gt; INPUT_EMAIL:</label>
              <input 
                id="email" name="email" type="email" required 
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-2 border-retro-green-dim p-4 text-3xl text-retro-green focus:border-retro-green focus:outline-none focus:shadow-[0_0_15px_#00ff41] transition-all" 
                placeholder="user@domain.com" 
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-2xl mb-3">&gt; INPUT_SECRET:</label>
              <input 
                id="password" name="password" type="password" required 
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-2 border-retro-green-dim p-4 text-3xl text-retro-green focus:border-retro-green focus:outline-none focus:shadow-[0_0_15px_#00ff41] transition-all" 
                placeholder="********" 
              />
            </div>

            <Captcha onValidate={setIsCaptchaValid} colorTheme="green" />
          </div>
          
          <div className="pt-8">
            <button type="submit" disabled={isLoading} className="w-full border-2 border-retro-green p-6 text-4xl font-bold uppercase hover:bg-retro-green hover:text-retro-bg shadow-retro shadow-retro-green hover:shadow-retro-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-3 group disabled:opacity-50">
              <span>{isLoading ? 'AUTHENTICATING...' : 'GRANT_ACCESS'}</span>
              <span className="group-hover:animate-blink">_</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
