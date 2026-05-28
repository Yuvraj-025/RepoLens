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
        // Luxury Old-School Minimalist Palette
        'lux-bg': '#0e0d0c',
        'lux-card': '#151311',
        'lux-creme': '#f5f0e1',
        'lux-creme-dim': '#9c907e',
        'lux-gold': '#d1b894',
        'lux-copper': '#b87b5c',
        'lux-border': '#27221e',
        'lux-border-bright': '#4a4038',

        // Fallback overrides to keep existing styles working during migration
        'retro-bg': '#0e0d0c',
        'retro-green': '#f5f0e1',
        'retro-green-dim': '#9c907e',
        'retro-cyan': '#d1b894',
      },
      fontFamily: {
        sans: ['var(--font-marcellus)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-cormorant)', 'serif'],
        mono: ['var(--font-courier)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'lux': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'lux-hover': '0 8px 30px rgba(0, 0, 0, 0.7)',
        'retro': 'none', // Remove chunky retro shadows
        'retro-hover': 'none',
      },
    },
  },
  plugins: [],
};
export default config;
