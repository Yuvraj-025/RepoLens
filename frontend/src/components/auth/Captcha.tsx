import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CaptchaProps {
  onValidate: (isValid: boolean) => void;
  colorTheme?: 'green' | 'cyan';
}

export default function Captcha({ onValidate, colorTheme = 'green' }: CaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');

  const generateCaptcha = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let text = '';
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(text);
    setUserInput('');
    onValidate(false);

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 200, 60);
        
        // Background noise
        ctx.fillStyle = colorTheme === 'green' ? 'rgba(0, 255, 65, 0.05)' : 'rgba(0, 255, 255, 0.05)';
        ctx.fillRect(0, 0, 200, 60);

        // Draw text
        ctx.font = '36px "VT323", monospace';
        ctx.fillStyle = colorTheme === 'green' ? '#00ff41' : '#00ffff';
        ctx.textBaseline = 'middle';
        
        // Draw characters with slight rotation to prevent easy OCR
        for(let i=0; i<text.length; i++) {
            ctx.save();
            ctx.translate(20 + i * 28, 30);
            const rot = (Math.random() - 0.5) * 0.4;
            ctx.rotate(rot);
            ctx.fillText(text[i], 0, 0);
            ctx.restore();
        }

        // Add some noise lines
        for (let i = 0; i < 8; i++) {
          ctx.strokeStyle = colorTheme === 'green' ? 'rgba(0, 255, 65, 0.4)' : 'rgba(0, 255, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(Math.random() * 200, Math.random() * 60);
          ctx.lineTo(Math.random() * 200, Math.random() * 60);
          ctx.stroke();
        }
      }
    }
  }, [colorTheme, onValidate]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUserInput(val);
    onValidate(val === captchaText);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className={`block text-2xl ${colorTheme === 'cyan' ? 'text-retro-cyan' : ''}`}>&gt; VERIFY_HUMAN:</label>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <canvas 
          ref={canvasRef} 
          width={200} 
          height={60} 
          className={`border-2 ${colorTheme === 'cyan' ? 'border-retro-cyan/50' : 'border-retro-green-dim'} cursor-pointer select-none`}
          onClick={generateCaptcha}
          title="Click to refresh CAPTCHA"
        />
        <button 
          type="button" 
          onClick={generateCaptcha} 
          className={`text-lg ${colorTheme === 'cyan' ? 'text-retro-cyan hover:text-white' : 'text-retro-green hover:text-white'} hover:underline`}
        >
          [REFRESH_CODE]
        </button>
      </div>
      <input
        type="text"
        value={userInput}
        onChange={handleInputChange}
        required
        placeholder="ENTER_CODE"
        className={`w-full bg-transparent border-2 p-4 text-3xl transition-all focus:outline-none ${
          colorTheme === 'cyan' 
            ? 'border-retro-cyan/50 text-retro-cyan focus:border-retro-cyan focus:shadow-[0_0_15px_#00ffff]' 
            : 'border-retro-green-dim text-retro-green focus:border-retro-green focus:shadow-[0_0_15px_#00ff41]'
        }`}
      />
    </div>
  );
}
