import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'retro-bg': '#050505',
        'retro-green': '#00ff41',
        'retro-green-dim': '#008f11',
        'retro-cyan': '#00ffff',
      },
      fontFamily: {
        mono: ['"VT323"', '"Courier New"', 'monospace'],
      },
      boxShadow: {
        'retro': '4px 4px 0 0 var(--tw-shadow-color)',
        'retro-hover': '2px 2px 0 0 var(--tw-shadow-color)',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'scan': 'scan 2s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
