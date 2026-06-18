'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api/auth';
import { copyContent } from '@/lib/content';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const c = copyContent.login;



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError('');
    setIsLoading(true);
    
    try {
      const data = await login({ email, password });
      localStorage.setItem('accessToken', data.accessToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication Failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 py-12 px-4 md:px-8 animate-reveal-up">
      <div className="w-full max-w-xl border border-lux-border p-5 sm:p-8 md:p-12 bg-lux-card/50 backdrop-blur-lg shadow-lux relative">
        <div className="absolute top-0 right-0 p-4 text-[9px] tracking-widest text-lux-gold/60 uppercase">
          {c.nodeLabel}
        </div>
        
        <header className="mb-10 space-y-3">
          <h2 className="text-3xl font-serif font-light tracking-widest text-lux-creme uppercase">
            {c.title}
          </h2>
          <div className="h-[1px] w-12 bg-lux-gold/40"></div>
          <p className="text-xs text-lux-creme-dim flex flex-wrap gap-x-3 items-center">
            <span>{c.caption}</span>
            <span className="opacity-30">/</span>
            <Link href="/signup" className="text-lux-gold hover:text-lux-creme transition-colors duration-300">
              {c.signupLink}
            </Link>
            <span className="opacity-30">/</span>
            <Link href="/" className="text-lux-creme-dim hover:text-lux-creme transition-colors duration-300">
              {c.exitLink}
            </Link>
          </p>
        </header>

        {error && (
          <div className="bg-lux-copper/10 border border-lux-copper/45 text-lux-copper p-4 text-xs mb-8">
            &gt; ERROR: {error}
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-6">
            
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[10px] tracking-widest text-lux-creme-dim uppercase">
                {c.labelEmail}
              </label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-lux-bg/40 border border-lux-border p-3.5 text-sm text-lux-creme focus:border-lux-gold/50 focus:outline-none transition-all duration-300" 
                placeholder={c.placeholderEmail} 
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="block text-[10px] tracking-widest text-lux-creme-dim uppercase">
                {c.labelPassword}
              </label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-lux-bg/40 border border-lux-border p-3.5 text-sm text-lux-creme focus:border-lux-gold/50 focus:outline-none transition-all duration-300" 
                placeholder="••••••••" 
              />
            </div>



          </div>
          
          <div className="pt-6">
            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full border border-lux-gold/30 bg-lux-card hover:bg-lux-gold hover:text-lux-bg p-4 text-xs tracking-[0.2em] font-bold uppercase transition-all duration-500 disabled:opacity-50"
            >
              {isLoading ? c.buttonLoading : c.buttonAuthenticate}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
