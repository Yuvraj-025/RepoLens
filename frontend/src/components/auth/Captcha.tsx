import React, { useEffect, useState, useCallback } from 'react';
import { getCaptcha } from '@/lib/api/auth';
import { copyContent } from '@/lib/content';

interface CaptchaProps {
  onCaptchaChange: (token: string, code: string) => void;
  colorTheme?: 'green' | 'cyan';
}

export default function Captcha({ onCaptchaChange, colorTheme = 'green' }: CaptchaProps) {
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const c = copyContent.login; // Uses auth-shared copy variables

  const fetchNewCaptcha = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCaptcha(colorTheme);
      setCaptchaToken(data.token);
      setCaptchaSvg(data.svg);
      setUserInput('');
      onCaptchaChange(data.token, '');
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
    } finally {
      setIsLoading(false);
    }
  }, [colorTheme, onCaptchaChange]);

  useEffect(() => {
    fetchNewCaptcha();
  }, [fetchNewCaptcha]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserInput(val);
    onCaptchaChange(captchaToken, val);
  };

  return (
    <div className="flex flex-col gap-4 font-mono text-xs">
      <label className="block text-[10px] tracking-widest text-lux-creme-dim uppercase">
        {c.labelCaptcha}
      </label>
      
      <div className="flex flex-row items-center gap-4">
        {isLoading ? (
          <div className="w-[200px] h-[60px] border border-lux-border flex items-center justify-center text-lux-creme-dim bg-lux-bg/40 animate-pulse text-[10px] uppercase tracking-wider">
            Loading...
          </div>
        ) : (
          <div 
            onClick={fetchNewCaptcha}
            title="Click to refresh CAPTCHA"
            className="cursor-pointer select-none captcha-svg-container transition-opacity duration-300 hover:opacity-85"
            dangerouslySetInnerHTML={{ __html: captchaSvg }}
          />
        )}
        <button 
          type="button" 
          onClick={fetchNewCaptcha} 
          className="text-[10px] text-lux-gold hover:text-lux-creme uppercase tracking-wider transition-colors duration-300 font-bold"
        >
          [ Refresh ]
        </button>
      </div>

      <input
        type="text"
        value={userInput}
        onChange={handleInputChange}
        required
        placeholder="Enter verification code"
        className="w-full bg-lux-bg/40 border border-lux-border p-3.5 font-mono text-sm text-lux-creme focus:border-lux-gold/50 focus:outline-none transition-all duration-300"
      />
    </div>
  );
}
